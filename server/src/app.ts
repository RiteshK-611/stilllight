import { createHash, timingSafeEqual } from 'node:crypto';
import express, { type ErrorRequestHandler, type Request } from 'express';
import sharp from 'sharp';
import { isLookId } from '../../src/domain/looks.ts';
import type { GenerationJob, GenerationResult } from '../../src/domain/api.ts';
import type { Config } from './config.ts';
import { HttpError } from './errors.ts';
import { MAX_IMAGE_BYTES, normalizeImage } from './image.ts';
import { createProvider, type ImageProvider } from './provider.ts';
import { Store, type JobRow } from './store.ts';

interface Result { buffer: Buffer; expiresAt: number; width: number; height: number }

export function createApp(config: Config, provider: ImageProvider = createProvider(config)) {
  const app = express();
  const store = new Store(config.databasePath, config.mode);
  const results = new Map<string, Result>();
  const controllers = new Map<string, AbortController>();
  const rate = new Map<string, { count: number; until: number }>();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    const origin = req.get('origin');
    if (origin && !config.allowedOrigins.includes(origin)) return next(new HttpError(403, 'This browser origin is not allowed.', 'ORIGIN_DENIED'));
    if (origin) res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    res.set({ 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' });
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  function limit(req: Request, namespace: string, maximum: number, windowMs: number) {
    const now = Date.now();
    if (rate.size > 1000) for (const [key, row] of rate) if (row.until < now) rate.delete(key);
    if (rate.size > 5000) throw new HttpError(503, 'The studio is busy. Try again shortly.');
    const key = `${namespace}:${req.ip}`;
    let entry = rate.get(key);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + windowMs }; rate.set(key, entry); }
    entry.count += 1;
    if (entry.count > maximum) throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', 'RATE_LIMIT');
  }

  app.use((req, _res, next) => { try { limit(req, 'all', 240, 60_000); next(); } catch (error) { next(error); } });
  app.use(express.json({ limit: '9mb', strict: true }));

  function account(req: Request): string {
    const auth = req.get('authorization') ?? '';
    if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(auth)) throw new HttpError(401, 'Connect your beta session in Settings.', 'UNAUTHORIZED');
    return store.authenticate(auth.slice(7));
  }

  function serialize(job: JobRow): GenerationJob {
    return { id: job.id, lookId: job.look_id, status: job.status, mode: job.mode, createdAt: job.created_at, error: job.error, wallet: store.wallet(job.account_id) };
  }

  app.get('/api/health', (_req, res) => {
    res.json({ name: 'Stilllight', mode: config.mode, requiresInvite: config.mode === 'gemini', purchasesEnabled: false, maxInputBytes: MAX_IMAGE_BYTES });
  });

  app.post('/api/session', (req, res) => {
    limit(req, 'session', config.mode === 'demo' ? 60 : 10, 3_600_000);
    if (config.mode === 'gemini') {
      const actual = createHash('sha256').update(typeof req.body?.inviteCode === 'string' ? req.body.inviteCode : '').digest();
      const expected = createHash('sha256').update(config.inviteCode).digest();
      if (!timingSafeEqual(actual, expected)) throw new HttpError(403, 'Enter the pilot invite code supplied by the developer.', 'INVITE_REQUIRED');
    }
    res.status(201).json(store.createSession(config.initialCredits, config.sessionDays));
  });

  app.get('/api/wallet', (req, res) => res.json(store.wallet(account(req))));
  app.post('/api/wallet/demo-refill', (req, res) => res.json(store.refill(account(req))));

  app.post('/api/generations', async (req, res) => {
    const accountId = account(req);
    limit(req, 'generate', 20, 60_000);
    const key = req.get('idempotency-key') ?? '';
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new HttpError(400, 'A valid request ID is required.', 'INVALID_REQUEST');
    if (!isLookId(req.body?.lookId)) throw new HttpError(400, 'Choose one of the three available looks.', 'INVALID_LOOK');
    if (req.body?.consent !== true) throw new HttpError(400, 'Confirm you have permission to edit and process this photo.', 'CONSENT_REQUIRED');
    if (typeof req.body?.image !== 'string') throw new HttpError(400, 'Choose a photo first.', 'INVALID_IMAGE');
    const fingerprint = createHash('sha256').update(req.body.image).update(req.body.lookId).digest('hex');
    const previous = store.findByKey(accountId, key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new HttpError(409, 'This request ID was already used for another photo.', 'REQUEST_MISMATCH');
      res.json(serialize(previous)); return;
    }
    if (controllers.size >= 3) throw new HttpError(503, 'The studio is at capacity. Try again in a moment.', 'STUDIO_BUSY');
    const input = await normalizeImage(req.body.image);
    // Recheck after image decoding: another identical request may have arrived while awaiting Sharp.
    const concurrent = store.findByKey(accountId, key);
    if (concurrent) {
      if (concurrent.fingerprint !== fingerprint) throw new HttpError(409, 'This request ID was already used for another photo.', 'REQUEST_MISMATCH');
      res.json(serialize(concurrent)); return;
    }
    if (controllers.size >= 3) throw new HttpError(503, 'The studio is at capacity. Try again in a moment.', 'STUDIO_BUSY');
    const job = store.reserve(accountId, key, fingerprint, req.body.lookId, config.dailyLimit);
    const controller = new AbortController();
    controllers.set(job.id, controller);
    res.status(202).json(serialize(job));

    // Input and generated photos remain in RAM, never in SQLite or logs.
    void (async () => {
      const timeout = setTimeout(() => controller.abort(new Error('Generation timed out')), 125_000);
      try {
        const output = await provider(input, job.look_id, controller.signal);
        controller.signal.throwIfAborted();
        const metadata = await sharp(output, { limitInputPixels: 24_000_000 }).metadata();
        if (!metadata.width || !metadata.height) throw new Error('Empty generated image');
        if (store.succeed(job.id)) results.set(job.id, { buffer: output, expiresAt: Date.now() + config.resultTtlMs, width: metadata.width, height: metadata.height });
      } catch (error) {
        const message = error instanceof HttpError ? error.message : controller.signal.aborted
          ? 'The edit was interrupted. Your credit has been returned.'
          : 'We could not finish this edit. Please try again. Your credit has been returned.';
        store.refund(job.id, 'failed', message);
      } finally { clearTimeout(timeout); controllers.delete(job.id); }
    })();
  });

  app.get('/api/generations/:id', (req, res) => res.json(serialize(store.ownedJob(account(req), req.params.id))));

  app.post('/api/requests/:key/cancel', (req, res) => {
    const accountId = account(req);
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(req.params.key)) throw new HttpError(400, 'Invalid request ID.');
    const job = store.cancelRequest(accountId, req.params.key);
    if (job?.status === 'cancelled') controllers.get(job.id)?.abort();
    res.json({ job: job ? serialize(job) : null, wallet: store.wallet(accountId) });
  });

  app.get('/api/generations/:id/result', (req, res) => {
    const job = store.ownedJob(account(req), req.params.id);
    const result = results.get(job.id);
    if (job.status !== 'succeeded' || !result || result.expiresAt < Date.now()) {
      if (job.status === 'succeeded') store.refund(job.id, 'expired', 'Your undelivered preview expired. Your credit has been returned.');
      results.delete(job.id);
      throw new HttpError(410, 'This temporary preview has expired. Photos already saved to your collection are still available. Undelivered previews return their credit.', 'RESULT_EXPIRED');
    }
    store.delivered(job.id);
    const body: GenerationResult = { base64: result.buffer.toString('base64'), mimeType: 'image/jpeg', width: result.width, height: result.height, mode: config.mode };
    res.json(body);
  });

  app.delete('/api/generations/:id', (req, res) => {
    const job = store.ownedJob(account(req), req.params.id);
    const cancelled = store.refund(job.id, 'cancelled', 'You cancelled this edit. Your credit has been returned.');
    if (cancelled) controllers.get(job.id)?.abort();
    res.json(serialize(store.ownedJob(job.account_id, job.id)));
  });

  app.delete('/api/session', (req, res) => {
    const accountId = account(req);
    for (const [id, controller] of controllers) {
      try { store.ownedJob(accountId, id); controller.abort(); } catch { /* Another account owns this job. */ }
    }
    for (const id of results.keys()) {
      try { store.ownedJob(accountId, id); results.delete(id); } catch { /* Another account owns this result. */ }
    }
    // A worker may still be unwinding. Its conditional SQL updates will no-op after deletion.
    store.removeAccount(accountId);
    res.sendStatus(204);
  });

  app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found.', 'NOT_FOUND')));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    let status = 500; let code = 'SERVER_ERROR'; let message = 'Something went wrong. Please try again.';
    if (error instanceof HttpError) { status = error.status; code = error.code; message = error.message; }
    else if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') { status = 413; code = 'IMAGE_TOO_LARGE'; message = 'Choose a smaller photo.'; }
    else if (error instanceof SyntaxError) { status = 400; code = 'INVALID_JSON'; message = 'The request could not be read.'; }
    if (status === 429) res.set('Retry-After', '60');
    // Deliberately do not log request bodies, photos, invite codes, tokens, or provider errors.
    res.status(status).json({ error: message, code });
  };
  app.use(errorHandler);

  const cleaner = setInterval(() => {
    for (const [id, result] of results) if (result.expiresAt < Date.now()) {
      store.refund(id, 'expired', 'Your undelivered preview expired. Your credit has been returned.');
      results.delete(id);
    }
    for (const [key, value] of rate) if (value.until < Date.now()) rate.delete(key);
  }, 30_000);
  cleaner.unref();

  return { app, store, close: async () => {
    clearInterval(cleaner);
    for (const controller of controllers.values()) controller.abort();
    // Let pending workers release their credit holds before closing SQLite.
    while (controllers.size) await new Promise((resolve) => setTimeout(resolve, 10));
    results.clear(); store.close();
  } };
}

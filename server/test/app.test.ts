import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { renderDemo } from '../src/image.ts';
import type { ImageProvider } from '../src/provider.ts';
import { Store } from '../src/store.ts';

let server: Server; let base: string; let instance: ReturnType<typeof createApp>; let image: string;
let providerCalls = 0; let failNext = false; let blocked: (() => void) | null = null;
const provider: ImageProvider = async (input, lookId, signal) => {
  providerCalls++;
  if (blocked) {
    await new Promise<void>((resolve, reject) => {
      blocked = resolve;
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    });
  }
  if (failNext) { failNext = false; throw new Error('Secret provider detail that must not leak'); }
  signal.throwIfAborted();
  return renderDemo(input, lookId);
};

before(async () => {
  image = (await sharp({ create: { width: 80, height: 100, channels: 3, background: '#C4A17D' } }).jpeg().toBuffer()).toString('base64');
  instance = createApp({ ...loadConfig({ AI_MODE: 'demo' }), databasePath: ':memory:', dailyLimit: 1000 }, provider);
  server = instance.app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address(); assert(address && typeof address === 'object');
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => { server.close(); await instance.close(); });

async function request(path: string, token?: string, options: RequestInit = {}) {
  return fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
}
async function session() {
  const response = await request('/api/session', undefined, { method: 'POST', body: '{}' });
  assert.equal(response.status, 201); return (await response.json()).token as string;
}
async function generate(token: string, key = randomUUID(), overrides: Record<string, unknown> = {}) {
  return request('/api/generations', token, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ image, lookId: 'golden-hour', consent: true, ...overrides }) });
}
async function terminal(token: string, id: string) {
  for (let i = 0; i < 100; i++) {
    const response = await request(`/api/generations/${id}`, token); const job = await response.json();
    if (job.status !== 'processing') return job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Job did not reach a terminal state');
}

test('defaults to demo even with an API key and refuses incomplete live config', () => {
  assert.equal(loadConfig({ GEMINI_API_KEY: 'not-a-real-key' }).mode, 'demo');
  assert.throws(() => loadConfig({ AI_MODE: 'gemini', GEMINI_API_KEY: 'key' }), /PILOT_INVITE_CODE/);
});

test('health is explicit about demo and disabled purchases; unauthenticated jobs are rejected', async () => {
  const health = await (await request('/api/health')).json();
  assert.equal(health.mode, 'demo'); assert.equal(health.purchasesEnabled, false);
  assert.equal((await request('/api/generations/missing')).status, 401);
});

test('valid edit transforms actual pixels, consumes one credit and can be retrieved', async () => {
  const token = await session();
  const response = await generate(token); assert.equal(response.status, 202);
  const created = await response.json(); const job = await terminal(token, created.id);
  assert.equal(job.status, 'succeeded'); assert.equal(job.wallet.available, 11); assert.equal(job.wallet.reserved, 0);
  const resultResponse = await request(`/api/generations/${job.id}/result`, token);
  assert.equal(resultResponse.headers.get('cache-control'), 'no-store');
  const result = await resultResponse.json();
  assert.equal(result.mode, 'demo'); assert.equal(result.mimeType, 'image/jpeg');
  assert.notEqual(result.base64, image); assert.equal((await sharp(Buffer.from(result.base64, 'base64')).metadata()).width, 80);
});

test('idempotent replay never invokes the provider twice or spends twice', async () => {
  const token = await session(); const key = randomUUID(); const before = providerCalls;
  const first = await (await generate(token, key)).json();
  await terminal(token, first.id);
  const second = await (await generate(token, key)).json();
  assert.equal(first.id, second.id); assert.equal(providerCalls - before, 1);
  assert.equal(second.wallet.available, 11);
  assert.equal((await generate(token, key, { lookId: 'direct-flash' })).status, 409);
});

test('concurrent duplicate submissions share one job', async () => {
  const token = await session(); const key = randomUUID(); const before = providerCalls;
  const responses = await Promise.all([generate(token, key), generate(token, key)]);
  const [a, b] = await Promise.all(responses.map((response) => response.json()));
  assert.equal(a.id, b.id); await terminal(token, a.id); assert.equal(providerCalls - before, 1);
});

test('invalid consent, look, and image do not consume credits', async () => {
  const token = await session();
  assert.equal((await generate(token, undefined, { consent: false })).status, 400);
  assert.equal((await generate(token, undefined, { lookId: 'untrusted-prompt' })).status, 400);
  assert.equal((await generate(token, undefined, { image: 'not-an-image' })).status, 400);
  assert.equal((await generate(token, undefined, { image: Buffer.from('not an actual image file').toString('base64') })).status, 400);
  assert.equal((await (await request('/api/wallet', token)).json()).available, 12);
});

test('provider failures refund exactly once and never disclose provider details', async () => {
  const token = await session(); failNext = true;
  const created = await (await generate(token)).json(); const job = await terminal(token, created.id);
  assert.equal(job.status, 'failed'); assert.equal(job.wallet.available, 12);
  assert(!job.error.includes('Secret'));
  const again = await request(`/api/generations/${created.id}`, token, { method: 'DELETE' });
  assert.equal((await again.json()).wallet.available, 12);
});

test('cancel is idempotent, refunds the hold, and blocks late upload acceptance', async () => {
  const token = await session(); blocked = () => {};
  const key = randomUUID(); const created = await (await generate(token, key)).json();
  const cancel = () => request(`/api/requests/${key}/cancel`, token, { method: 'POST' });
  const cancelled = await (await cancel()).json();
  assert.equal(cancelled.job.status, 'cancelled'); assert.equal(cancelled.wallet.available, 12);
  assert.equal((await (await cancel()).json()).wallet.available, 12);
  blocked = null;
  const lateKey = randomUUID(); await request(`/api/requests/${lateKey}/cancel`, token, { method: 'POST' });
  const late = await generate(token, lateKey); assert.equal(late.status, 409);
  assert.equal((await late.json()).code, 'REQUEST_CANCELLED');
});

test('sessions cannot read, cancel, or download another account’s edits', async () => {
  const first = await session(); const second = await session();
  const created = await (await generate(first)).json(); await terminal(first, created.id);
  assert.equal((await request(`/api/generations/${created.id}`, second)).status, 404);
  assert.equal((await request(`/api/generations/${created.id}/result`, second)).status, 404);
  assert.equal((await request(`/api/generations/${created.id}`, second, { method: 'DELETE' })).status, 404);
});

test('browser origins are allowlisted and demo refills are not arbitrary purchases', async () => {
  assert.equal((await request('/api/health', undefined, { headers: { Origin: 'https://not-our-app.invalid' } })).status, 403);
  const token = await session();
  assert.equal((await request('/api/wallet/demo-refill', token, { method: 'POST' })).status, 409);
});

test('SQLite keeps credits across restarts and refunds interrupted holds', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stilllight-test-')); const path = join(directory, 'test.sqlite');
  const store = new Store(path, 'demo'); const { token } = store.createSession(5, 30); const account = store.authenticate(token);
  store.reserve(account, randomUUID(), 'fingerprint', 'soft-studio', 100);
  assert.equal(store.wallet(account).available, 4); store.close();
  const restarted = new Store(path, 'demo');
  assert.equal(restarted.wallet(restarted.authenticate(token)).available, 5);
  assert.equal(restarted.wallet(account).reserved, 0); restarted.close();
  await rm(directory, { recursive: true });
});

test('expired undelivered results refund exactly once, but delivered edits stay charged', () => {
  const store = new Store(':memory:', 'demo');
  try {
    const { token } = store.createSession(4, 30); const account = store.authenticate(token);
    const first = store.reserve(account, randomUUID(), 'one', 'golden-hour', 100);
    store.succeed(first.id);
    assert.equal(store.wallet(account).available, 3);
    assert.equal(store.refund(first.id, 'expired', 'Preview expired'), true);
    assert.equal(store.refund(first.id, 'expired', 'Preview expired'), false);
    assert.equal(store.wallet(account).available, 4);
    const second = store.reserve(account, randomUUID(), 'two', 'soft-studio', 100);
    store.succeed(second.id); store.delivered(second.id);
    assert.equal(store.refund(second.id, 'expired', 'Preview expired'), false);
    assert.equal(store.refund(second.id, 'cancelled', 'Too late'), false);
    assert.equal(store.wallet(account).available, 3);
  } finally { store.close(); }
});

test('demo refills are bounded and cannot grant live credits', () => {
  const store = new Store(':memory:', 'demo');
  const live = new Store(':memory:', 'gemini');
  try {
    const account = store.authenticate(store.createSession(2, 30).token);
    assert.equal(store.refill(account).available, 12);
    assert.throws(() => store.refill(account), /Use a few more/);
    const liveAccount = live.authenticate(live.createSession(2, 30).token);
    assert.throws(() => live.refill(liveAccount), /Purchases are not enabled/);
    assert.equal(live.wallet(liveAccount).available, 2);
  } finally { store.close(); live.close(); }
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DraftPhoto, GenerationJob, SavedEdit, ServerInfo, Wallet } from '@/domain/api';
import type { LookId } from '@/domain/looks';
import { ApiError, defaultApiUrl, normalizeApiUrl, StudioApi } from '@/lib/api';
import * as secrets from '@/lib/secret-store';
import * as photos from '@/lib/photo-store';
import { preparePhoto } from '@/lib/prepare-photo';

interface Settings { apiUrl: string; appearance: 'system' | 'light' | 'dark'; haptics: boolean }
export interface PendingEdit {
  requestKey: string; jobId?: string; originalUri: string; lookId: LookId; width: number; height: number; apiUrl: string; createdAt: number;
}
type Phase = 'idle' | 'preparing' | 'uploading' | 'processing' | 'saving' | 'succeeded' | 'error';
interface Activity { phase: Phase; error: string | null; savedId: string | null }

interface StudioValue {
  ready: boolean; settings: Settings; info: ServerInfo | null; wallet: Wallet | null; connectionError: string | null;
  history: SavedEdit[]; draft: DraftPhoto | null; selectedLook: LookId; pending: PendingEdit | null; activity: Activity; busy: boolean;
  setPhoto: (photo: DraftPhoto) => void; selectLook: (id: LookId) => void;
  connect: (inviteCode?: string, apiUrl?: string) => Promise<void>; refreshWallet: () => Promise<void>; refill: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  generate: () => Promise<void>; resume: () => Promise<void>; cancel: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>; removeEdit: (id: string) => Promise<void>; clearCollection: () => Promise<void>;
  deleteAccount: () => Promise<void>; haptic: (kind?: 'selection' | 'success') => void;
}

const StudioContext = createContext<StudioValue | null>(null);
const HISTORY = 'stilllight.history.v1'; const SETTINGS = 'stilllight.settings.v1'; const PENDING = 'stilllight.pending.v1';
const INITIAL_ACTIVITY: Activity = { phase: 'idle', error: null, savedId: null };

async function stored<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new Error('Interrupted')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({ apiUrl: defaultApiUrl(), appearance: 'system', haptics: true });
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedEdit[]>([]);
  const [draft, setDraft] = useState<DraftPhoto | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>('golden-hour');
  const [pending, setPendingState] = useState<PendingEdit | null>(null);
  const [activity, setActivity] = useState<Activity>(INITIAL_ACTIVITY);
  const pendingRef = useRef<PendingEdit | null>(null);
  const apiRef = useRef<StudioApi | null>(null);
  const infoRef = useRef<ServerInfo | null>(null);
  const operation = useRef<AbortController | null>(null);
  const historyRef = useRef<SavedEdit[]>([]);
  const historyQueue = useRef<Promise<void>>(Promise.resolve());
  const busy = ['preparing', 'uploading', 'processing', 'saving'].includes(activity.phase);

  const haptic = useCallback((kind: 'selection' | 'success' = 'selection') => {
    if (!settings.haptics || Platform.OS === 'web') return;
    void (kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync()).catch(() => {});
  }, [settings.haptics]);

  const mutateHistory = useCallback(async (transform: (current: SavedEdit[]) => SavedEdit[]) => {
    const task = historyQueue.current.then(async () => {
      const next = transform(historyRef.current);
      await AsyncStorage.setItem(HISTORY, JSON.stringify(next));
      historyRef.current = next; setHistory(next);
    });
    historyQueue.current = task.catch(() => {});
    return task;
  }, []);

  const savePending = useCallback(async (next: PendingEdit | null) => {
    if (next) await AsyncStorage.setItem(PENDING, JSON.stringify(next));
    else await AsyncStorage.removeItem(PENDING);
    pendingRef.current = next; setPendingState(next);
  }, []);

  const connectTo = useCallback(async (url: string, inviteCode?: string) => {
    try {
      const publicApi = new StudioApi(url);
      const health = await publicApi.health();
      infoRef.current = health;
      setInfo(health);
      let token = await secrets.getSession(url);
      let authenticated = token ? new StudioApi(url, token) : null;
      let balance: Wallet | null = null;
      if (authenticated) {
        try { balance = await authenticated.wallet(); }
        catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; authenticated = null; token = null; }
      }
      if (!authenticated) {
        const created = await publicApi.session(inviteCode);
        await secrets.setSession(url, created.token);
        authenticated = new StudioApi(url, created.token); balance = created.wallet;
      }
      apiRef.current = authenticated; setWallet(balance); setConnectionError(null);
    } catch (error) {
      apiRef.current = null; setWallet(null);
      const message = error instanceof Error ? error.message : 'Could not connect to the studio.';
      setConnectionError(message); throw error;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const next = await stored<Settings>(SETTINGS, { apiUrl: defaultApiUrl(), appearance: 'system', haptics: true });
        const entries = await stored<SavedEdit[]>(HISTORY, []);
        const unfinished = await stored<PendingEdit | null>(PENDING, null);
        if (!mounted) return;
        setSettings(next); setHistory(entries); historyRef.current = entries;
        pendingRef.current = unfinished; setPendingState(unfinished);
        if (unfinished) setActivity({ phase: 'error', error: 'You have an unfinished edit. Resume it without spending another credit.', savedId: null });
        setReady(true);
        await connectTo(next.apiUrl).catch(() => {});
      } catch {
        if (mounted) { setConnectionError('Could not load local settings. Your files have not been deleted.'); setReady(true); }
      }
    })();
    return () => { mounted = false; operation.current?.abort(); };
  }, [connectTo]);

  async function connect(inviteCode?: string, apiUrl?: string) { await connectTo(apiUrl ?? settings.apiUrl, inviteCode); }
  async function refreshWallet() {
    if (!apiRef.current) { await connect(); return; }
    const balance = await apiRef.current.wallet(); setWallet(balance);
  }
  async function refill() {
    if (!apiRef.current) await connect();
    setWallet(await apiRef.current!.refill()); haptic('success');
  }
  async function updateSettings(patch: Partial<Settings>) {
    if (patch.apiUrl && pendingRef.current) throw new Error('Finish or cancel your pending edit before changing servers.');
    const next = { ...settings, ...patch, ...(patch.apiUrl ? { apiUrl: normalizeApiUrl(patch.apiUrl) } : {}) };
    await AsyncStorage.setItem(SETTINGS, JSON.stringify(next)); setSettings(next);
    if (next.apiUrl !== settings.apiUrl) { setInfo(null); infoRef.current = null; setWallet(null); apiRef.current = null; }
  }

  async function processPending(edit: PendingEdit, controller: AbortController) {
    const signal = controller.signal;
    if (!apiRef.current || apiRef.current.baseUrl !== edit.apiUrl) await connectTo(edit.apiUrl);
    const api = apiRef.current!;
    let job: GenerationJob;
    if (!edit.jobId) {
      setActivity({ phase: 'uploading', error: null, savedId: null });
      const image = await photos.readPhoto(edit.originalUri);
      signal.throwIfAborted();
      job = await api.create(image, edit.lookId, edit.requestKey, signal);
      edit = { ...edit, jobId: job.id }; await savePending(edit);
    } else job = await api.job(edit.jobId, signal);
    setWallet(job.wallet);
    setActivity({ phase: 'processing', error: null, savedId: null });
    const deadline = Date.now() + 145_000;
    while (job.status === 'processing') {
      if (Date.now() > deadline) throw new ApiError('This edit is taking longer than expected. Use Resume edit to check it—no extra credit will be charged.');
      await wait(1000, signal);
      job = await api.job(job.id, signal); setWallet(job.wallet);
    }
    if (job.status !== 'succeeded') {
      await savePending(null);
      await photos.deletePhoto(edit.originalUri);
      throw new Error(job.error ?? 'This edit could not be completed. Your credit was returned.');
    }
    signal.throwIfAborted();
    setActivity({ phase: 'saving', error: null, savedId: null });
    const existing = historyRef.current.find((item) => item.id === job.id);
    if (!existing) {
      const result = await api.result(job.id, signal).catch(async (error: unknown) => {
        if (error instanceof ApiError && error.status === 410) {
          // A preview can expire after a browser/storage interruption. Do not
          // leave an unrecoverable job blocking all future edits or deletion.
          await savePending(null);
          await photos.deletePhoto(edit.originalUri);
          await api.wallet().then(setWallet).catch(() => {});
        }
        throw error;
      });
      const resultUri = await photos.writePhoto(`${edit.requestKey}-edited`, result.base64);
      signal.throwIfAborted();
      const entry: SavedEdit = { id: job.id, lookId: edit.lookId, originalUri: edit.originalUri, resultUri, createdAt: job.createdAt, mode: result.mode, width: result.width, height: result.height, favorite: false };
      await mutateHistory((current) => [entry, ...current.filter((item) => item.id !== job.id)]);
    }
    await savePending(null);
    setActivity({ phase: 'succeeded', error: null, savedId: job.id }); haptic('success');
  }

  async function resume() {
    if (operation.current || !pendingRef.current) return;
    const controller = new AbortController(); operation.current = controller;
    try { await processPending(pendingRef.current, controller); }
    catch (error) { if (!controller.signal.aborted) setActivity({ phase: 'error', error: error instanceof Error ? error.message : 'Could not resume this edit.', savedId: null }); }
    finally { if (operation.current === controller) operation.current = null; }
  }

  async function generate() {
    if (operation.current) return;
    if (pendingRef.current) { await resume(); return; }
    if (!draft) throw new Error('Choose a photo first.');
    const controller = new AbortController(); operation.current = controller;
    try {
      setActivity({ phase: 'preparing', error: null, savedId: null });
      if (!apiRef.current) await connect();
      controller.signal.throwIfAborted();
      if (draft.isSample && infoRef.current?.mode === 'gemini') throw new Error('Use your own photo for live AI. The example portrait is for demo mode only.');
      const prepared = await preparePhoto(draft);
      controller.signal.throwIfAborted();
      const requestKey = randomUUID();
      const originalUri = await photos.writePhoto(`${requestKey}-original`, prepared.base64);
      if (controller.signal.aborted) { await photos.deletePhoto(originalUri); return; }
      const edit: PendingEdit = { requestKey, originalUri, lookId: selectedLook, width: prepared.width, height: prepared.height, apiUrl: settings.apiUrl, createdAt: Date.now() };
      await savePending(edit);
      controller.signal.throwIfAborted();
      await processPending(edit, controller);
    } catch (error) {
      if (!controller.signal.aborted) setActivity({ phase: 'error', error: error instanceof Error ? error.message : 'Could not edit this photo.', savedId: null });
    } finally { if (operation.current === controller) operation.current = null; }
  }

  async function cancel() {
    const edit = pendingRef.current;
    if (!edit) { operation.current?.abort(); operation.current = null; setActivity(INITIAL_ACTIVITY); return; }
    if (!apiRef.current || apiRef.current.baseUrl !== edit.apiUrl) await connectTo(edit.apiUrl);
    const cancelled = await apiRef.current!.cancel(edit.requestKey);
    setWallet(cancelled.wallet);
    if (cancelled.job?.status === 'succeeded') {
      // Completion beat cancellation. Keep the successful, charged result recoverable.
      if (!operation.current) await resume();
      return;
    }
    operation.current?.abort(); operation.current = null;
    await savePending(null); await photos.deletePhoto(edit.originalUri);
    setActivity(INITIAL_ACTIVITY);
  }

  function setPhoto(photo: DraftPhoto) {
    if (pendingRef.current || operation.current) throw new Error('Finish or cancel the current edit first.');
    setDraft(photo); setActivity(INITIAL_ACTIVITY);
  }
  function selectLook(id: LookId) { if (!operation.current && !pendingRef.current) { setSelectedLook(id); haptic(); } }
  async function toggleFavorite(id: string) { await mutateHistory((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item)); haptic(); }
  async function removeEdit(id: string) {
    const edit = historyRef.current.find((item) => item.id === id);
    await mutateHistory((current) => current.filter((item) => item.id !== id));
    if (edit) { await photos.deletePhoto(edit.originalUri); await photos.deletePhoto(edit.resultUri); }
  }
  async function clearCollection() {
    if (pendingRef.current || operation.current) throw new Error('Finish or cancel your pending edit before clearing local photos.');
    await photos.clearPhotos(); await mutateHistory(() => []); setDraft(null); setActivity(INITIAL_ACTIVITY);
  }
  async function deleteAccount() {
    if (operation.current || pendingRef.current) throw new Error('Finish or cancel your pending edit before deleting your beta session.');
    if (!apiRef.current) await connect();
    await apiRef.current!.removeSession();
    await secrets.deleteSession(settings.apiUrl); await clearCollection();
    apiRef.current = null; setWallet(null); setConnectionError('Beta session deleted. Connect again when you want to start a new session.');
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && apiRef.current) void apiRef.current.wallet().then(setWallet).catch(() => {});
    });
    return () => subscription.remove();
  }, []);

  return <StudioContext value={{ ready, settings, info, wallet, connectionError, history, draft, selectedLook, pending, activity, busy,
    setPhoto, selectLook, connect, refreshWallet, refill, updateSettings, generate, resume, cancel, toggleFavorite, removeEdit, clearCollection, deleteAccount, haptic }}>
    {children}
  </StudioContext>;
}

export function useStudio() {
  const studio = use(StudioContext);
  if (!studio) throw new Error('StudioProvider is missing.');
  return studio;
}

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { GenerationJob, GenerationResult, ServerInfo, Wallet } from '@/domain/api';
import type { LookId } from '@/domain/looks';

export class ApiError extends Error {
  constructor(message: string, public status = 0, public code = 'NETWORK_ERROR') {
    super(message); this.name = 'ApiError';
  }
}

export function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `http://${window.location.hostname}:3001`;
  const hostUri = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  try { return `http://${new URL(`http://${hostUri}`).hostname}:3001`; }
  catch { return 'http://localhost:3001'; }
}

export function normalizeApiUrl(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('Enter a complete API address, such as http://192.168.1.100:3001.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('Use an http:// or https:// server address without a path, password, or query.');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
  if (url.protocol === 'http:' && !local) throw new Error('Public servers must use HTTPS. HTTP is only allowed for a local development server.');
  return url.origin;
}

export class StudioApi {
  constructor(readonly baseUrl: string, readonly token: string | null = null) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const signal = options.signal;
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...options.headers },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new ApiError(typeof data.error === 'string' ? data.error : 'The studio could not complete that request.', response.status, data.code);
      }
      if (response.status === 204) return undefined as T;
      return await response.json() as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw error;
      throw new ApiError('Cannot reach the studio. Check that the API is running and your server address is correct.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }

  health() { return this.request<ServerInfo>('/api/health'); }
  session(inviteCode?: string) { return this.request<{ token: string; wallet: Wallet }>('/api/session', { method: 'POST', body: JSON.stringify({ inviteCode }) }); }
  wallet() { return this.request<Wallet>('/api/wallet'); }
  refill() { return this.request<Wallet>('/api/wallet/demo-refill', { method: 'POST' }); }
  removeSession() { return this.request<void>('/api/session', { method: 'DELETE' }); }
  create(image: string, lookId: LookId, requestKey: string, signal: AbortSignal) {
    return this.request<GenerationJob>('/api/generations', { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify({ image, lookId, consent: true }), signal });
  }
  job(id: string, signal?: AbortSignal) { return this.request<GenerationJob>(`/api/generations/${encodeURIComponent(id)}`, { signal }); }
  result(id: string, signal?: AbortSignal) { return this.request<GenerationResult>(`/api/generations/${encodeURIComponent(id)}/result`, { signal }); }
  cancel(key: string) { return this.request<{ job: GenerationJob | null; wallet: Wallet }>(`/api/requests/${encodeURIComponent(key)}/cancel`, { method: 'POST' }); }
}

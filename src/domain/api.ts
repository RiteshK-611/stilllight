import type { LookId } from './looks.ts';

export type RenderMode = 'demo' | 'gemini';
export type JobStatus = 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface ServerInfo {
  name: string;
  mode: RenderMode;
  requiresInvite: boolean;
  purchasesEnabled: false;
  maxInputBytes: number;
}

export interface Wallet {
  available: number;
  reserved: number;
  mode: RenderMode;
}

export interface GenerationJob {
  id: string;
  lookId: LookId;
  status: JobStatus;
  mode: RenderMode;
  createdAt: number;
  error: string | null;
  wallet: Wallet;
}

export interface GenerationResult {
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  mode: RenderMode;
}

export interface SavedEdit {
  id: string;
  lookId: LookId;
  originalUri: string;
  resultUri: string;
  createdAt: number;
  mode: RenderMode;
  width: number;
  height: number;
  favorite: boolean;
}

export interface DraftPhoto {
  uri: string;
  width: number;
  height: number;
  isSample: boolean;
}

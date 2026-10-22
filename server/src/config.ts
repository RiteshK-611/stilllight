import type { RenderMode } from '../../src/domain/api.ts';

export interface Config {
  mode: RenderMode;
  port: number;
  host: string;
  databasePath: string;
  allowedOrigins: string[];
  apiKey: string;
  model: string;
  inviteCode: string;
  dailyLimit: number;
  initialCredits: number;
  sessionDays: number;
  resultTtlMs: number;
}

function integer(value: string | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) {
    throw new Error(`Expected an integer between 1 and ${max}.`);
  }
  return number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = env.AI_MODE ?? 'demo';
  if (mode !== 'demo' && mode !== 'gemini') throw new Error('AI_MODE must be demo or gemini.');
  if (mode === 'gemini' && (!env.GEMINI_API_KEY || (env.PILOT_INVITE_CODE?.length ?? 0) < 12)) {
    throw new Error('Live AI requires GEMINI_API_KEY and a PILOT_INVITE_CODE of at least 12 characters.');
  }
  return {
    mode,
    port: integer(env.PORT, 3001, 65535),
    host: env.HOST ?? '0.0.0.0',
    databasePath: env.DATABASE_PATH ?? './data/stilllight.sqlite',
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081').split(',').map((s) => s.trim()),
    apiKey: env.GEMINI_API_KEY ?? '',
    model: env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image',
    inviteCode: env.PILOT_INVITE_CODE ?? '',
    dailyLimit: integer(env.MAX_DAILY_GENERATIONS, 30, 1000),
    initialCredits: mode === 'demo' ? 12 : integer(env.INITIAL_LIVE_CREDITS, 3, 20),
    sessionDays: integer(env.SESSION_DAYS, 30, 365),
    resultTtlMs: integer(env.RESULT_TTL_MINUTES, 10, 60) * 60_000,
  };
}

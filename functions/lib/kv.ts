// ═══════════════════════════════════════════════════════════════════════════
// KV helpers. We use KV for two things:
//   1) Rate-limit counters (sliding minute window + daily quota counter)
//   2) Admin sessions
// All counter keys have TTLs so they self-expire.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env } from './types';
import { utcDayStamp, minuteFloor } from './ids';

const MINUTE_TTL = 70; // a bit over 60 so the bucket lives for the full window
const DAILY_TTL = 60 * 60 * 26; // ~26 hours

export function minuteKey(scope: string, epochSeconds?: number): string {
  return `rl:m:${scope}:${minuteFloor(epochSeconds)}`;
}

export function dailyKey(scope: string, epochSeconds?: number): string {
  return `rl:d:${scope}:${utcDayStamp(epochSeconds)}`;
}

export async function incrementCounter(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number
): Promise<number> {
  const raw = await kv.get(key);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  // Note: KV is eventually consistent. This is fine for rate limiting since
  // any drift only ever lets through a tiny burst, never blocks legitimate
  // traffic. Daily quota is the source of truth for hard caps and runs from
  // KV too — the small overshoot is acceptable.
  await kv.put(key, String(next), { expirationTtl: ttlSeconds });
  return next;
}

export async function readCounter(kv: KVNamespace, key: string): Promise<number> {
  const raw = await kv.get(key);
  return raw ? parseInt(raw, 10) : 0;
}

export async function getMinuteCount(env: Env, scope: string): Promise<number> {
  return readCounter(env.RATE_LIMIT_KV, minuteKey(scope));
}

export async function getDailyCount(env: Env, scope: string): Promise<number> {
  return readCounter(env.RATE_LIMIT_KV, dailyKey(scope));
}

export async function bumpMinuteAndDay(
  env: Env,
  scope: string
): Promise<{ minute: number; day: number }> {
  const minute = await incrementCounter(env.RATE_LIMIT_KV, minuteKey(scope), MINUTE_TTL);
  const day = await incrementCounter(env.RATE_LIMIT_KV, dailyKey(scope), DAILY_TTL);
  return { minute, day };
}

// ── admin sessions ────────────────────────────────────────────────────────

export interface AdminSessionPayload {
  session_id: string;
  created_at: number;
  expires_at: number;
  method: 'password' | 'passkey';
  ip: string | null;
  ua: string | null;
}

const ADMIN_SESSION_TTL = 60 * 60 * 8; // 8 hours

export function adminSessionKey(sid: string): string {
  return `admin:sess:${sid}`;
}

export async function putAdminSession(
  env: Env,
  payload: AdminSessionPayload
): Promise<void> {
  await env.SESSION_KV.put(adminSessionKey(payload.session_id), JSON.stringify(payload), {
    expirationTtl: ADMIN_SESSION_TTL,
  });
}

export async function getAdminSession(
  env: Env,
  sid: string
): Promise<AdminSessionPayload | null> {
  const raw = await env.SESSION_KV.get(adminSessionKey(sid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function deleteAdminSession(env: Env, sid: string): Promise<void> {
  await env.SESSION_KV.delete(adminSessionKey(sid));
}

// ── WebAuthn challenges (short-lived) ─────────────────────────────────────

const WEBAUTHN_CHALLENGE_TTL = 60 * 5; // 5 min

export function webauthnChallengeKey(handle: string): string {
  return `admin:webauthn:challenge:${handle}`;
}

export async function putWebauthnChallenge(
  env: Env,
  handle: string,
  payload: Record<string, unknown>
): Promise<void> {
  await env.SESSION_KV.put(webauthnChallengeKey(handle), JSON.stringify(payload), {
    expirationTtl: WEBAUTHN_CHALLENGE_TTL,
  });
}

export async function takeWebauthnChallenge(
  env: Env,
  handle: string
): Promise<Record<string, unknown> | null> {
  const key = webauthnChallengeKey(handle);
  const raw = await env.SESSION_KV.get(key);
  if (!raw) return null;
  await env.SESSION_KV.delete(key);
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

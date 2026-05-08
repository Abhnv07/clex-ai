// ═══════════════════════════════════════════════════════════════════════════
// Quota engine. We rate-limit by api key (and fall back to user id when there
// is no key, e.g. dashboard preview calls). The minute window is enforced via
// KV; the daily cap also lives in KV but is double-checked against
// daily_usage on D1 so users can't bypass it by burning through KV cache.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env, UserRow, ApiKeyRow } from './types';
import { effectivePlanTier, planLimitsFor } from './plans';
import {
  bumpMinuteAndDay,
  getMinuteCount,
  getDailyCount,
  minuteKey,
  dailyKey,
  incrementCounter,
} from './kv';
import { nowSeconds, utcDayStamp } from './ids';

export interface QuotaDecision {
  allowed: boolean;
  reason?: 'rate_limited_minute' | 'rate_limited_day' | 'plan_expired' | 'blocked';
  retryAfterSeconds: number;
  limits: { perMinute: number; perDay: number };
  used: { minute: number; day: number };
  remaining: { minute: number; day: number };
  tier: string;
}

function buildScope(user: UserRow, key: ApiKeyRow | null): string {
  return key ? `key:${key.id}` : `user:${user.id}`;
}

// Pre-flight check: is the request allowed *before* we forward it upstream?
// This does NOT bump the counters — call commitQuota() after the upstream
// call returns so we only count successful requests against the daily cap.
// Per-minute is bumped here, though, so users can't spam upstream regardless
// of outcome.
export async function checkAndBumpMinute(
  env: Env,
  user: UserRow,
  key: ApiKeyRow | null,
  ref: number = nowSeconds()
): Promise<QuotaDecision> {
  const tier = effectivePlanTier(user, ref);
  const limits = planLimitsFor(user, ref);
  const scope = buildScope(user, key);

  if (user.is_blocked) {
    return {
      allowed: false,
      reason: 'blocked',
      retryAfterSeconds: 60,
      limits,
      used: { minute: 0, day: 0 },
      remaining: { minute: 0, day: 0 },
      tier,
    };
  }

  // Read first to short-circuit obvious 429s without spending a write.
  const [currentMinute, currentDay] = await Promise.all([
    getMinuteCount(env, scope),
    getDailyCount(env, scope),
  ]);

  if (currentMinute >= limits.perMinute) {
    const ttl = 60 - (ref % 60);
    return {
      allowed: false,
      reason: 'rate_limited_minute',
      retryAfterSeconds: Math.max(1, ttl),
      limits,
      used: { minute: currentMinute, day: currentDay },
      remaining: {
        minute: Math.max(0, limits.perMinute - currentMinute),
        day: Math.max(0, limits.perDay - currentDay),
      },
      tier,
    };
  }
  if (currentDay >= limits.perDay) {
    const tomorrow = (Math.floor(ref / 86400) + 1) * 86400;
    return {
      allowed: false,
      reason: 'rate_limited_day',
      retryAfterSeconds: Math.max(60, tomorrow - ref),
      limits,
      used: { minute: currentMinute, day: currentDay },
      remaining: { minute: 0, day: 0 },
      tier,
    };
  }

  // Bump the per-minute counter immediately (every attempt counts toward
  // the per-minute cap, success or failure).
  const minute = await incrementCounter(env.RATE_LIMIT_KV, minuteKey(scope, ref), 70);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    limits,
    used: { minute, day: currentDay },
    remaining: {
      minute: Math.max(0, limits.perMinute - minute),
      day: Math.max(0, limits.perDay - currentDay),
    },
    tier,
  };
}

// Bump the daily counter after a successful upstream call.
export async function commitDailyUse(
  env: Env,
  user: UserRow,
  key: ApiKeyRow | null,
  ref: number = nowSeconds()
): Promise<number> {
  const scope = buildScope(user, key);
  return incrementCounter(env.RATE_LIMIT_KV, dailyKey(scope, ref), 60 * 60 * 26);
}

export async function snapshotUsage(
  env: Env,
  user: UserRow,
  ref: number = nowSeconds()
): Promise<{ minute: number; day: number; tier: string; limits: { perMinute: number; perDay: number } }> {
  // Snapshot uses the user-level scope so the dashboard "today's calls"
  // panel reflects the user's full activity even before they create a key.
  const scope = buildScope(user, null);
  const [minute, day] = await Promise.all([
    getMinuteCount(env, scope),
    getDailyCount(env, scope),
  ]);
  const tier = effectivePlanTier(user, ref);
  const limits = planLimitsFor(user, ref);
  return { minute, day, tier, limits };
}

export function todayStamp(ref: number = nowSeconds()): number {
  return utcDayStamp(ref);
}

export { bumpMinuteAndDay };

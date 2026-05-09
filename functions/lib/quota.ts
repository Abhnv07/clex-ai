// ═══════════════════════════════════════════════════════════════════════════
// Quota engine. Two enforcement axes:
//
//   1. Per-minute *requests* — burst protection. Counts every /api/chat hit
//      regardless of model, success or failure.
//   2. Daily *credits* — long-window budget. Each model has a credit cost
//      (see lib/credits.ts); the day counter resets at 00:00 UTC.
//
// We rate-limit by api key (and fall back to user id when there is no key,
// e.g. dashboard preview calls). Both counters live in KV with TTL so they
// self-expire — no cron needed.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env, UserRow, ApiKeyRow } from './types';
import { effectivePlanTier, planLimitsFor } from './plans';
import {
  bumpMinuteCounter,
  bumpDailyCredits,
  getMinuteCount,
  getDailyCredits,
} from './kv';
import { nowSeconds, utcDayStamp } from './ids';

export interface QuotaDecision {
  allowed: boolean;
  reason?:
    | 'rate_limited_minute'
    | 'rate_limited_credits'
    | 'plan_expired'
    | 'blocked';
  retryAfterSeconds: number;
  // Plan ceilings.
  limits: { perMinute: number; creditsPerDay: number };
  // Where we are right now.
  used: { minute: number; creditsToday: number };
  remaining: { minute: number; creditsToday: number };
  // Cost we *would* have charged for the inbound request.
  cost: number;
  tier: string;
}

function buildScope(user: UserRow, key: ApiKeyRow | null): string {
  return key ? `key:${key.id}` : `user:${user.id}`;
}

// Pre-flight check: is the request allowed *before* we forward it upstream?
// Per-minute is bumped here (every attempt counts toward burst protection,
// success or failure). The daily credit counter is NOT bumped here — call
// commitDailyCredits() after the upstream call returns 2xx so we only charge
// for successful requests.
export async function checkAndBumpMinute(
  env: Env,
  user: UserRow,
  key: ApiKeyRow | null,
  cost: number,
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
      limits: { perMinute: limits.perMinute, creditsPerDay: limits.creditsPerDay },
      used: { minute: 0, creditsToday: 0 },
      remaining: { minute: 0, creditsToday: 0 },
      cost,
      tier,
    };
  }

  // Read first to short-circuit obvious 429s without spending a write.
  const [currentMinute, currentCredits] = await Promise.all([
    getMinuteCount(env, scope),
    getDailyCredits(env, scope),
  ]);

  if (currentMinute >= limits.perMinute) {
    const ttl = 60 - (ref % 60);
    return {
      allowed: false,
      reason: 'rate_limited_minute',
      retryAfterSeconds: Math.max(1, ttl),
      limits: { perMinute: limits.perMinute, creditsPerDay: limits.creditsPerDay },
      used: { minute: currentMinute, creditsToday: currentCredits },
      remaining: {
        minute: Math.max(0, limits.perMinute - currentMinute),
        creditsToday: Math.max(0, limits.creditsPerDay - currentCredits),
      },
      cost,
      tier,
    };
  }
  if (currentCredits + cost > limits.creditsPerDay) {
    const tomorrow = (Math.floor(ref / 86400) + 1) * 86400;
    return {
      allowed: false,
      reason: 'rate_limited_credits',
      retryAfterSeconds: Math.max(60, tomorrow - ref),
      limits: { perMinute: limits.perMinute, creditsPerDay: limits.creditsPerDay },
      used: { minute: currentMinute, creditsToday: currentCredits },
      remaining: {
        minute: Math.max(0, limits.perMinute - currentMinute),
        creditsToday: Math.max(0, limits.creditsPerDay - currentCredits),
      },
      cost,
      tier,
    };
  }

  // Bump the per-minute counter immediately.
  const minute = await bumpMinuteCounter(env, scope);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    limits: { perMinute: limits.perMinute, creditsPerDay: limits.creditsPerDay },
    used: { minute, creditsToday: currentCredits },
    remaining: {
      minute: Math.max(0, limits.perMinute - minute),
      creditsToday: Math.max(0, limits.creditsPerDay - currentCredits),
    },
    cost,
    tier,
  };
}

// Bump the daily credit counter after a successful upstream call. Returns
// the new credits-used-today value.
export async function commitDailyCredits(
  env: Env,
  user: UserRow,
  key: ApiKeyRow | null,
  cost: number
): Promise<number> {
  const scope = buildScope(user, key);
  return bumpDailyCredits(env, scope, cost);
}

export async function snapshotUsage(
  env: Env,
  user: UserRow,
  ref: number = nowSeconds()
): Promise<{
  minute: number;
  creditsToday: number;
  tier: string;
  limits: { perMinute: number; creditsPerDay: number };
  resetsAt: number;
}> {
  // Snapshot uses the user-level scope so the dashboard "today's calls"
  // panel reflects the user's full activity even before they create a key.
  const scope = buildScope(user, null);
  const [minute, creditsToday] = await Promise.all([
    getMinuteCount(env, scope),
    getDailyCredits(env, scope),
  ]);
  const tier = effectivePlanTier(user, ref);
  const limits = planLimitsFor(user, ref);
  const resetsAt = (Math.floor(ref / 86400) + 1) * 86400;
  return {
    minute,
    creditsToday,
    tier,
    limits: { perMinute: limits.perMinute, creditsPerDay: limits.creditsPerDay },
    resetsAt,
  };
}

export function todayStamp(ref: number = nowSeconds()): number {
  return utcDayStamp(ref);
}

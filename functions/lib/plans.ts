// ═══════════════════════════════════════════════════════════════════════════
// Plan tier definitions. The free / starter / pro caps come straight from the
// product spec. The "developer" tier is an internal escape hatch we may use
// for partners; admins can still apply it.
// ═══════════════════════════════════════════════════════════════════════════

import type { PlanTier, PlanDuration, UserRow } from './types';
import { nowSeconds } from './ids';

export interface PlanLimits {
  // Per-minute burst protection. Counts *requests*, not credits, so a user
  // can't hammer upstream NVIDIA regardless of which model they call.
  perMinute: number;
  // Daily credit budget. Each /api/chat call charges credits per the
  // model's tier (see lib/credits.ts) and rolls over at 00:00 UTC.
  creditsPerDay: number;
  // Maximum number of *active* clex_* API keys a user on this tier may hold.
  // `Infinity` means uncapped (Developer); JSON serialises this as `null` and
  // the dashboard renders "Unlimited" when the field is null/Infinity.
  maxActiveKeys: number;
}

// Treat any value >= UNLIMITED_KEYS_SENTINEL as "no cap" when rendering or
// enforcing — useful so we don't depend on Infinity surviving JSON round-trips.
export const UNLIMITED_KEYS_SENTINEL = 1_000_000;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { perMinute: 1, creditsPerDay: 100, maxActiveKeys: 1 },
  starter: { perMinute: 5, creditsPerDay: 500, maxActiveKeys: 5 },
  pro: { perMinute: 10, creditsPerDay: 2000, maxActiveKeys: 20 },
  developer: { perMinute: 60, creditsPerDay: 1_000_000, maxActiveKeys: UNLIMITED_KEYS_SENTINEL },
};

export function isUnlimitedKeys(limit: number): boolean {
  return !Number.isFinite(limit) || limit >= UNLIMITED_KEYS_SENTINEL;
}

export interface PlanCatalogEntry {
  tier: PlanTier;
  name: string;
  monthlyUsd: number;
  comingSoon: boolean;
  limits: PlanLimits;
  blurb: string;
}

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    tier: 'free',
    name: 'Free',
    monthlyUsd: 0,
    comingSoon: false,
    limits: PLAN_LIMITS.free,
    blurb: '100 credits / day · 1 req / minute · 1 API key. Great for trying Clex AI.',
  },
  {
    tier: 'starter',
    name: 'Starter',
    monthlyUsd: 2,
    comingSoon: true,
    limits: PLAN_LIMITS.starter,
    blurb: '500 credits / day · 5 req / minute · 5 API keys. Side projects and prototyping.',
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyUsd: 5,
    comingSoon: true,
    limits: PLAN_LIMITS.pro,
    blurb: '2,000 credits / day · 10 req / minute · 20 API keys. Production workloads.',
  },
];

const DURATION_SECONDS: Record<Exclude<PlanDuration, 'lifetime'>, number> = {
  '1m': 60 * 60 * 24 * 30,
  '3m': 60 * 60 * 24 * 30 * 3,
  '6m': 60 * 60 * 24 * 30 * 6,
  '1y': 60 * 60 * 24 * 365,
};

export interface PlanComputation {
  startedAt: number;
  expiresAt: number | null;
  isLifetime: 0 | 1;
}

export function computePlanWindow(
  duration: PlanDuration,
  reference: number = nowSeconds()
): PlanComputation {
  if (duration === 'lifetime') {
    return { startedAt: reference, expiresAt: null, isLifetime: 1 };
  }
  return {
    startedAt: reference,
    expiresAt: reference + DURATION_SECONDS[duration],
    isLifetime: 0,
  };
}

// Returns the *effective* plan tier — degrades to free if the saved plan
// has expired and isn't lifetime.
export function effectivePlanTier(user: UserRow, ref: number = nowSeconds()): PlanTier {
  const tier = (user.plan_tier || 'free') as PlanTier;
  if (tier === 'free') return 'free';
  if (user.is_lifetime) return tier;
  if (user.plan_expires_at && user.plan_expires_at > ref) return tier;
  return 'free';
}

export function planLimitsFor(user: UserRow, ref: number = nowSeconds()): PlanLimits {
  return PLAN_LIMITS[effectivePlanTier(user, ref)];
}

export function isValidPlanTier(s: string): s is PlanTier {
  return s === 'free' || s === 'starter' || s === 'pro' || s === 'developer';
}

export function isValidPlanDuration(s: string): s is PlanDuration {
  return s === '1m' || s === '3m' || s === '6m' || s === '1y' || s === 'lifetime';
}

export function describeDuration(d: PlanDuration): string {
  switch (d) {
    case '1m':
      return '1 month';
    case '3m':
      return '3 months';
    case '6m':
      return '6 months';
    case '1y':
      return '1 year';
    case 'lifetime':
      return 'Lifetime';
  }
}

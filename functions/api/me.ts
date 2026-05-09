// GET /api/me — returns the signed-in user's profile, plan, usage snapshot.
// Lazy-creates a D1 user row on first hit.
import type { Env } from '../lib/types';
import { jsonResponse, unauthorized } from '../lib/respond';
import { verifyFirebaseAuthHeader } from '../lib/firebase';
import { ensureUserFromFirebase } from '../lib/d1';
import { snapshotUsage } from '../lib/quota';
import { effectivePlanTier, PLAN_LIMITS, isUnlimitedKeys } from '../lib/plans';
import { clientIp, userAgent } from '../lib/clientip';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const claims = await verifyFirebaseAuthHeader(env, request);
  if (!claims) return unauthorized('firebase_token_required', request, env);

  const user = await ensureUserFromFirebase(env, {
    firebase_uid: claims.sub,
    email: claims.email || null,
    display_name: claims.name || null,
    last_ip: clientIp(request),
    last_ua: userAgent(request),
  });

  const usage = await snapshotUsage(env, user);
  const tier = effectivePlanTier(user);
  const limits = PLAN_LIMITS[tier];
  // Serialise an "unlimited" key cap as `null` so the dashboard renders
  // "Unlimited" instead of a literal sentinel number.
  const maxActiveKeys = isUnlimitedKeys(limits.maxActiveKeys) ? null : limits.maxActiveKeys;

  return jsonResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: !!user.is_admin,
        is_blocked: !!user.is_blocked,
        created_at: user.created_at,
      },
      plan: {
        tier,
        is_lifetime: !!user.is_lifetime,
        started_at: user.plan_started_at,
        expires_at: user.plan_expires_at,
        // Snake_case is the canonical shape the dashboard reads. CamelCase
        // aliases stay around for any older clients still pinned to them.
        limits: {
          // ── Burst protection (requests per minute) ────────────
          perMinute: limits.perMinute,
          requests_per_minute: limits.perMinute,
          // ── Daily credit budget ───────────────────────────────
          credits_per_day: limits.creditsPerDay,
          creditsPerDay: limits.creditsPerDay,
          // ── Active key cap ────────────────────────────────────
          max_active_keys: maxActiveKeys,
        },
      },
      usage: {
        minute: usage.minute,
        credits_today: usage.creditsToday,
        credits_remaining: Math.max(0, usage.limits.creditsPerDay - usage.creditsToday),
        resets_at: usage.resetsAt,
        limits: {
          perMinute: usage.limits.perMinute,
          credits_per_day: usage.limits.creditsPerDay,
        },
      },
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

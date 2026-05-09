// GET /api/credits/pricing — public endpoint exposing the credit pricing
// table so the dashboard, /docs, and /models can render the same numbers
// without bundling lib/credits.ts client-side.
//
// No auth required — pricing is documentation, not a secret.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { pricingSnapshot } from '../../lib/credits';
import { PLAN_LIMITS } from '../../lib/plans';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const snap = pricingSnapshot();
  return jsonResponse(
    {
      ...snap,
      plans: {
        free: {
          credits_per_day: PLAN_LIMITS.free.creditsPerDay,
          per_minute: PLAN_LIMITS.free.perMinute,
          max_active_keys: PLAN_LIMITS.free.maxActiveKeys,
        },
        starter: {
          credits_per_day: PLAN_LIMITS.starter.creditsPerDay,
          per_minute: PLAN_LIMITS.starter.perMinute,
          max_active_keys: PLAN_LIMITS.starter.maxActiveKeys,
        },
        pro: {
          credits_per_day: PLAN_LIMITS.pro.creditsPerDay,
          per_minute: PLAN_LIMITS.pro.perMinute,
          max_active_keys: PLAN_LIMITS.pro.maxActiveKeys,
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

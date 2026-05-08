// POST /api/admin/users/:id/plan — change a user's plan tier with a duration.
// Body: { tier: 'free'|'starter'|'pro'|'developer', duration: '1m'|'3m'|'6m'|'1y'|'lifetime', note?: string }
import type { Env, PlanTier, PlanDuration } from '../../../../lib/types';
import { jsonResponse, badRequest, notFound } from '../../../../lib/respond';
import { requireAdmin } from '../../../../lib/admin';
import { getUserById } from '../../../../lib/d1';
import { computePlanWindow, isValidPlanDuration, isValidPlanTier } from '../../../../lib/plans';
import { newId, nowSeconds } from '../../../../lib/ids';
import { clientIp } from '../../../../lib/clientip';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const id = String(params.id || '');

  let body: { tier?: string; duration?: string; note?: string } = {};
  try {
    body = (await request.json()) as { tier?: string; duration?: string; note?: string };
  } catch {
    return badRequest('invalid_json', request, env);
  }
  const tier = (body.tier || '').trim();
  const duration = (body.duration || '').trim();
  const note = body.note ? String(body.note).slice(0, 500) : null;
  if (!isValidPlanTier(tier)) return badRequest('bad_tier', request, env);
  if (!isValidPlanDuration(duration)) return badRequest('bad_duration', request, env);

  const user = await getUserById(env, id);
  if (!user) return notFound('user_not_found', request, env);

  const now = nowSeconds();
  let plan: { startedAt: number | null; expiresAt: number | null; isLifetime: 0 | 1 } = {
    startedAt: now,
    expiresAt: null,
    isLifetime: 0,
  };
  if (tier === 'free') {
    plan = { startedAt: null, expiresAt: null, isLifetime: 0 };
  } else {
    const w = computePlanWindow(duration as PlanDuration, now);
    plan = { startedAt: w.startedAt, expiresAt: w.expiresAt, isLifetime: w.isLifetime };
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE users
         SET plan_tier = ?1,
             plan_started_at = ?2,
             plan_expires_at = ?3,
             is_lifetime = ?4
       WHERE id = ?5`
    ).bind(tier, plan.startedAt, plan.expiresAt, plan.isLifetime, user.id),
    env.DB.prepare(
      `INSERT INTO plan_changes
         (id, user_id, from_tier, to_tier, duration, expires_at, changed_by, changed_ip, note, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    ).bind(
      newId(),
      user.id,
      user.plan_tier,
      tier as PlanTier,
      duration as PlanDuration,
      plan.expiresAt,
      'admin',
      clientIp(request),
      note,
      now
    ),
  ]);

  return jsonResponse(
    {
      ok: true,
      user_id: user.id,
      plan: {
        tier,
        duration,
        started_at: plan.startedAt,
        expires_at: plan.expiresAt,
        is_lifetime: !!plan.isLifetime,
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

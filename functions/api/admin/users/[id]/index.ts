// GET    /api/admin/users/:id — full user detail (keys, usage, ip log, recent calls)
// DELETE /api/admin/users/:id — delete the user (cascades to keys/usage/logs)
import type { Env, UserRow, ApiKeyRow } from '../../../../lib/types';
import { jsonResponse, notFound } from '../../../../lib/respond';
import { requireAdmin } from '../../../../lib/admin';
import { getUserById } from '../../../../lib/d1';
import { effectivePlanTier, planLimitsFor } from '../../../../lib/plans';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const id = String(params.id || '');

  const user = await getUserById(env, id);
  if (!user) return notFound('user_not_found', request, env);

  const [keysRes, usageRes, ipsRes, logsRes, planRes] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM api_keys WHERE user_id = ?1 ORDER BY created_at DESC`
    )
      .bind(user.id)
      .all<ApiKeyRow>(),
    env.DB.prepare(
      `SELECT day, SUM(requests) AS requests, SUM(successes) AS successes, SUM(errors) AS errors
         FROM daily_usage WHERE user_id = ?1
         GROUP BY day ORDER BY day DESC LIMIT 60`
    )
      .bind(user.id)
      .all<{ day: number; requests: number; successes: number; errors: number }>(),
    env.DB.prepare(
      `SELECT id, ip, ua, reason, created_at FROM ip_log
         WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 200`
    )
      .bind(user.id)
      .all<{ id: string; ip: string; ua: string | null; reason: string; created_at: number }>(),
    env.DB.prepare(
      `SELECT id, route, status, model, ip, ua, created_at FROM request_logs
         WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 200`
    )
      .bind(user.id)
      .all<{
        id: string;
        route: string;
        status: number;
        model: string | null;
        ip: string | null;
        ua: string | null;
        created_at: number;
      }>(),
    env.DB.prepare(
      `SELECT id, from_tier, to_tier, duration, expires_at, changed_by, changed_ip, note, created_at
         FROM plan_changes WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50`
    )
      .bind(user.id)
      .all<{
        id: string;
        from_tier: string;
        to_tier: string;
        duration: string;
        expires_at: number | null;
        changed_by: string;
        changed_ip: string | null;
        note: string | null;
        created_at: number;
      }>(),
  ]);

  const tier = effectivePlanTier(user);
  const limits = planLimitsFor(user);

  return jsonResponse(
    {
      user: shapeUser(user, tier),
      plan: { tier, limits, history: planRes.results || [] },
      keys: (keysRes.results || []).map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.key_prefix,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
        revoked_at: k.revoked_at,
        is_active: k.revoked_at == null,
      })),
      usage: usageRes.results || [],
      ip_log: ipsRes.results || [],
      recent_calls: logsRes.results || [],
    },
    {},
    request,
    env
  );
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const id = String(params.id || '');
  const res = await env.DB.prepare(`DELETE FROM users WHERE id = ?1`).bind(id).run();
  if (!res.meta?.changes) return notFound('user_not_found', request, env);
  return jsonResponse({ ok: true }, {}, request, env);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

function shapeUser(u: UserRow, tier: string) {
  return {
    id: u.id,
    firebase_uid: u.firebase_uid,
    email: u.email,
    display_name: u.display_name,
    plan_tier: u.plan_tier,
    effective_tier: tier,
    is_lifetime: !!u.is_lifetime,
    plan_started_at: u.plan_started_at,
    plan_expires_at: u.plan_expires_at,
    is_admin: !!u.is_admin,
    is_blocked: !!u.is_blocked,
    created_at: u.created_at,
    last_seen_at: u.last_seen_at,
    last_ip: u.last_ip,
    last_ua: u.last_ua,
  };
}

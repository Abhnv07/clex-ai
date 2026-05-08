// GET /api/admin/stats — high-level dashboard counters.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { requireAdmin } from '../../lib/admin';
import { nowSeconds, utcDayStamp } from '../../lib/ids';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const now = nowSeconds();
  const today = utcDayStamp(now);
  const since30 = utcDayStamp(now - 60 * 60 * 24 * 29);

  const [
    usersTotal,
    activeKeys,
    plansBreakdown,
    todayCalls,
    last30,
    recentSignups,
    recentAdminLogins,
  ] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE revoked_at IS NULL`).first<{
      n: number;
    }>(),
    env.DB.prepare(
      `SELECT plan_tier AS tier, COUNT(*) AS n FROM users GROUP BY plan_tier`
    ).all<{ tier: string; n: number }>(),
    env.DB.prepare(
      `SELECT SUM(requests) AS r, SUM(successes) AS s, SUM(errors) AS e
         FROM daily_usage WHERE day = ?1`
    )
      .bind(today)
      .first<{ r: number | null; s: number | null; e: number | null }>(),
    env.DB.prepare(
      `SELECT day, SUM(requests) AS requests, SUM(successes) AS successes, SUM(errors) AS errors
         FROM daily_usage WHERE day >= ?1 GROUP BY day ORDER BY day ASC`
    )
      .bind(since30)
      .all<{ day: number; requests: number; successes: number; errors: number }>(),
    env.DB.prepare(
      `SELECT id, email, display_name, plan_tier, created_at FROM users
         ORDER BY created_at DESC LIMIT 10`
    ).all<{
      id: string;
      email: string | null;
      display_name: string | null;
      plan_tier: string;
      created_at: number;
    }>(),
    env.DB.prepare(
      `SELECT id, method, result, reason, ip, ua, created_at FROM admin_login_events
         ORDER BY created_at DESC LIMIT 10`
    ).all<{
      id: string;
      method: string;
      result: string;
      reason: string | null;
      ip: string | null;
      ua: string | null;
      created_at: number;
    }>(),
  ]);

  return jsonResponse(
    {
      generated_at: now,
      users: { total: usersTotal?.n || 0 },
      keys: { active: activeKeys?.n || 0 },
      plans: plansBreakdown.results || [],
      today: {
        day: today,
        requests: todayCalls?.r || 0,
        successes: todayCalls?.s || 0,
        errors: todayCalls?.e || 0,
      },
      last_30: last30.results || [],
      recent_signups: recentSignups.results || [],
      recent_admin_logins: recentAdminLogins.results || [],
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

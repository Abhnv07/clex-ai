// GET /api/admin/users — list users with pagination + plan filter.
import type { Env, UserRow } from '../../../lib/types';
import { jsonResponse } from '../../../lib/respond';
import { requireAdmin } from '../../../lib/admin';
import { effectivePlanTier } from '../../../lib/plans';
import { isValidPlanTier } from '../../../lib/plans';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
  const q = (url.searchParams.get('q') || '').trim();
  const planFilter = (url.searchParams.get('plan') || '').trim();
  const orderRaw = (url.searchParams.get('order') || 'created_at').trim();
  const dirRaw = (url.searchParams.get('dir') || 'desc').toLowerCase();

  const allowedOrder: Record<string, string> = {
    created_at: 'created_at',
    last_seen_at: 'last_seen_at',
    plan_tier: 'plan_tier',
    email: 'email',
  };
  const orderCol = allowedOrder[orderRaw] || 'created_at';
  const dir = dirRaw === 'asc' ? 'ASC' : 'DESC';

  const params: unknown[] = [];
  let where = '';
  if (q) {
    where += ` WHERE (email LIKE ?1 OR display_name LIKE ?1 OR firebase_uid LIKE ?1 OR id LIKE ?1)`;
    params.push(`%${q}%`);
  }
  if (planFilter && isValidPlanTier(planFilter)) {
    where += where ? ' AND plan_tier = ?' + (params.length + 1) : ' WHERE plan_tier = ?1';
    params.push(planFilter);
  }

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM users${where}`
  )
    .bind(...params)
    .first<{ n: number }>();
  const total = totalRow?.n || 0;

  const userRowsRes = await env.DB.prepare(
    `SELECT * FROM users${where}
       ORDER BY ${orderCol} ${dir}
       LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`
  )
    .bind(...params, limit, offset)
    .all<UserRow>();

  const users = (userRowsRes.results || []).map((u) => {
    const tier = effectivePlanTier(u);
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
  });

  return jsonResponse({ total, limit, offset, users }, {}, request, env);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

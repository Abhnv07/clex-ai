// GET /api/admin/feeds — recent activity feed: key creations, api calls, ip log.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { requireAdmin } from '../../lib/admin';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const [keyCreations, apiCalls, ipLog] = await Promise.all([
    env.DB.prepare(
      `SELECT k.id, k.user_id, u.email, u.display_name, k.name, k.key_prefix,
              k.created_at, k.last_used_at, k.revoked_at
         FROM api_keys k
         LEFT JOIN users u ON u.id = k.user_id
         ORDER BY k.created_at DESC LIMIT ?1`
    )
      .bind(limit)
      .all<{
        id: string;
        user_id: string;
        email: string | null;
        display_name: string | null;
        name: string;
        key_prefix: string;
        created_at: number;
        last_used_at: number | null;
        revoked_at: number | null;
      }>(),
    env.DB.prepare(
      `SELECT r.id, r.user_id, u.email, u.display_name, r.api_key_id, r.route, r.status,
              r.model, r.ip, r.ua, r.created_at
         FROM request_logs r
         LEFT JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC LIMIT ?1`
    )
      .bind(limit)
      .all<{
        id: string;
        user_id: string | null;
        email: string | null;
        display_name: string | null;
        api_key_id: string | null;
        route: string;
        status: number;
        model: string | null;
        ip: string | null;
        ua: string | null;
        created_at: number;
      }>(),
    env.DB.prepare(
      `SELECT i.id, i.user_id, u.email, u.display_name, i.ip, i.ua, i.reason, i.created_at
         FROM ip_log i
         LEFT JOIN users u ON u.id = i.user_id
         ORDER BY i.created_at DESC LIMIT ?1`
    )
      .bind(limit)
      .all<{
        id: string;
        user_id: string;
        email: string | null;
        display_name: string | null;
        ip: string;
        ua: string | null;
        reason: string;
        created_at: number;
      }>(),
  ]);

  return jsonResponse(
    {
      key_creations: keyCreations.results || [],
      api_calls: apiCalls.results || [],
      ip_log: ipLog.results || [],
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

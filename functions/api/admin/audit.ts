// GET /api/admin/audit — admin login events (passkey + password) and plan changes.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { requireAdmin } from '../../lib/admin';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const [logins, planChanges] = await Promise.all([
    env.DB.prepare(
      `SELECT id, method, result, reason, ip, ua, passkey_id, created_at
         FROM admin_login_events ORDER BY created_at DESC LIMIT ?1`
    )
      .bind(limit)
      .all<{
        id: string;
        method: string;
        result: string;
        reason: string | null;
        ip: string | null;
        ua: string | null;
        passkey_id: string | null;
        created_at: number;
      }>(),
    env.DB.prepare(
      `SELECT pc.id, pc.user_id, u.email, u.display_name,
              pc.from_tier, pc.to_tier, pc.duration, pc.expires_at,
              pc.changed_by, pc.changed_ip, pc.note, pc.created_at
         FROM plan_changes pc
         LEFT JOIN users u ON u.id = pc.user_id
         ORDER BY pc.created_at DESC LIMIT ?1`
    )
      .bind(limit)
      .all<{
        id: string;
        user_id: string;
        email: string | null;
        display_name: string | null;
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

  const passwordEvents = (logins.results || []).filter((e) => e.method === 'password');
  const passkeyEvents = (logins.results || []).filter((e) => e.method === 'passkey');

  return jsonResponse(
    {
      password_log: passwordEvents,
      passkey_log: passkeyEvents,
      plan_changes: planChanges.results || [],
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

// GET /api/admin/me — returns the current admin session info.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { requireAdmin } from '../../lib/admin';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const { session } = guard;
  return jsonResponse(
    {
      session: {
        id: session.session_id,
        method: session.method,
        created_at: session.created_at,
        expires_at: session.expires_at,
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

// POST /api/admin/logout — invalidates the current admin session.
import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { endAdminSession, getSessionId, requireAdmin } from '../../lib/admin';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const sid = getSessionId(request);
  if (sid) await endAdminSession(env, sid);
  return jsonResponse({ ok: true }, {}, request, env);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

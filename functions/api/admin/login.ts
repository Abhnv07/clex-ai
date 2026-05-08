// POST /api/admin/login — password (admin secret) login.
// Returns { session_id } which the SPA stores in localStorage and sends
// back via X-Admin-Session for all subsequent /api/admin/* calls.
import type { Env } from '../../lib/types';
import { jsonResponse, badRequest, unauthorized } from '../../lib/respond';
import { startAdminSession, verifyAdminSecret } from '../../lib/admin';
import { logAdminLogin } from '../../lib/d1';
import { clientIp, userAgent } from '../../lib/clientip';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request);
  const ua = userAgent(request);
  let body: { secret?: string } = {};
  try {
    body = (await request.json()) as { secret?: string };
  } catch {
    return badRequest('invalid_json', request, env);
  }
  const secret = (body.secret || '').trim();
  if (!secret) return badRequest('secret_required', request, env);

  if (!verifyAdminSecret(env, secret)) {
    await logAdminLogin(env, {
      method: 'password',
      result: 'failure',
      reason: 'bad_secret',
      ip,
      ua,
      passkey_id: null,
    });
    return unauthorized('invalid_secret', request, env);
  }

  const session = await startAdminSession(env, 'password', ip, ua);
  await logAdminLogin(env, {
    method: 'password',
    result: 'success',
    reason: null,
    ip,
    ua,
    passkey_id: null,
  });

  return jsonResponse(
    {
      session_id: session.session_id,
      expires_at: session.expires_at,
      method: session.method,
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

// DELETE /api/keys/:id — revoke an api key (sets revoked_at).
import type { Env } from '../../lib/types';
import { jsonResponse, unauthorized, notFound } from '../../lib/respond';
import { verifyFirebaseAuthHeader } from '../../lib/firebase';
import { ensureUserFromFirebase, revokeApiKey } from '../../lib/d1';
import { clientIp, userAgent } from '../../lib/clientip';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const claims = await verifyFirebaseAuthHeader(env, request);
  if (!claims) return unauthorized('firebase_token_required', request, env);
  const id = String(params.id || '');

  const user = await ensureUserFromFirebase(env, {
    firebase_uid: claims.sub,
    email: claims.email || null,
    display_name: claims.name || null,
    last_ip: clientIp(request),
    last_ua: userAgent(request),
  });

  const ok = await revokeApiKey(env, user.id, id);
  if (!ok) return notFound('key_not_found', request, env);
  return jsonResponse({ ok: true }, {}, request, env);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

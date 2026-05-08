// GET  /api/keys     — list user's keys
// POST /api/keys     — create a new clex_xxx key (returned plaintext once)
import type { Env } from '../../lib/types';
import { jsonResponse, unauthorized, badRequest } from '../../lib/respond';
import { verifyFirebaseAuthHeader } from '../../lib/firebase';
import {
  ensureUserFromFirebase,
  listUserApiKeys,
  createApiKeyRow,
} from '../../lib/d1';
import { generateClexKey, sha256Hex } from '../../lib/crypto';
import { clientIp, userAgent } from '../../lib/clientip';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const claims = await verifyFirebaseAuthHeader(env, request);
  if (!claims) return unauthorized('firebase_token_required', request, env);

  const user = await ensureUserFromFirebase(env, {
    firebase_uid: claims.sub,
    email: claims.email || null,
    display_name: claims.name || null,
    last_ip: clientIp(request),
    last_ua: userAgent(request),
  });

  const keys = await listUserApiKeys(env, user.id);
  return jsonResponse(
    {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.key_prefix,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
        revoked_at: k.revoked_at,
        is_active: k.revoked_at == null,
      })),
    },
    {},
    request,
    env
  );
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const claims = await verifyFirebaseAuthHeader(env, request);
  if (!claims) return unauthorized('firebase_token_required', request, env);

  let body: { name?: string } = {};
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return badRequest('invalid_json', request, env);
  }
  const name = (body.name || '').trim();
  if (!name || name.length > 64) return badRequest('name_required_max_64', request, env);

  const user = await ensureUserFromFirebase(env, {
    firebase_uid: claims.sub,
    email: claims.email || null,
    display_name: claims.name || null,
    last_ip: clientIp(request),
    last_ua: userAgent(request),
  });

  const existing = await listUserApiKeys(env, user.id);
  const active = existing.filter((k) => k.revoked_at == null).length;
  if (active >= 10) {
    return badRequest('too_many_active_keys_max_10', request, env);
  }

  const { token, prefix } = generateClexKey();
  const hash = await sha256Hex(token);
  const row = await createApiKeyRow(env, user.id, name, hash, prefix);

  return jsonResponse(
    {
      // Returned ONCE in plaintext; the dashboard must show the user a
      // copy-now banner.
      key: token,
      record: {
        id: row.id,
        name: row.name,
        prefix: row.key_prefix,
        created_at: row.created_at,
        last_used_at: row.last_used_at,
        revoked_at: row.revoked_at,
        is_active: true,
      },
    },
    { status: 201 },
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

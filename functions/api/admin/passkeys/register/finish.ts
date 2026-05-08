// POST /api/admin/passkeys/register/finish — verify the attestation and store
// the new passkey.
import type { Env } from '../../../../lib/types';
import { jsonResponse, badRequest } from '../../../../lib/respond';
import { requireAdmin } from '../../../../lib/admin';
import { takeWebauthnChallenge } from '../../../../lib/kv';
import { rpOriginsFromEnv, verifyRegistration } from '../../../../lib/webauthn';
import { newId, nowSeconds } from '../../../../lib/ids';
import { clientIp } from '../../../../lib/clientip';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  let body: {
    handle?: string;
    label?: string;
    response?: {
      attestationObject?: string;
      clientDataJSON?: string;
      transports?: string[];
    };
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest('invalid_json', request, env);
  }
  const handle = (body.handle || '').trim();
  const attestationObject = body.response?.attestationObject || '';
  const clientDataJSON = body.response?.clientDataJSON || '';
  const transports = Array.isArray(body.response?.transports)
    ? (body.response?.transports as string[])
    : null;
  const label = (body.label || 'Admin passkey').slice(0, 80);
  if (!handle || !attestationObject || !clientDataJSON) {
    return badRequest('missing_fields', request, env);
  }

  const challenge = await takeWebauthnChallenge(env, handle);
  if (!challenge || challenge.purpose !== 'register') {
    return badRequest('challenge_not_found', request, env);
  }

  const rpId = env.WEBAUTHN_RP_ID || new URL(env.PUBLIC_APP_URL || 'https://ai.clex.in').hostname;
  const origins = rpOriginsFromEnv(rpId);

  let result;
  try {
    result = await verifyRegistration({
      attestationObjectB64: attestationObject,
      clientDataJsonB64: clientDataJSON,
      expectedChallenge: String(challenge.challenge),
      expectedRpId: rpId,
      expectedOrigins: origins,
    });
  } catch (e) {
    return badRequest(`webauthn_verification_failed:${(e as Error).message}`, request, env);
  }

  const id = newId();
  await env.DB.prepare(
    `INSERT INTO admin_passkeys
       (id, credential_id, public_key, counter, transports, label, created_at, created_ip)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      id,
      result.credentialId,
      result.publicKeyB64,
      result.signCount,
      transports ? JSON.stringify(transports) : null,
      label,
      nowSeconds(),
      clientIp(request)
    )
    .run();

  return jsonResponse(
    {
      ok: true,
      passkey: {
        id,
        label,
        credential_id: result.credentialId,
        alg: result.alg,
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

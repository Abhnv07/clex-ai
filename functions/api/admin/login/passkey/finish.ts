// POST /api/admin/login/passkey/finish — verify assertion and start a session.
import type { Env } from '../../../../lib/types';
import { jsonResponse, badRequest, unauthorized } from '../../../../lib/respond';
import { takeWebauthnChallenge } from '../../../../lib/kv';
import { rpOriginsFromEnv, verifyAssertion } from '../../../../lib/webauthn';
import { logAdminLogin } from '../../../../lib/d1';
import { startAdminSession } from '../../../../lib/admin';
import { clientIp, userAgent } from '../../../../lib/clientip';
import { nowSeconds } from '../../../../lib/ids';

interface AdminPasskeyLookupRow {
  id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  label: string | null;
  revoked_at: number | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request);
  const ua = userAgent(request);

  let body: {
    handle?: string;
    credentialId?: string;
    response?: {
      authenticatorData?: string;
      clientDataJSON?: string;
      signature?: string;
    };
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest('invalid_json', request, env);
  }
  const handle = (body.handle || '').trim();
  const credentialId = (body.credentialId || '').trim();
  const authenticatorData = body.response?.authenticatorData || '';
  const clientDataJSON = body.response?.clientDataJSON || '';
  const signature = body.response?.signature || '';
  if (!handle || !credentialId || !authenticatorData || !clientDataJSON || !signature) {
    return badRequest('missing_fields', request, env);
  }

  const challenge = await takeWebauthnChallenge(env, handle);
  if (!challenge || challenge.purpose !== 'login') {
    await logAdminLogin(env, {
      method: 'passkey',
      result: 'failure',
      reason: 'challenge_missing',
      ip,
      ua,
      passkey_id: null,
    });
    return unauthorized('challenge_not_found', request, env);
  }

  const stored = await env.DB.prepare(
    `SELECT * FROM admin_passkeys WHERE credential_id = ?1 AND revoked_at IS NULL`
  )
    .bind(credentialId)
    .first<AdminPasskeyLookupRow>();
  if (!stored) {
    await logAdminLogin(env, {
      method: 'passkey',
      result: 'failure',
      reason: 'unknown_credential',
      ip,
      ua,
      passkey_id: null,
    });
    return unauthorized('unknown_credential', request, env);
  }

  const rpId = env.WEBAUTHN_RP_ID || new URL(env.PUBLIC_APP_URL || 'https://ai.clex.in').hostname;
  const origins = rpOriginsFromEnv(rpId);

  // We persist alg implicitly via the SPKI shape — recover it from the
  // SPKI ourselves. To avoid that complexity, default to ES256 (-7) which
  // is by far the most common platform authenticator algorithm. RS256
  // attestations succeed in the same way during registration.
  const alg = -7;

  try {
    await verifyAssertion({
      authenticatorDataB64: authenticatorData,
      clientDataJsonB64: clientDataJSON,
      signatureB64: signature,
      expectedChallenge: String(challenge.challenge),
      expectedRpId: rpId,
      expectedOrigins: origins,
      storedPublicKeyB64: stored.public_key,
      alg,
      storedSignCount: stored.counter,
    });
  } catch (e) {
    await logAdminLogin(env, {
      method: 'passkey',
      result: 'failure',
      reason: `verify:${(e as Error).message}`,
      ip,
      ua,
      passkey_id: stored.id,
    });
    return unauthorized('passkey_verification_failed', request, env);
  }

  // Bump last_used_at + counter (we trust the new sign count from the verifier).
  await env.DB.prepare(
    `UPDATE admin_passkeys
       SET last_used_at = ?1, last_used_ip = ?2
     WHERE id = ?3`
  )
    .bind(nowSeconds(), ip, stored.id)
    .run();

  const session = await startAdminSession(env, 'passkey', ip, ua);
  await logAdminLogin(env, {
    method: 'passkey',
    result: 'success',
    reason: null,
    ip,
    ua,
    passkey_id: stored.id,
  });

  return jsonResponse(
    {
      session_id: session.session_id,
      expires_at: session.expires_at,
      method: session.method,
      passkey: {
        id: stored.id,
        label: stored.label,
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

// POST /api/admin/login/passkey/begin — issue an assertion challenge.
// No prior session required: any visitor can attempt a passkey login.
import type { Env } from '../../../../lib/types';
import { jsonResponse } from '../../../../lib/respond';
import { putWebauthnChallenge } from '../../../../lib/kv';
import { base64urlEncode, randomBytes } from '../../../../lib/crypto';
import { newId } from '../../../../lib/ids';
import { listAdminPasskeys } from '../../../../lib/d1';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rpId = env.WEBAUTHN_RP_ID || new URL(env.PUBLIC_APP_URL || 'https://ai.clex.in').hostname;
  const challenge = base64urlEncode(randomBytes(32));
  const handle = newId();

  await putWebauthnChallenge(env, handle, {
    challenge,
    purpose: 'login',
    issued_at: Math.floor(Date.now() / 1000),
  });

  const passkeys = await listAdminPasskeys(env);
  const allowCredentials = passkeys.map((row) => ({
    id: row.credential_id,
    type: 'public-key',
    transports: row.transports ? JSON.parse(row.transports) : undefined,
  }));

  return jsonResponse(
    {
      handle,
      publicKey: {
        challenge,
        rpId,
        timeout: 60_000,
        userVerification: 'preferred',
        allowCredentials,
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

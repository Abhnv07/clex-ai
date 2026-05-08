// POST /api/admin/passkeys/register/begin — issue a registration challenge.
// Caller must already hold a valid admin session (password login) so we
// don't let unauthenticated users enroll a passkey.
import type { Env } from '../../../../lib/types';
import { jsonResponse } from '../../../../lib/respond';
import { requireAdmin } from '../../../../lib/admin';
import { putWebauthnChallenge } from '../../../../lib/kv';
import { base64urlEncode, randomBytes } from '../../../../lib/crypto';
import { newId } from '../../../../lib/ids';
import { listAdminPasskeys } from '../../../../lib/d1';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const rpId = env.WEBAUTHN_RP_ID || new URL(env.PUBLIC_APP_URL || 'https://ai.clex.in').hostname;
  const rpName = env.WEBAUTHN_RP_NAME || 'Clex AI Admin';

  const challenge = base64urlEncode(randomBytes(32));
  const handle = newId();

  // We use a fixed user identifier (the admin is a single principal). The
  // user.id is a stable random string we generate once per challenge but
  // tie all passkeys to the same logical user.
  const userId = 'admin';

  await putWebauthnChallenge(env, handle, {
    challenge,
    purpose: 'register',
    issued_at: Math.floor(Date.now() / 1000),
  });

  const existing = await listAdminPasskeys(env);
  const excludeCredentials = existing.map((row) => ({
    id: row.credential_id,
    type: 'public-key',
    transports: row.transports ? JSON.parse(row.transports) : undefined,
  }));

  return jsonResponse(
    {
      handle,
      publicKey: {
        rp: { id: rpId, name: rpName },
        user: {
          id: base64urlEncode(new TextEncoder().encode(userId)),
          name: 'admin@clex.ai',
          displayName: 'Clex AI Admin',
        },
        challenge,
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60_000,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        attestation: 'none',
        excludeCredentials,
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

// GET /api/admin/passkeys — list registered admin passkeys.
import type { Env } from '../../../lib/types';
import { jsonResponse } from '../../../lib/respond';
import { requireAdmin } from '../../../lib/admin';
import { listAdminPasskeys } from '../../../lib/d1';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;

  const passkeys = await listAdminPasskeys(env);
  return jsonResponse(
    {
      passkeys: passkeys.map((p) => ({
        id: p.id,
        label: p.label,
        credential_id: p.credential_id,
        created_at: p.created_at,
        created_ip: p.created_ip,
        last_used_at: p.last_used_at,
        last_used_ip: p.last_used_ip,
      })),
    },
    {},
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

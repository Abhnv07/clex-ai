// DELETE /api/admin/passkeys/:id — revoke an admin passkey (soft delete).
import type { Env } from '../../../lib/types';
import { jsonResponse, notFound } from '../../../lib/respond';
import { requireAdmin } from '../../../lib/admin';
import { nowSeconds } from '../../../lib/ids';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = await requireAdmin(env, request);
  if ('error' in guard) return guard.error;
  const id = String(params.id || '');
  const res = await env.DB.prepare(
    `UPDATE admin_passkeys SET revoked_at = ?1 WHERE id = ?2 AND revoked_at IS NULL`
  )
    .bind(nowSeconds(), id)
    .run();
  if (!res.meta?.changes) return notFound('passkey_not_found', request, env);
  return jsonResponse({ ok: true }, {}, request, env);
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

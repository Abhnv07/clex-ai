// Public health check. Cached briefly so probes don't hammer the runtime.
import type { Env } from '../lib/types';
import { jsonResponse } from '../lib/respond';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse(
    {
      ok: true,
      service: 'clex-ai',
      ts: Math.floor(Date.now() / 1000),
      version: env.APP_ENV || 'production',
    },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=30' } },
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

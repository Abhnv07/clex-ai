// POST /api/chat — OpenAI-compatible proxy with quota enforcement.
//
// Auth: Authorization: Bearer clex_xxx (or X-Clex-Api-Key header).
// Quota: per-minute + per-day limits enforced by plan tier.
// Upstream: NVIDIA integrate.api.nvidia.com using the shared CLEX_API_KEY
// secret. End users never see the upstream key.
import type { Env } from '../lib/types';
import { jsonResponse, unauthorized, badRequest, rateLimited, serverError } from '../lib/respond';
import { lookupApiKey, bumpApiKeyUsage, logRequest, logIp } from '../lib/d1';
import { checkAndBumpMinute, commitDailyCredits } from '../lib/quota';
import { creditCostFor } from '../lib/credits';
import { clientIp, userAgent } from '../lib/clientip';

interface ChatBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

function extractClexKey(req: Request): string | null {
  const explicit = req.headers.get('x-clex-api-key');
  if (explicit && explicit.startsWith('clex_')) return explicit.trim();
  const auth = req.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(clex_\S+)$/i);
  return match ? match[1] : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request);
  const ua = userAgent(request);

  const tokenStr = extractClexKey(request);
  if (!tokenStr) {
    return unauthorized(
      'Missing clex API key. Provide Authorization: Bearer clex_xxx or X-Clex-Api-Key header.',
      request,
      env
    );
  }

  const looked = await lookupApiKey(env, tokenStr);
  if (!looked) {
    return unauthorized('invalid_api_key', request, env);
  }
  if (looked.user.is_blocked) {
    return unauthorized('account_blocked', request, env);
  }

  // We need the model id BEFORE the quota check so we can charge the right
  // credit cost. Parse the body once.
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return badRequest('invalid_json', request, env);
  }
  if (!body.model || typeof body.model !== 'string') {
    return badRequest('model_required', request, env);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return badRequest('messages_required', request, env);
  }

  const cost = creditCostFor(body.model);

  // Plan-aware quota check (also bumps the per-minute counter). The daily
  // credit counter is NOT bumped here — we only charge credits if the
  // upstream call returns 2xx (see commitDailyCredits below).
  const decision = await checkAndBumpMinute(env, looked.user, looked.key, cost);
  if (!decision.allowed) {
    const remaining = decision.limits.creditsPerDay - decision.used.creditsToday;
    return rateLimited(
      decision.reason === 'rate_limited_minute'
        ? `Rate limit: max ${decision.limits.perMinute} req/min on ${decision.tier}. Try again in ${decision.retryAfterSeconds}s.`
        : decision.reason === 'rate_limited_credits'
          ? `Daily credit cap reached on ${decision.tier}: ${decision.used.creditsToday}/${decision.limits.creditsPerDay} used, this call costs ${cost} credit${cost === 1 ? '' : 's'} (${Math.max(0, remaining)} remaining). Resets at 00:00 UTC.`
          : decision.reason || 'rate_limited',
      decision.retryAfterSeconds,
      request,
      env
    );
  }

  const upstream = env.NVIDIA_UPSTREAM_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const upstreamKey = env.CLEX_API_KEY;
  if (!upstreamKey) {
    return serverError(
      'Clex AI is not fully configured: the upstream NVIDIA API key (CLEX_API_KEY) is missing. ' +
        'Set it with `wrangler pages secret put CLEX_API_KEY --project-name clex-ai` and redeploy.',
      request,
      env
    );
  }

  const shouldStream = body.stream !== false;

  const upstreamRes = await fetch(upstream, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${upstreamKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1024,
      top_p: body.top_p ?? 0.9,
      stream: shouldStream,
    }),
  });

  // Log + bump counters once we know the upstream status. Credits are only
  // charged on success so a 5xx upstream blip doesn't drain the user's day.
  const status = upstreamRes.status;
  const succeeded = status >= 200 && status < 400;
  await Promise.all([
    bumpApiKeyUsage(env, looked.key.id, looked.user.id, status),
    logRequest(env, {
      user_id: looked.user.id,
      api_key_id: looked.key.id,
      route: '/api/chat',
      status,
      model: body.model,
      ip,
      ua,
    }),
    logIp(env, { user_id: looked.user.id, ip, ua, reason: 'api_call' }),
    succeeded
      ? commitDailyCredits(env, looked.user, looked.key, cost)
      : Promise.resolve(0),
  ]);

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text();
    let msg = errText;
    try {
      const parsed = JSON.parse(errText);
      msg = parsed.detail || parsed.error?.message || parsed.message || errText;
    } catch {
      // keep raw
    }
    return jsonResponse(
      { error: `Upstream provider error (${status}): ${msg}` },
      { status },
      request,
      env
    );
  }

  // Pass through (streaming or JSON) preserving the upstream content type.
  const headers = new Headers();
  const ct = upstreamRes.headers.get('content-type');
  if (ct) headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Clex-Plan', decision.tier);
  headers.set('X-Clex-Cost', String(cost));
  headers.set('X-Clex-Remaining-Minute', String(decision.remaining.minute));
  headers.set(
    'X-Clex-Credits-Remaining',
    String(Math.max(0, decision.limits.creditsPerDay - decision.used.creditsToday - (succeeded ? cost : 0)))
  );
  headers.set('X-Clex-Credits-Per-Day', String(decision.limits.creditsPerDay));

  return new Response(upstreamRes.body, { status, headers });
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};

// GET /api/usage — last-30-day request counts per day for the signed-in user.
import type { Env } from '../lib/types';
import { jsonResponse, unauthorized } from '../lib/respond';
import { verifyFirebaseAuthHeader } from '../lib/firebase';
import { ensureUserFromFirebase } from '../lib/d1';
import { clientIp, userAgent } from '../lib/clientip';
import { snapshotUsage } from '../lib/quota';
import { utcDayStamp, nowSeconds } from '../lib/ids';

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

  const since = utcDayStamp(nowSeconds() - 60 * 60 * 24 * 29);
  const daily = await env.DB.prepare(
    `SELECT day, SUM(requests) AS requests, SUM(successes) AS successes,
            SUM(errors) AS errors
       FROM daily_usage
      WHERE user_id = ?1 AND day >= ?2
      GROUP BY day
      ORDER BY day ASC`
  )
    .bind(user.id, since)
    .all<{ day: number; requests: number; successes: number; errors: number }>();

  const usage = await snapshotUsage(env, user);
  return jsonResponse(
    {
      today: utcDayStamp(),
      daily: daily.results || [],
      live: {
        minute: usage.minute,
        credits_today: usage.creditsToday,
        credits_remaining: Math.max(0, usage.limits.creditsPerDay - usage.creditsToday),
        credits_per_day: usage.limits.creditsPerDay,
        per_minute: usage.limits.perMinute,
        resets_at: usage.resetsAt,
        limits: usage.limits,
        tier: usage.tier,
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

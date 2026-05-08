// ═══════════════════════════════════════════════════════════════════════════
// Client IP / UA helpers. Cloudflare always sets `cf-connecting-ip`; the
// other headers are fallbacks for local `wrangler pages dev`.
// ═══════════════════════════════════════════════════════════════════════════

export function clientIp(req: Request): string | null {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    null
  );
}

export function userAgent(req: Request): string | null {
  const ua = req.headers.get('user-agent');
  if (!ua) return null;
  // Cap so we never blow up the DB on a pathological UA.
  return ua.length > 512 ? ua.slice(0, 512) : ua;
}

// ═══════════════════════════════════════════════════════════════════════════
// ID generation. Uses native crypto.randomUUID() in the Workers runtime.
// ═══════════════════════════════════════════════════════════════════════════

export function newId(): string {
  return crypto.randomUUID();
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function utcDayStamp(epochSeconds: number = nowSeconds()): number {
  // Returns yyyymmdd as INTEGER (e.g. 20260508).
  const d = new Date(epochSeconds * 1000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function minuteFloor(epochSeconds: number = nowSeconds()): number {
  return Math.floor(epochSeconds / 60);
}

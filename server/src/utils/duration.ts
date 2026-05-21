/**
 * Minimal ms-style duration parser used for JWT TTL strings.
 * Supports: number (ms), '<n>s', '<n>m', '<n>h', '<n>d'.
 */
export function parseDuration(value: string | number): number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(trimmed);
  if (!m) throw new Error(`Invalid duration: "${value}"`);
  const n = Number(m[1]);
  const unit = (m[2] ?? 'ms').toLowerCase();
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (mult[unit] ?? 1);
}

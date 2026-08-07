/** Normalize degrees into [0, 360). */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Recharts polar angles: 0° at +x (3 o’clock), increasing counterclockwise
 * in screen space (y down).
 */
export function cellAngleDeg(cx: number, cy: number, mx: number, my: number): number {
  return (Math.atan2(cy - my, mx - cx) * 180) / Math.PI;
}

/** Whether `angle` lies in [start, end) on the circle (handles wrap). */
export function angleInSector(angle: number, start: number, end: number): boolean {
  const span = end - start;
  if (!Number.isFinite(span) || Math.abs(span) < 1e-9) return false;
  if (Math.abs(Math.abs(span) - 360) < 1e-6 || Math.abs(span) > 360 - 1e-6) return true;

  const a = normalizeDeg(angle);
  const s = normalizeDeg(start);
  const e = normalizeDeg(end);
  if (s < e) return a >= s && a < e;
  // Wrapped (e.g. 350 → 20).
  return a >= s || a < e;
}

export function resolveRadius(
  value: number | string | undefined,
  maxRadius: number,
  fallback: number,
): number {
  if (value == null) return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed);
    if (!Number.isFinite(pct)) return fallback;
    return Math.max(0, (pct / 100) * maxRadius);
  }
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

export function resolveCenter(
  value: number | string | undefined,
  plotOrigin: number,
  plotSize: number,
  fallbackFraction = 0.5,
): number {
  if (value == null) return plotOrigin + plotSize * fallbackFraction;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : plotOrigin + plotSize * fallbackFraction;
  }
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const pct = Number.parseFloat(trimmed);
    if (!Number.isFinite(pct)) return plotOrigin + plotSize * fallbackFraction;
    return plotOrigin + (pct / 100) * plotSize;
  }
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : plotOrigin + plotSize * fallbackFraction;
}

import type { DataKey } from '../types';

/**
 * Stable color / legend order for composed charts: areas → bars → lines.
 * First occurrence wins when a key appears in more than one partition.
 */
export function composeSeriesKeys<T>(
  areas: readonly DataKey<T>[] | undefined,
  bars: readonly DataKey<T>[] | undefined,
  lines: readonly DataKey<T>[] | undefined,
): DataKey<T>[] {
  const seen = new Set<string>();
  const out: DataKey<T>[] = [];
  for (const key of [...(areas ?? []), ...(bars ?? []), ...(lines ?? [])]) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Map global base colors onto a partition’s key list. */
export function colorsForKeys(
  allKeys: readonly string[],
  baseColors: readonly string[],
  keys: readonly string[],
): string[] {
  return keys.map((key) => {
    const i = allKeys.indexOf(key);
    return (i >= 0 ? baseColors[i] : undefined) ?? '#888888';
  });
}

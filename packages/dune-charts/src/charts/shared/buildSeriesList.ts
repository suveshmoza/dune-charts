import type { DataKey, DuneSeriesConfig } from '../../types';
import { bandsFromColor, type PixelWaveBands, type PixelWaveSeries } from './pixelWaveEngine';

type SeriesStackProps = { stackId?: string | number };
type ChartStackProps = { stackOffset?: string };

/**
 * Build pixel-wave series from chart data, including stacked bases/tops
 * and optional 100% expand stacking.
 */
export function buildSeriesList<T extends Record<string, unknown>>(
  data: readonly T[],
  categories: readonly DataKey<T>[],
  config: Partial<Record<DataKey<T>, DuneSeriesConfig>> | undefined,
  baseColors: readonly string[],
  seriesProps: Partial<Record<DataKey<T>, SeriesStackProps>> | undefined,
  chartProps: ChartStackProps | undefined,
): PixelWaveSeries[] {
  const expand = chartProps?.stackOffset === 'expand';
  const stackIds = categories.map((key) => seriesProps?.[key]?.stackId);
  const isStacked = stackIds.some((id) => id != null);

  const stackKey = (index: number): string => {
    const raw = stackIds[index];
    // StackId is string | number at the type level; guard at runtime anyway.
    if (typeof raw === 'string' || typeof raw === 'number') {
      return String(raw);
    }
    return String(index);
  };

  const rawByCategory = categories.map((key) =>
    data.map((row) => {
      const n = Number(row[key]);
      return Number.isFinite(n) ? n : 0;
    }),
  );

  const pointCount = data.length;
  const stackedTops: number[][] = categories.map(() => Array.from({ length: pointCount }, () => 0));
  const stackedBases: number[][] = categories.map(() =>
    Array.from({ length: pointCount }, () => 0),
  );

  if (isStacked) {
    for (let i = 0; i < pointCount; i += 1) {
      const totalsByStack = new Map<string, number>();
      for (let s = 0; s < categories.length; s += 1) {
        const id = stackKey(s);
        totalsByStack.set(id, (totalsByStack.get(id) ?? 0) + (rawByCategory[s]?.[i] ?? 0));
      }

      const runningByStack = new Map<string, number>();
      for (let s = 0; s < categories.length; s += 1) {
        const id = stackKey(s);
        const raw = rawByCategory[s]?.[i] ?? 0;
        const total = totalsByStack.get(id) ?? 0;
        const portion = expand ? (total > 0 ? raw / total : 0) : raw;
        const base = runningByStack.get(id) ?? 0;
        const top = base + portion;
        const basesRow = stackedBases[s];
        const topsRow = stackedTops[s];
        if (basesRow) basesRow[i] = base;
        if (topsRow) topsRow[i] = top;
        runningByStack.set(id, top);
      }
    }
  }

  return categories.map((key, i) => {
    const entry = config?.[key];
    const bands: PixelWaveBands =
      entry?.bands ??
      (baseColors[i]
        ? bandsFromColor(baseColors[i] ?? '#888888')
        : bandsFromColor(entry?.color ?? '#888888'));

    return {
      name: entry?.label ?? key,
      values: isStacked ? (stackedTops[i] ?? []) : (rawByCategory[i] ?? []),
      bases: isStacked ? (stackedBases[i] ?? []) : undefined,
      bands,
      stackId: isStacked ? stackKey(i) : undefined,
      stackIndex: isStacked ? i : undefined,
    };
  });
}

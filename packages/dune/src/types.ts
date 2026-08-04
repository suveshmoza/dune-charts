import type { ReactNode } from 'react';

import type { PixelWaveBands, PixelWaveFill } from './charts/pixelWaveEngine';
import type { DuneChartSize } from './primitives/DuneChartContainer';
import type { DuneGrain } from './provider/duneGrain';

export type DataKey<T> = Extract<keyof T, string>;

export type DuneSeriesConfig = {
  label?: string;
  /** Base series color (same as Recharts Area stroke). Bands derive from its hue. */
  color?: string;
  /** Optional explicit 5-stop crest→depth override (dark → brighter). */
  bands?: PixelWaveBands;
};

export type DuneCartesianChartProps<T> = {
  data: readonly T[];
  categories: readonly DataKey<T>[];
  index: DataKey<T>;
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
  grain?: DuneGrain;
  /** Pixel-wave fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
  /** Cell size in CSS pixels (default 4). Clamped to ≥ 1. */
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  // Escape hatches — tighten to Recharts prop types later
  chartProps?: Record<string, unknown>;
  seriesProps?: Partial<Record<DataKey<T>, Record<string, unknown>>>;
  xAxisProps?: Record<string, unknown>;
  yAxisProps?: Record<string, unknown>;
  tooltipProps?: Record<string, unknown>;
  legendProps?: Record<string, unknown>;
  children?: ReactNode;
};

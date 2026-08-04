import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { AreaProps, LegendProps, TooltipProps, XAxisProps, YAxisProps } from 'recharts';

import type { PixelWaveBands, PixelWaveFill } from './charts/pixelWaveEngine';
import type { DuneChartSize } from './primitives/DuneChartContainer';

export type DataKey<T> = Extract<keyof T, string>;

export type DuneSeriesConfig = {
  label?: string;
  /** Base series color (same as Recharts Area stroke). Bands derive from its hue. */
  color?: string;
  /** Optional explicit 5-stop crest→depth override (dark → brighter). */
  bands?: PixelWaveBands;
};

type RechartsAreaChart = typeof import('recharts').AreaChart;

/** Pass-through AreaChart props; Dune owns `data` / `children`. */
export type DuneAreaChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsAreaChart>,
  'data' | 'children'
>;

/** Pass-through Area props; Dune owns `dataKey` / `data` / `name`. */
export type DuneAreaSeriesPassThrough = Omit<
  AreaProps<unknown, unknown>,
  'dataKey' | 'data' | 'name'
>;

export type DuneCartesianChartProps<T> = {
  data: readonly T[];
  categories: readonly DataKey<T>[];
  index: DataKey<T>;
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
  /** Pixel-wave fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
  /** Cell size in CSS pixels (default 4). Clamped to ≥ 1. */
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  /** Extra props spread onto the underlying Recharts `AreaChart`. */
  chartProps?: DuneAreaChartPassThrough;
  /** Per-series props spread onto each Recharts `Area` (e.g. `stackId`). */
  seriesProps?: Partial<Record<DataKey<T>, DuneAreaSeriesPassThrough>>;
  /** Extra props for the index `XAxis` (`dataKey` is owned by Dune). */
  xAxisProps?: Omit<XAxisProps<unknown, unknown>, 'dataKey'>;
  yAxisProps?: YAxisProps<unknown, unknown>;
  /** Extra tooltip props; Dune keeps the custom `content` renderer. */
  tooltipProps?: Omit<TooltipProps, 'content'>;
  legendProps?: LegendProps;
  children?: ReactNode;
};

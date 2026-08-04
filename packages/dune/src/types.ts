import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type {
  AreaProps,
  BarProps,
  LegendProps,
  TooltipProps,
  XAxisProps,
  YAxisProps,
} from 'recharts';

import type { PixelWaveBands, PixelWaveFill } from './charts/pixelWaveEngine';
import type { DuneChartSize } from './primitives/DuneChartContainer';

export type DataKey<T> = Extract<keyof T, string>;

export type DuneSeriesConfig = {
  label?: string;
  /** Base series color (same as Recharts Area/Bar stroke). Bands derive from its hue. */
  color?: string;
  /** Optional explicit 5-stop crest→depth override (dark → brighter). */
  bands?: PixelWaveBands;
};

type RechartsAreaChart = typeof import('recharts').AreaChart;
type RechartsBarChart = typeof import('recharts').BarChart;

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

/** Pass-through BarChart props; Dune owns `data` / `children`. */
export type DuneBarChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsBarChart>,
  'data' | 'children'
>;

/** Pass-through Bar props; Dune owns `dataKey` / `data` / `name`. */
export type DuneBarSeriesPassThrough = Omit<
  BarProps<unknown, unknown>,
  'dataKey' | 'data' | 'name'
>;

type DuneCartesianSharedProps<T> = {
  data: readonly T[];
  categories: readonly DataKey<T>[];
  index: DataKey<T>;
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
  /** Pixel fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
  /** Cell size in CSS pixels (default 4). Clamped to ≥ 1. */
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  /** Empty-state copy when `data` is empty. Default: "No data to display". */
  emptyMessage?: string;
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  xAxisProps?: Omit<XAxisProps<unknown, unknown>, 'dataKey'>;
  yAxisProps?: YAxisProps<unknown, unknown>;
  tooltipProps?: Omit<TooltipProps, 'content'>;
  legendProps?: LegendProps;
  children?: ReactNode;
};

export type DuneCartesianChartProps<T> = DuneCartesianSharedProps<T> & {
  chartProps?: DuneAreaChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneAreaSeriesPassThrough>>;
};

export type DuneBarChartProps<T> = DuneCartesianSharedProps<T> & {
  chartProps?: DuneBarChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneBarSeriesPassThrough>>;
};

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type {
  AreaProps,
  BarProps,
  LegendProps,
  LineProps,
  PieProps,
  PolarAngleAxisProps,
  PolarGridProps,
  PolarRadiusAxisProps,
  RadarProps,
  RadialBarProps,
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
type RechartsLineChart = typeof import('recharts').LineChart;
type RechartsPieChart = typeof import('recharts').PieChart;
type RechartsRadarChart = typeof import('recharts').RadarChart;
type RechartsRadialBarChart = typeof import('recharts').RadialBarChart;

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

/** Pass-through LineChart props; Dune owns `data` / `children`. */
export type DuneLineChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsLineChart>,
  'data' | 'children'
>;

/** Pass-through Line props; Dune owns `dataKey` / `data` / `name`. */
export type DuneLineSeriesPassThrough = Omit<
  LineProps<unknown, unknown>,
  'dataKey' | 'data' | 'name'
>;

/** Pass-through PieChart props; Dune owns `data` / `children`. */
export type DunePieChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsPieChart>,
  'data' | 'children'
>;

/** Pass-through Pie props; Dune owns `data` / `dataKey` / `nameKey`. */
export type DunePiePassThrough = Omit<PieProps<unknown, unknown>, 'data' | 'dataKey' | 'nameKey'>;

/** Pass-through RadarChart props; Dune owns `data` / `children`. */
export type DuneRadarChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsRadarChart>,
  'data' | 'children'
>;

/** Pass-through Radar props; Dune owns `dataKey` / `data` / `name`. */
export type DuneRadarSeriesPassThrough = Omit<
  RadarProps<unknown, unknown>,
  'dataKey' | 'data' | 'name'
>;

/** Pass-through RadialBarChart props; Dune owns `data` / `children`. */
export type DuneRadialChartPassThrough = Omit<
  ComponentPropsWithoutRef<RechartsRadialBarChart>,
  'data' | 'children'
>;

/** Pass-through RadialBar props; Dune owns `data` / `dataKey`. */
export type DuneRadialBarPassThrough = Omit<RadialBarProps<unknown, unknown>, 'data' | 'dataKey'>;

/** Shared cartesian fields without fill-wave (`fill` is area/bar only). */
type DuneCartesianBaseProps<T> = {
  data: readonly T[];
  categories: readonly DataKey<T>[];
  index: DataKey<T>;
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
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

type DuneCartesianSharedProps<T> = DuneCartesianBaseProps<T> & {
  /** Pixel fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
};

export type DuneCartesianChartProps<T> = DuneCartesianSharedProps<T> & {
  chartProps?: DuneAreaChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneAreaSeriesPassThrough>>;
};

export type DuneBarChartProps<T> = DuneCartesianSharedProps<T> & {
  chartProps?: DuneBarChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneBarSeriesPassThrough>>;
};

export type DuneLineChartProps<T> = DuneCartesianBaseProps<T> & {
  chartProps?: DuneLineChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneLineSeriesPassThrough>>;
};

export type DunePieChartProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  /** Numeric slice size field (Recharts `Pie` `dataKey`). */
  dataKey: DataKey<T>;
  /** Slice label field (Recharts `Pie` `nameKey`). Default `"name"`. */
  nameKey?: DataKey<T>;
  /** Per-slice config keyed by slice name. */
  config?: Partial<Record<string, DuneSeriesConfig>>;
  /** Pixel fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
  /** Cell size in CSS pixels (default 4). Clamped to ≥ 1. */
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  emptyMessage?: string;
  valueFormatter?: (value: number, name: string) => string;
  chartProps?: DunePieChartPassThrough;
  pieProps?: DunePiePassThrough;
  tooltipProps?: Omit<TooltipProps, 'content'>;
  legendProps?: LegendProps;
  children?: ReactNode;
};

export type DuneRadarChartProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  categories: readonly DataKey<T>[];
  /** Angle-axis label field (Recharts `PolarAngleAxis` `dataKey`). */
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
  emptyMessage?: string;
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  chartProps?: DuneRadarChartPassThrough;
  seriesProps?: Partial<Record<DataKey<T>, DuneRadarSeriesPassThrough>>;
  polarAngleAxisProps?: Omit<PolarAngleAxisProps, 'dataKey'>;
  polarRadiusAxisProps?: PolarRadiusAxisProps;
  polarGridProps?: PolarGridProps;
  tooltipProps?: Omit<TooltipProps, 'content'>;
  legendProps?: LegendProps;
  children?: ReactNode;
};

export type DuneRadialChartProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  /** Numeric bar length field (Recharts `RadialBar` `dataKey`). */
  dataKey: DataKey<T>;
  /** Bar label field. Default `"name"`. */
  nameKey?: DataKey<T>;
  /** Per-bar config keyed by bar name. */
  config?: Partial<Record<string, DuneSeriesConfig>>;
  /** Pixel fill style. `bands` (default) or Bayer `dither` mesh. */
  fill?: PixelWaveFill;
  /** Cell size in CSS pixels (default 4). Clamped to ≥ 1. */
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  emptyMessage?: string;
  valueFormatter?: (value: number, name: string) => string;
  chartProps?: DuneRadialChartPassThrough;
  radialBarProps?: DuneRadialBarPassThrough;
  polarAngleAxisProps?: Omit<PolarAngleAxisProps, 'dataKey' | 'type' | 'domain'>;
  tooltipProps?: Omit<TooltipProps, 'content'>;
  legendProps?: LegendProps;
  children?: ReactNode;
};

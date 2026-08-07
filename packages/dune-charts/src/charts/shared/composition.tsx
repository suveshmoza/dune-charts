import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { DataKey, DuneSeriesConfig } from '../../types';
import type { PixelWaveBands, PixelWaveFill } from './pixelWaveEngine';

export type DuneSeriesKind = 'area' | 'bar' | 'line' | 'radar';

export type RegisteredSeries = {
  kind: DuneSeriesKind;
  dataKey: string;
  fill?: PixelWaveFill;
  color?: string;
  bands?: PixelWaveBands;
  stackId?: string | number;
  /** Extra Recharts series props retained for buildSeriesList stack detection. */
  stackProps: { stackId?: string | number };
};

export type ChartCompositionValue = {
  data: readonly Record<string, unknown>[];
  config?: Partial<Record<string, DuneSeriesConfig>>;
  pixel: number;
  /** Chart-level default fill (series may override). */
  fill: PixelWaveFill;
  loading: boolean;
  valueFormatter?: (value: number, key: string) => string;
  title?: string;
  /** Categories derived from registered series order. */
  categories: readonly string[];
  /** Index / angle key from XAxis or PolarAngleAxis. */
  indexKey: string | null;
  series: readonly RegisteredSeries[];
  /** stackOffset from chartProps when present. */
  stackOffset?: string;
};

const ChartCompositionContext = createContext<ChartCompositionValue | null>(null);

export function ChartCompositionProvider({
  value,
  children,
}: {
  value: ChartCompositionValue;
  children: ReactNode;
}) {
  return (
    <ChartCompositionContext.Provider value={value}>{children}</ChartCompositionContext.Provider>
  );
}

export function useChartComposition(): ChartCompositionValue {
  const value = useContext(ChartCompositionContext);
  if (value == null) {
    throw new Error('Chart parts must be used within a Dune chart root');
  }
  return value;
}

/** Marker attached to compound part components for child collection. */
export type DunePartMeta =
  | { part: 'grid' }
  | { part: 'x-axis'; dataKey?: string }
  | { part: 'y-axis'; dataKey?: string }
  | { part: 'tooltip' }
  | { part: 'legend' }
  | { part: 'polar-grid' }
  | { part: 'polar-angle-axis'; dataKey?: string }
  | { part: 'polar-radius-axis' }
  | {
      part: 'series';
      kind: DuneSeriesKind;
      dataKey: string;
      fill?: PixelWaveFill;
      color?: string;
      bands?: PixelWaveBands;
      stackId?: string | number;
    }
  | {
      part: 'pie';
      dataKey: string;
      nameKey?: string;
      fill?: PixelWaveFill;
    }
  | {
      part: 'radial-bar';
      dataKey: string;
      nameKey?: string;
      fill?: PixelWaveFill;
    };

export type DunePartComponent = {
  dunePart?: DunePartMeta | ((props: Record<string, unknown>) => DunePartMeta);
};

export function resolvePartMeta(type: object, props: Record<string, unknown>): DunePartMeta | null {
  const meta = (type as DunePartComponent).dunePart;
  if (meta == null) return null;
  return typeof meta === 'function' ? meta(props) : meta;
}

/** Safe stringification for Recharts `dataKey` values used in composition. */
export function asDataKeyString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return '';
}

export function readPartMetaFromType(
  type: unknown,
  props: Record<string, unknown>,
): DunePartMeta | null {
  if (type == null || (typeof type !== 'object' && typeof type !== 'function')) {
    return null;
  }
  return resolvePartMeta(type, props);
}

export type CollectedChartParts = {
  series: RegisteredSeries[];
  indexKey: string | null;
  hasPie: boolean;
  pieDataKey: string | null;
  pieNameKey: string | null;
  pieFill: PixelWaveFill | null;
  hasRadialBar: boolean;
  radialDataKey: string | null;
  radialNameKey: string | null;
  radialFill: PixelWaveFill | null;
};

/**
 * Walk compound children once (render-time) to derive series list and index key.
 * Nested fragments are flattened via Children.
 */
export function collectChartParts(children: ReactNode): CollectedChartParts {
  const series: RegisteredSeries[] = [];
  let indexKey: string | null = null;
  let hasPie = false;
  let pieDataKey: string | null = null;
  let pieNameKey: string | null = null;
  let pieFill: PixelWaveFill | null = null;
  let hasRadialBar = false;
  let radialDataKey: string | null = null;
  let radialNameKey: string | null = null;
  let radialFill: PixelWaveFill | null = null;

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = child.type as DunePartComponent;
    const props = child.props as Record<string, unknown>;
    const meta = resolvePartMeta(type, props);
    if (meta == null) return;

    switch (meta.part) {
      case 'x-axis':
      case 'polar-angle-axis': {
        const key = meta.dataKey ?? (typeof props.dataKey === 'string' ? props.dataKey : null);
        if (key != null) indexKey = key;
        break;
      }
      case 'series': {
        const dataKey = meta.dataKey || (typeof props.dataKey === 'string' ? props.dataKey : null);
        if (dataKey == null) break;
        const stackId =
          meta.stackId ??
          (typeof props.stackId === 'string' || typeof props.stackId === 'number'
            ? props.stackId
            : undefined);
        series.push({
          kind: meta.kind,
          dataKey,
          fill: meta.fill,
          color: meta.color,
          bands: meta.bands,
          stackId,
          stackProps: { stackId },
        });
        break;
      }
      case 'pie': {
        hasPie = true;
        pieDataKey = meta.dataKey || (typeof props.dataKey === 'string' ? props.dataKey : null);
        pieNameKey = meta.nameKey ?? (typeof props.nameKey === 'string' ? props.nameKey : null);
        pieFill = meta.fill ?? null;
        break;
      }
      case 'radial-bar': {
        hasRadialBar = true;
        radialDataKey = meta.dataKey || (typeof props.dataKey === 'string' ? props.dataKey : null);
        radialNameKey = meta.nameKey ?? (typeof props.nameKey === 'string' ? props.nameKey : null);
        radialFill = meta.fill ?? null;
        break;
      }
      default:
        break;
    }
  });

  return {
    series,
    indexKey,
    hasPie,
    pieDataKey,
    pieNameKey,
    pieFill,
    hasRadialBar,
    radialDataKey,
    radialNameKey,
    radialFill,
  };
}

export function useCollectedParts(children: ReactNode): CollectedChartParts {
  return useMemo(() => collectChartParts(children), [children]);
}

export function markDunePart<P>(
  Component: (props: P) => ReactElement | null,
  meta: DunePartMeta | ((props: P) => DunePartMeta),
): ((props: P) => ReactElement | null) & DunePartComponent {
  const marked = Component as ((props: P) => ReactElement | null) & DunePartComponent;
  if (typeof meta === 'function') {
    marked.dunePart = (props: Record<string, unknown>) => meta(props as P);
  } else {
    marked.dunePart = meta;
  }
  return marked;
}

export function clampPixel(pixel: number | undefined, fallback = 2): number {
  if (pixel == null || !Number.isFinite(pixel)) return fallback;
  return Math.max(1, Math.floor(pixel));
}

export function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export type ChartShellProps = {
  className?: string;
  height?: number | `${number}%`;
  title?: string;
  description?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  loadingIndicator?: ReactNode;
};

/** Map registered series into buildSeriesList-compatible seriesProps. */
export function seriesPropsFromRegistry(
  series: readonly RegisteredSeries[],
): Partial<Record<string, { stackId?: string | number }>> {
  const out: Partial<Record<string, { stackId?: string | number }>> = {};
  for (const entry of series) {
    out[entry.dataKey] = entry.stackProps;
  }
  return out;
}

/** Merge per-series fill/color/bands into config for band resolution. */
export function mergeSeriesConfig(
  config: Partial<Record<string, DuneSeriesConfig>> | undefined,
  series: readonly RegisteredSeries[],
): Partial<Record<string, DuneSeriesConfig>> {
  const out: Partial<Record<string, DuneSeriesConfig>> = { ...config };
  for (const entry of series) {
    const prev = out[entry.dataKey] ?? {};
    out[entry.dataKey] = {
      ...prev,
      ...(entry.color != null ? { color: entry.color } : null),
      ...(entry.bands != null ? { bands: entry.bands } : null),
    };
  }
  return out;
}

export type { DataKey };

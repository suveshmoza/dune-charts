import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  type LegendProps,
  type TooltipContentProps,
  type TooltipProps,
  type XAxisProps,
  type YAxisProps,
} from 'recharts';

import { markDunePart, useChartComposition } from './composition';

const GRID_DEFAULTS = {
  stroke: 'var(--dune-grid)',
  strokeWidth: 1,
  vertical: false,
  horizontal: false,
} as const;

const X_AXIS_DEFAULTS = {
  stroke: 'var(--dune-tick)',
  tick: { fill: 'var(--dune-muted-text)', fontSize: 11 },
  tickLine: false as const,
  axisLine: { stroke: 'var(--dune-border)', strokeWidth: 2 },
  dy: 4,
};

const Y_AXIS_DEFAULTS = {
  stroke: 'var(--dune-tick)',
  tick: { fill: 'var(--dune-muted-text)', fontSize: 11 },
  tickLine: false as const,
  axisLine: false as const,
  width: 36,
  domain: [0, 'auto'] as [number, string],
};

export type DuneCartesianGridProps = {
  stroke?: string;
  strokeWidth?: number;
  vertical?: boolean;
  horizontal?: boolean;
  className?: string;
};

export const DuneCartesianGrid = markDunePart(
  function DuneCartesianGrid(props: DuneCartesianGridProps) {
    return <CartesianGrid {...GRID_DEFAULTS} {...props} />;
  },
  { part: 'grid' },
);

export type DuneXAxisProps = XAxisProps<unknown, unknown>;

export const DuneXAxis = markDunePart(
  function DuneXAxis(props: DuneXAxisProps) {
    return <XAxis {...X_AXIS_DEFAULTS} {...props} />;
  },
  (props) => ({
    part: 'x-axis',
    dataKey: typeof props.dataKey === 'string' ? props.dataKey : undefined,
  }),
);

export type DuneYAxisProps = YAxisProps<unknown, unknown>;

export const DuneYAxis = markDunePart(
  function DuneYAxis({ type, domain, width, ...props }: DuneYAxisProps) {
    const category = type === 'category';
    return (
      <YAxis
        {...Y_AXIS_DEFAULTS}
        type={type}
        // Numeric domain defaults break categorical Y (horizontal bars).
        domain={domain ?? (category ? undefined : Y_AXIS_DEFAULTS.domain)}
        width={width ?? (category ? 72 : Y_AXIS_DEFAULTS.width)}
        {...props}
      />
    );
  },
  (props) => ({
    part: 'y-axis',
    dataKey: typeof props.dataKey === 'string' ? props.dataKey : undefined,
  }),
);

export type DuneTooltipProps = Omit<TooltipProps, 'content'> & {
  content?: TooltipProps['content'];
};

export function renderDuneTooltip({
  active,
  payload,
  label,
  categories,
  config,
  valueFormatter,
}: TooltipContentProps & {
  categories: readonly string[];
  config?: Partial<Record<string, { label?: string }>>;
  valueFormatter?: (value: number, key: string) => string;
}): ReactNode {
  if (!active || payload == null || payload.length === 0) return null;

  return (
    <div className="dune-tooltip" role="status" aria-live="polite">
      {label != null ? <div className="dune-tooltip__label">{String(label)}</div> : null}
      <ul className="dune-tooltip__list">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? '');
          const seriesKey = categories.find((category) => category === key);
          const raw = entry.value;
          const numeric = typeof raw === 'number' ? raw : Number(raw);
          const formatted =
            valueFormatter && seriesKey != null && Number.isFinite(numeric)
              ? valueFormatter(numeric, seriesKey)
              : String(raw ?? '');
          const name =
            (seriesKey != null ? config?.[seriesKey]?.label : undefined) ?? entry.name ?? key;

          return (
            <li key={key} className="dune-tooltip__item" style={{ color: entry.color }}>
              <span className="dune-tooltip__name">{name}</span>
              <span className="dune-tooltip__value">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const DEFAULT_TOOLTIP_CURSOR = {
  stroke: 'var(--dune-ink)',
  strokeWidth: 1,
  strokeDasharray: '4 4',
} as const;

export const DuneTooltip = markDunePart(
  function DuneTooltip({ content, cursor = DEFAULT_TOOLTIP_CURSOR, ...props }: DuneTooltipProps) {
    const { categories, config, valueFormatter } = useChartComposition();

    return (
      <Tooltip
        cursor={cursor}
        content={
          content ??
          ((tooltipProps: TooltipContentProps) =>
            renderDuneTooltip({
              ...tooltipProps,
              categories,
              config,
              valueFormatter,
            }))
        }
        {...props}
      />
    );
  },
  { part: 'tooltip' },
);

export type DuneLegendProps = LegendProps;

export const DuneLegend = markDunePart(
  function DuneLegend({ wrapperStyle, formatter, ...props }: DuneLegendProps) {
    const { categories, config, title } = useChartComposition();

    return (
      <Legend
        iconType="square"
        iconSize={10}
        aria-label={title ? `${title} legend` : 'Chart legend'}
        formatter={
          formatter ??
          ((value, entry) => {
            const key = String(entry.dataKey ?? value);
            const seriesKey = categories.find((category) => category === key);
            return (seriesKey != null ? config?.[seriesKey]?.label : undefined) ?? value;
          })
        }
        wrapperStyle={{
          color: 'var(--dune-muted-text)',
          fontSize: 11,
          paddingTop: 8,
          ...wrapperStyle,
        }}
        {...props}
      />
    );
  },
  { part: 'legend' },
);

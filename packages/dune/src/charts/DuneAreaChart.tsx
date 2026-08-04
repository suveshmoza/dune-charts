import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../primitives/DuneChartContainer';
import { useDuneTheme } from '../provider/DuneChartProvider';
import type { DataKey, DuneCartesianChartProps } from '../types';
import { usePrefersReducedMotion } from '../utils/reducedMotion';
import { buildSeriesStyle, getSeriesVar, resolveSeriesBaseColors } from '../utils/series';
import { bandsFromColor, type PixelWaveBands, type PixelWaveSeries } from './pixelWaveEngine';
import { PixelWavePlotLayer } from './PixelWavePlotLayer';

export type DuneAreaChartProps<T> = DuneCartesianChartProps<T>;

const DUNE_EASE = 'ease-out';
const DUNE_DURATION = 520;
const DEFAULT_PIXEL = 4;

function clampPixel(pixel: number | undefined): number {
  if (pixel == null || !Number.isFinite(pixel)) return DEFAULT_PIXEL;
  return Math.max(1, Math.floor(pixel));
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function toSeriesList<T extends Record<string, unknown>>(
  data: readonly T[],
  categories: readonly DataKey<T>[],
  config: DuneCartesianChartProps<T>['config'],
  baseColors: readonly string[],
  seriesProps: DuneCartesianChartProps<T>['seriesProps'],
  chartProps: DuneCartesianChartProps<T>['chartProps'],
): PixelWaveSeries[] {
  const expand = chartProps?.stackOffset === 'expand';
  const stackIds = categories.map((key) => seriesProps?.[key]?.stackId);
  const isStacked = stackIds.some((id) => id != null && id !== false);

  const stackKey = (index: number): string => {
    const raw = stackIds[index];
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
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

export function DuneAreaChart<T extends Record<string, unknown>>({
  data,
  categories,
  index,
  config,
  fill = 'bands',
  pixel: pixelProp,
  className,
  height = 320,
  title,
  description,
  valueFormatter,
  chartProps,
  seriesProps,
  xAxisProps,
  yAxisProps,
  tooltipProps,
  legendProps,
  children,
}: DuneAreaChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();
  const seriesStyle = buildSeriesStyle(categories, config);
  const [baseColors, setBaseColors] = useState<string[]>([]);

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (host == null || categories.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, categories.length));
  }, [categories, config, theme]);

  const waveSeries = useMemo(
    () => toSeriesList(data, categories, config, baseColors, seriesProps, chartProps),
    [data, categories, config, baseColors, seriesProps, chartProps],
  );
  const paintsReady = baseColors.length === categories.length;
  const indexValues = useMemo(() => data.map((row) => row[index]), [data, index]);

  if (data.length === 0) {
    const emptyStyle: CSSProperties = {
      ...seriesStyle,
      height: toCssSize(height),
      minHeight: toCssSize(height) ?? 160,
    };

    return (
      <div
        className={['dune-chart-container', 'dune-chart-empty', className]
          .filter(Boolean)
          .join(' ')}
        style={emptyStyle}
        role="status"
      >
        {title ? <span className="dune-sr-only">{title}</span> : null}
        {description ? <span className="dune-sr-only">{description}</span> : null}
        <p className="dune-chart-empty__message">No data to display</p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || payload == null || payload.length === 0) return null;

    return (
      <div className="dune-tooltip">
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

            return (
              <li key={key} className="dune-tooltip__item" style={{ color: entry.color }}>
                <span className="dune-tooltip__name">
                  {(seriesKey != null ? config?.[seriesKey]?.label : undefined) ??
                    entry.name ??
                    key}
                </span>
                <span className="dune-tooltip__value">{formatted}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <DuneChartContainer
      ref={containerRef}
      className={className}
      style={seriesStyle}
      height={height}
      title={title}
      description={description}
      initialDimension={{ width: 640, height: typeof height === 'number' ? height : 320 }}
    >
      <AreaChart
        data={[...data]}
        margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
        {...chartProps}
      >
        <CartesianGrid stroke="var(--dune-grid)" strokeWidth={1} vertical={false} />
        <XAxis
          dataKey={index}
          stroke="var(--dune-tick)"
          tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--dune-border)', strokeWidth: 2 }}
          dy={4}
          {...xAxisProps}
        />
        <YAxis
          stroke="var(--dune-tick)"
          tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={36}
          domain={[0, 'auto']}
          {...yAxisProps}
        />

        {paintsReady ? (
          <PixelWavePlotLayer
            series={waveSeries}
            pointCount={data.length}
            indexValues={indexValues}
            pixel={pixel}
            fill={fill}
          />
        ) : null}

        <Tooltip
          cursor={{ stroke: 'var(--dune-ink)', strokeWidth: 1, strokeDasharray: '4 4' }}
          content={renderTooltip}
          {...tooltipProps}
        />
        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ color: 'var(--dune-muted-text)', fontSize: 11, paddingTop: 8 }}
          formatter={(value, entry) => {
            const key = String(entry.dataKey ?? value);
            const seriesKey = categories.find((category) => category === key);
            return (seriesKey != null ? config?.[seriesKey]?.label : undefined) ?? value;
          }}
          {...legendProps}
        />

        {categories.map((key, i) => {
          const color = getSeriesVar(i);
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={config?.[key]?.label ?? key}
              stroke={color}
              fill="transparent"
              strokeOpacity={0}
              strokeWidth={2}
              strokeLinecap="square"
              strokeLinejoin="miter"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
              animationDuration={DUNE_DURATION}
              animationEasing={DUNE_EASE}
              isAnimationActive={!prefersReducedMotion}
              legendType="square"
              {...seriesProps?.[key]}
            />
          );
        })}

        {children}
      </AreaChart>
    </DuneChartContainer>
  );
}

export type { PixelWaveBands };

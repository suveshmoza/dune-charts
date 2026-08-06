import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../primitives/DuneChartContainer';
import { useDuneTheme } from '../provider/DuneChartProvider';
import type { DuneComposedChartProps } from '../types';
import { usePrefersReducedMotion } from '../utils/reducedMotion';
import { buildSeriesStyle, getSeriesVar, resolveSeriesBaseColors } from '../utils/series';
import { buildSeriesList } from './buildSeriesList';
import { colorsForKeys, composeSeriesKeys } from './composeSeriesKeys';
import { PixelBarPlotLayer } from './PixelBarPlotLayer';
import { PixelLinePlotLayer } from './PixelLinePlotLayer';
import { PixelWavePlotLayer } from './PixelWavePlotLayer';

export type { DuneComposedChartProps };

const DUNE_EASE = 'ease-out';
const DUNE_DURATION = 520;
const DEFAULT_PIXEL = 2;
const DEFAULT_EMPTY_MESSAGE = 'No data to display';

function clampPixel(pixel: number | undefined): number {
  if (pixel == null || !Number.isFinite(pixel)) return DEFAULT_PIXEL;
  return Math.max(1, Math.floor(pixel));
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function seriesColorForKey(categories: readonly string[], key: string): string | undefined {
  const seriesIndex = categories.findIndex((category) => category === key);
  if (seriesIndex < 0) return undefined;
  return getSeriesVar(seriesIndex);
}

export function DuneComposedChart<T extends Record<string, unknown>>({
  data,
  areas: areasProp,
  bars: barsProp,
  lines: linesProp,
  index,
  config,
  fill = 'bands',
  pixel: pixelProp,
  className,
  height = 320,
  title,
  description,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  valueFormatter,
  chartProps,
  areaSeriesProps,
  barSeriesProps,
  lineSeriesProps,
  xAxisProps,
  yAxisProps,
  tooltipProps,
  legendProps,
  children,
}: DuneComposedChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();

  const areas = useMemo(() => areasProp ?? [], [areasProp]);
  const bars = useMemo(() => barsProp ?? [], [barsProp]);
  const lines = useMemo(() => linesProp ?? [], [linesProp]);
  const categories = useMemo(() => composeSeriesKeys(areas, bars, lines), [areas, bars, lines]);

  const seriesStyle = buildSeriesStyle(categories, config);
  const [baseColors, setBaseColors] = useState<string[]>([]);
  const emptyId = useId();
  const emptyTitleId = title ? `${emptyId}-title` : undefined;
  const emptyDescId = description ? `${emptyId}-description` : undefined;
  const emptyMessageId = `${emptyId}-message`;

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (host == null || categories.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, categories.length));
  }, [categories, config, theme]);

  const areaSeries = useMemo(
    () =>
      areas.length === 0
        ? []
        : buildSeriesList(
            data,
            areas,
            config,
            colorsForKeys(categories, baseColors, areas),
            areaSeriesProps,
            chartProps,
          ),
    [data, areas, config, baseColors, categories, areaSeriesProps, chartProps],
  );
  const barSeries = useMemo(
    () =>
      bars.length === 0
        ? []
        : buildSeriesList(
            data,
            bars,
            config,
            colorsForKeys(categories, baseColors, bars),
            barSeriesProps,
            chartProps,
          ),
    [data, bars, config, baseColors, categories, barSeriesProps, chartProps],
  );
  const lineSeries = useMemo(
    () =>
      lines.length === 0
        ? []
        : buildSeriesList(
            data,
            lines,
            config,
            colorsForKeys(categories, baseColors, lines),
            undefined,
            undefined,
          ),
    [data, lines, config, baseColors, categories],
  );

  const paintsReady = baseColors.length === categories.length && categories.length > 0;
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
        aria-labelledby={emptyTitleId}
        aria-describedby={[emptyDescId, emptyMessageId].filter(Boolean).join(' ') || undefined}
      >
        {title ? (
          <span id={emptyTitleId} className="dune-sr-only">
            {title}
          </span>
        ) : null}
        {description ? (
          <span id={emptyDescId} className="dune-sr-only">
            {description}
          </span>
        ) : null}
        <p id={emptyMessageId} className="dune-chart-empty__message">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }: TooltipContentProps) => {
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
            const color = seriesColorForKey(categories, key) ?? entry.color;

            return (
              <li key={key} className="dune-tooltip__item" style={{ color }}>
                <span className="dune-tooltip__name">{name}</span>
                <span className="dune-tooltip__value">{formatted}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const { accessibilityLayer: chartAccessibilityLayer = true, ...restChartProps } =
    chartProps ?? {};

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
      <ComposedChart
        data={[...data]}
        margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
        accessibilityLayer={chartAccessibilityLayer}
        {...restChartProps}
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

        {paintsReady && areaSeries.length > 0 ? (
          <PixelWavePlotLayer
            series={areaSeries}
            pointCount={data.length}
            indexValues={indexValues}
            pixel={pixel}
            fill={fill}
          />
        ) : null}
        {paintsReady && barSeries.length > 0 ? (
          <PixelBarPlotLayer
            series={barSeries}
            pointCount={data.length}
            indexValues={indexValues}
            pixel={pixel}
            fill={fill}
          />
        ) : null}
        {paintsReady && lineSeries.length > 0 ? (
          <PixelLinePlotLayer
            series={lineSeries}
            pointCount={data.length}
            indexValues={indexValues}
            pixel={pixel}
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
          aria-label={title ? `${title} legend` : 'Chart legend'}
          formatter={(value, entry) => {
            const key = String(entry.dataKey ?? value);
            const seriesKey = categories.find((category) => category === key);
            return (seriesKey != null ? config?.[seriesKey]?.label : undefined) ?? value;
          }}
          {...legendProps}
          wrapperStyle={{
            color: 'var(--dune-muted-text)',
            fontSize: 11,
            paddingTop: 8,
            ...legendProps?.wrapperStyle,
          }}
        />

        {areas.map((key) => {
          const color = seriesColorForKey(categories, key) ?? getSeriesVar(0);
          return (
            <Area
              key={`area-${key}`}
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
              {...areaSeriesProps?.[key]}
            />
          );
        })}

        {bars.map((key) => {
          const color = seriesColorForKey(categories, key) ?? getSeriesVar(0);
          return (
            <Bar
              key={`bar-${key}`}
              dataKey={key}
              name={config?.[key]?.label ?? key}
              fill={color}
              fillOpacity={0}
              stroke="none"
              maxBarSize={48}
              animationDuration={DUNE_DURATION}
              animationEasing={DUNE_EASE}
              isAnimationActive={!prefersReducedMotion}
              legendType="square"
              activeBar={false}
              {...barSeriesProps?.[key]}
            />
          );
        })}

        {lines.map((key) => {
          const color = seriesColorForKey(categories, key) ?? getSeriesVar(0);
          return (
            <Line
              key={`line-${key}`}
              dataKey={key}
              name={config?.[key]?.label ?? key}
              type="stepAfter"
              stroke={color}
              strokeOpacity={0}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              animationDuration={DUNE_DURATION}
              animationEasing={DUNE_EASE}
              isAnimationActive={!prefersReducedMotion}
              legendType="square"
              {...lineSeriesProps?.[key]}
            />
          );
        })}

        {children}
      </ComposedChart>
    </DuneChartContainer>
  );
}

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type { DuneBarChartProps } from '../../types';
import { usePrefersReducedMotion } from '../../utils/reducedMotion';
import {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from '../../utils/series';
import { buildSeriesList } from '../shared/buildSeriesList';
import {
  buildLoadingBarRows,
  buildLoadingBarSeriesFromRows,
  DEFAULT_LOADING_BAR_COUNT,
  LOADING_BAR_INDEX_KEY,
  LOADING_BAR_VALUE_KEY,
} from '../shared/chartLoadingBars';
import { PixelBarPlotLayer } from './PixelBarPlotLayer';

export type { DuneBarChartProps };

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

export function DuneBarChart<T extends Record<string, unknown>>({
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
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  loading = false,
  loadingMessage = DEFAULT_LOADING_MESSAGE,
  loadingIndicator,
  valueFormatter,
  chartProps,
  seriesProps,
  xAxisProps,
  yAxisProps,
  tooltipProps,
  legendProps,
  children,
}: DuneBarChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();
  const seriesStyle = buildSeriesStyle(categories, config);
  const [baseColors, setBaseColors] = useState<string[]>([]);
  const [trackColor, setTrackColor] = useState('#d9d3c8');
  const emptyId = useId();
  const emptyTitleId = title ? `${emptyId}-title` : undefined;
  const emptyDescId = description ? `${emptyId}-description` : undefined;
  const emptyMessageId = `${emptyId}-message`;

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (host == null) return;
    setTrackColor(resolveCssColor(host, 'var(--dune-track)'));
    if (categories.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, categories.length));
  }, [categories, config, theme, loading]);

  const barSeries = useMemo(
    () => buildSeriesList(data, categories, config, baseColors, seriesProps, chartProps),
    [data, categories, config, baseColors, seriesProps, chartProps],
  );
  const paintsReady = baseColors.length === categories.length;
  const indexValues = useMemo(() => data.map((row) => row[index]), [data, index]);

  const loadingBarCount = useMemo(() => {
    if (data.length > 0) return Math.max(6, Math.min(16, data.length));
    return DEFAULT_LOADING_BAR_COUNT;
  }, [data.length]);

  // Stable skeleton — heights do not re-roll while loading.
  const loadingRows = useMemo(() => buildLoadingBarRows(loadingBarCount), [loadingBarCount]);
  const loadingSeries = useMemo(
    () => buildLoadingBarSeriesFromRows(loadingRows, trackColor),
    [loadingRows, trackColor],
  );
  const loadingIndexValues = useMemo(
    () => loadingRows.map((row) => row[LOADING_BAR_INDEX_KEY]),
    [loadingRows],
  );

  const {
    accessibilityLayer: chartAccessibilityLayer = true,
    layout: barLayout = 'horizontal',
    ...restChartProps
  } = chartProps ?? {};
  const isHorizontalBars = barLayout === 'vertical';

  if (!loading && data.length === 0) {
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

  if (loading) {
    const loadingStyle: CSSProperties = {
      ...seriesStyle,
      height: toCssSize(height),
      minHeight: toCssSize(height) ?? 160,
      position: 'relative',
    };

    return (
      <div
        ref={containerRef}
        className={['dune-chart-container', 'dune-chart-loading-shell', className]
          .filter(Boolean)
          .join(' ')}
        style={loadingStyle}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={loadingRows}
            margin={
              isHorizontalBars
                ? { top: 12, right: 16, left: 8, bottom: 4 }
                : { top: 12, right: 16, left: 4, bottom: 4 }
            }
            accessibilityLayer={false}
            layout={barLayout}
            {...restChartProps}
          >
            {isHorizontalBars ? (
              <>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey={LOADING_BAR_INDEX_KEY} hide width={0} />
              </>
            ) : (
              <>
                <XAxis dataKey={LOADING_BAR_INDEX_KEY} hide />
                <YAxis hide domain={[0, 100]} width={0} />
              </>
            )}

            <PixelBarPlotLayer
              series={loadingSeries}
              pointCount={loadingRows.length}
              indexValues={loadingIndexValues}
              pixel={pixel}
              fill="dither"
              layout={barLayout}
              shimmer={!prefersReducedMotion}
            />

            <Bar
              dataKey={LOADING_BAR_VALUE_KEY}
              fill="var(--dune-track)"
              fillOpacity={0}
              stroke="none"
              maxBarSize={48}
              isAnimationActive={false}
              legendType="none"
              activeBar={false}
            />
          </BarChart>
        </ResponsiveContainer>

        <DuneChartLoadingBadge message={loadingMessage} indicator={loadingIndicator} />
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
      <BarChart
        data={[...data]}
        margin={
          isHorizontalBars
            ? { top: 12, right: 16, left: 8, bottom: 4 }
            : { top: 12, right: 16, left: 4, bottom: 4 }
        }
        accessibilityLayer={chartAccessibilityLayer}
        layout={barLayout}
        {...restChartProps}
      >
        <CartesianGrid
          stroke="var(--dune-grid)"
          strokeWidth={1}
          vertical={false}
          horizontal={false}
        />
        {isHorizontalBars ? (
          <>
            <XAxis
              type="number"
              stroke="var(--dune-tick)"
              tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--dune-border)', strokeWidth: 2 }}
              domain={[0, 'auto']}
              {...xAxisProps}
            />
            <YAxis
              type="category"
              dataKey={index}
              stroke="var(--dune-tick)"
              tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
              {...yAxisProps}
            />
          </>
        ) : (
          <>
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
          </>
        )}

        {paintsReady ? (
          <PixelBarPlotLayer
            series={barSeries}
            pointCount={data.length}
            indexValues={indexValues}
            pixel={pixel}
            fill={fill}
            layout={barLayout}
          />
        ) : null}

        <Tooltip cursor={false} content={renderTooltip} {...tooltipProps} />
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

        {categories.map((key, i) => {
          const color = getSeriesVar(i);
          return (
            <Bar
              key={key}
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
              {...seriesProps?.[key]}
            />
          );
        })}

        {children}
      </BarChart>
    </DuneChartContainer>
  );
}

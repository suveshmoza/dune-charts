import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../primitives/DuneChartContainer';
import { useDuneTheme } from '../provider/DuneChartProvider';
import type { DuneRadarChartProps } from '../types';
import { usePrefersReducedMotion } from '../utils/reducedMotion';
import { buildSeriesStyle, getSeriesVar, resolveSeriesBaseColors } from '../utils/series';
import { buildSeriesList } from './buildSeriesList';
import { PixelRadarPlotLayer } from './PixelRadarPlotLayer';

export type { DuneRadarChartProps };

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

export function DuneRadarChart<T extends Record<string, unknown>>({
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
  valueFormatter,
  chartProps,
  seriesProps,
  polarAngleAxisProps,
  polarRadiusAxisProps,
  polarGridProps,
  tooltipProps,
  legendProps,
  children,
}: DuneRadarChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();
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

  const radarSeries = useMemo(
    () => buildSeriesList(data, categories, config, baseColors, undefined, undefined),
    [data, categories, config, baseColors],
  );
  const paintsReady = baseColors.length === categories.length && categories.length > 0;

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
      <RadarChart
        data={[...data]}
        margin={{ top: 16, right: 24, left: 24, bottom: 8 }}
        accessibilityLayer={chartAccessibilityLayer}
        {...restChartProps}
      >
        <PolarGrid
          stroke="var(--dune-grid)"
          strokeWidth={1}
          gridType="polygon"
          {...polarGridProps}
        />
        <PolarAngleAxis
          dataKey={index}
          tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
          {...polarAngleAxisProps}
        />
        <PolarRadiusAxis
          stroke="var(--dune-tick)"
          tick={{ fill: 'var(--dune-muted-text)', fontSize: 10 }}
          axisLine={false}
          {...polarRadiusAxisProps}
        />

        {paintsReady ? (
          <PixelRadarPlotLayer
            series={radarSeries}
            pointCount={data.length}
            pixel={pixel}
            fill={fill}
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
            <Radar
              key={key}
              dataKey={key}
              name={config?.[key]?.label ?? key}
              stroke={color}
              strokeOpacity={0}
              fill={color}
              fillOpacity={0}
              dot={false}
              activeDot={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={DUNE_DURATION}
              animationEasing={DUNE_EASE}
              legendType="square"
              {...seriesProps?.[key]}
            />
          );
        })}

        {children}
      </RadarChart>
    </DuneChartContainer>
  );
}

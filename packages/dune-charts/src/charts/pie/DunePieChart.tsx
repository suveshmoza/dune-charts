import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type { DunePieChartProps } from '../../types';
import { usePrefersReducedMotion } from '../../utils/reducedMotion';
import {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from '../../utils/series';
import {
  buildLoadingPieRows,
  buildLoadingPieSlices,
  DEFAULT_LOADING_PIE_COUNT,
  LOADING_PIE_NAME_KEY,
  LOADING_PIE_VALUE_KEY,
} from '../shared/chartLoadingBars';
import { buildPieSliceList, type PixelPieLayoutOptions } from './pixelPieEngine';
import { PixelPiePlotLayer } from './PixelPiePlotLayer';

export type { DunePieChartProps };

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

function sliceColorForIndex(index: number): string {
  return getSeriesVar(index);
}

export function DunePieChart<T extends Record<string, unknown>>({
  data,
  dataKey,
  nameKey: nameKeyProp,
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
  pieProps,
  tooltipProps,
  legendProps,
  children,
}: DunePieChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();
  const nameKey = nameKeyProp ?? 'name';
  const sliceNames = useMemo(
    () =>
      data.map((row, i) => {
        const raw = row[nameKey];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
          return String(raw);
        }
        return `slice-${i}`;
      }),
    [data, nameKey],
  );
  const seriesStyle = buildSeriesStyle(sliceNames, config);
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
    if (sliceNames.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, sliceNames.length));
  }, [sliceNames, config, theme, loading]);

  const slices = useMemo(
    () => buildPieSliceList(data, dataKey, nameKey, config, baseColors),
    [data, dataKey, nameKey, config, baseColors],
  );
  const paintsReady = baseColors.length === sliceNames.length && sliceNames.length > 0;

  const loadingSliceCount = useMemo(() => {
    if (data.length > 0) return Math.max(4, Math.min(10, data.length));
    return DEFAULT_LOADING_PIE_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(() => buildLoadingPieRows(loadingSliceCount), [loadingSliceCount]);
  const loadingSlices = useMemo(
    () => buildLoadingPieSlices(loadingSliceCount, trackColor),
    [loadingSliceCount, trackColor],
  );

  const layoutOptions = useMemo((): Omit<PixelPieLayoutOptions, 'pixel'> => {
    const { innerRadius, outerRadius, startAngle, endAngle, paddingAngle, cx, cy } = pieProps ?? {};
    return {
      innerRadius,
      outerRadius: typeof outerRadius === 'function' ? undefined : outerRadius,
      startAngle,
      endAngle,
      paddingAngle,
      cx,
      cy,
    };
  }, [pieProps]);

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

    const {
      activeShape: _activeShape,
      isAnimationActive: _isAnimationActive,
      animationDuration: _animationDuration,
      animationEasing: _animationEasing,
      ...restLoadingPieProps
    } = pieProps ?? {};

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
          <PieChart accessibilityLayer={false}>
            <PixelPiePlotLayer
              slices={loadingSlices}
              pixel={pixel}
              fill="dither"
              layoutOptions={layoutOptions}
              shimmer={!prefersReducedMotion}
            />

            <Pie
              data={loadingRows}
              dataKey={LOADING_PIE_VALUE_KEY}
              nameKey={LOADING_PIE_NAME_KEY}
              {...restLoadingPieProps}
              stroke="none"
              isAnimationActive={false}
              activeShape={false}
              legendType="none"
            >
              {loadingRows.map((row) => (
                <Cell key={String(row[LOADING_PIE_NAME_KEY])} fill="transparent" stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <DuneChartLoadingBadge message={loadingMessage} indicator={loadingIndicator} />
      </div>
    );
  }

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || payload == null || payload.length === 0) return null;

    return (
      <div className="dune-tooltip" role="status" aria-live="polite">
        <ul className="dune-tooltip__list">
          {payload.map((entry) => {
            const name = String(entry.name ?? entry.dataKey ?? '');
            const raw = entry.value;
            const numeric = typeof raw === 'number' ? raw : Number(raw);
            const formatted =
              valueFormatter && Number.isFinite(numeric)
                ? valueFormatter(numeric, name)
                : String(raw ?? '');
            const label = config?.[name]?.label ?? name;
            const colorIndex = sliceNames.indexOf(name);
            const color = colorIndex >= 0 ? sliceColorForIndex(colorIndex) : entry.color;

            return (
              <li key={name} className="dune-tooltip__item" style={{ color }}>
                <span className="dune-tooltip__name">{label}</span>
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
  const {
    activeShape: _activeShape,
    isAnimationActive,
    animationDuration,
    animationEasing,
    ...restPieProps
  } = pieProps ?? {};

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
      <PieChart accessibilityLayer={chartAccessibilityLayer} {...restChartProps}>
        {paintsReady ? (
          <PixelPiePlotLayer
            slices={slices}
            pixel={pixel}
            fill={fill}
            layoutOptions={layoutOptions}
          />
        ) : null}

        <Tooltip content={renderTooltip} {...tooltipProps} />
        <Legend
          iconType="square"
          iconSize={10}
          aria-label={title ? `${title} legend` : 'Chart legend'}
          formatter={(value) => {
            const key = String(value);
            return config?.[key]?.label ?? value;
          }}
          {...legendProps}
          wrapperStyle={{
            color: 'var(--dune-muted-text)',
            fontSize: 11,
            paddingTop: 8,
            ...legendProps?.wrapperStyle,
          }}
        />

        <Pie
          data={[...data]}
          dataKey={dataKey}
          nameKey={nameKey}
          {...restPieProps}
          stroke="none"
          isAnimationActive={isAnimationActive ?? !prefersReducedMotion}
          animationDuration={animationDuration ?? DUNE_DURATION}
          animationEasing={animationEasing ?? DUNE_EASE}
          activeShape={false}
          legendType="square"
        >
          {sliceNames.map((name, i) => (
            <Cell key={name} fill={sliceColorForIndex(i)} fillOpacity={0} stroke="none" />
          ))}
        </Pie>

        {children}
      </PieChart>
    </DuneChartContainer>
  );
}

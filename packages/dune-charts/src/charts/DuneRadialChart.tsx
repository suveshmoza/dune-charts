import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Cell,
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  type SectorProps,
  type TooltipContentProps,
} from 'recharts';

import { DuneChartContainer } from '../primitives/DuneChartContainer';
import {
  DEFAULT_LOADING_MESSAGE,
  DuneChartLoadingBadge,
} from '../primitives/DuneChartLoading';
import { useDuneTheme } from '../provider/DuneChartProvider';
import type { DuneRadialChartProps } from '../types';
import { usePrefersReducedMotion } from '../utils/reducedMotion';
import {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from '../utils/series';
import {
  buildLoadingRadialBars,
  buildLoadingRadialRows,
  DEFAULT_LOADING_RADIAL_COUNT,
  LOADING_RADIAL_NAME_KEY,
  LOADING_RADIAL_VALUE_KEY,
} from './chartLoadingBars';
import {
  buildRadialBarList,
  radialHitsSignature,
  type PixelRadialHitSector,
  type PixelRadialLayoutOptions,
} from './pixelRadialEngine';
import { PixelRadialPlotLayer } from './PixelRadialPlotLayer';

export type { DuneRadialChartProps };

const DUNE_EASE = 'ease-out';
const DUNE_DURATION = 520;
const DEFAULT_PIXEL = 2;
const DEFAULT_EMPTY_MESSAGE = 'No data to display';
const DEFAULT_INNER_RADIUS = '30%';
const DEFAULT_OUTER_RADIUS = '80%';

function clampPixel(pixel: number | undefined): number {
  if (pixel == null || !Number.isFinite(pixel)) return DEFAULT_PIXEL;
  return Math.max(1, Math.floor(pixel));
}

function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function barColorForIndex(index: number): string {
  return getSeriesVar(index);
}

function hitFromSectorProps(
  props: SectorProps & { payload?: Record<string, unknown>; value?: unknown },
  nameKey: string,
): PixelRadialHitSector | null {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    payload,
    value: rawValue,
  } = props;
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof startAngle !== 'number' ||
    typeof endAngle !== 'number'
  ) {
    return null;
  }

  const rawName = payload?.[nameKey];
  const barName =
    typeof rawName === 'string' || typeof rawName === 'number' || typeof rawName === 'boolean'
      ? String(rawName)
      : 'bar';
  const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  return {
    barName,
    value: Number.isFinite(numeric) ? numeric : 0,
    cx,
    cy,
    rInner: innerRadius,
    rOuter: outerRadius,
    startAngle,
    endAngle,
  };
}

type TransparentRadialSectorProps = SectorProps & {
  nameKey: string;
  onHit: (hit: PixelRadialHitSector) => void;
};

/**
 * Invisible hit sector that reports Recharts geometry after layout so pixel
 * paint can match hover targets (including during animation frames).
 */
function TransparentRadialSector({ nameKey, onHit, ...props }: TransparentRadialSectorProps) {
  useLayoutEffect(() => {
    const hit = hitFromSectorProps(props, nameKey);
    if (hit != null) onHit(hit);
  });

  return (
    <Sector
      {...props}
      fillOpacity={0}
      stroke="none"
      style={{ ...props.style, pointerEvents: 'all' }}
    />
  );
}

export function DuneRadialChart<T extends Record<string, unknown>>({
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
  radialBarProps,
  polarAngleAxisProps,
  tooltipProps,
  legendProps,
  children,
}: DuneRadialChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp);
  const { theme } = useDuneTheme();
  const nameKey = nameKeyProp ?? 'name';
  const barNames = useMemo(
    () =>
      data.map((row, i) => {
        const raw = row[nameKey];
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
          return String(raw);
        }
        return `bar-${i}`;
      }),
    [data, nameKey],
  );
  const seriesStyle = buildSeriesStyle(barNames, config);
  const [baseColors, setBaseColors] = useState<string[]>([]);
  const [trackColor, setTrackColor] = useState('#eceae4');
  const [hitSectors, setHitSectors] = useState<PixelRadialHitSector[]>([]);
  const emptyId = useId();
  const emptyTitleId = title ? `${emptyId}-title` : undefined;
  const emptyDescId = description ? `${emptyId}-description` : undefined;
  const emptyMessageId = `${emptyId}-message`;

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (host == null) return;
    setTrackColor(resolveCssColor(host, 'var(--dune-track)'));
    if (barNames.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, barNames.length));
  }, [barNames, config, theme, loading]);

  const onHit = useCallback((hit: PixelRadialHitSector) => {
    setHitSectors((prev) => {
      const index = prev.findIndex((entry) => entry.barName === hit.barName);
      if (index >= 0) {
        const existing = prev[index];
        if (existing != null && radialHitsSignature([existing]) === radialHitsSignature([hit])) {
          return prev;
        }
        const next = prev.slice();
        next[index] = hit;
        return next;
      }
      return [...prev, hit];
    });
  }, []);

  const renderHitShape = useCallback(
    (props: SectorProps) => <TransparentRadialSector {...props} nameKey={nameKey} onHit={onHit} />,
    [nameKey, onHit],
  );

  const bars = useMemo(
    () => buildRadialBarList(data, dataKey, nameKey, config, baseColors),
    [data, dataKey, nameKey, config, baseColors],
  );
  const paintsReady = baseColors.length === barNames.length && barNames.length > 0;

  const angleMax = useMemo(() => {
    let max = 0;
    for (const bar of bars) {
      if (bar.value > max) max = bar.value;
    }
    return max > 0 ? max : 1;
  }, [bars]);

  const {
    accessibilityLayer: chartAccessibilityLayer = true,
    innerRadius = DEFAULT_INNER_RADIUS,
    outerRadius = DEFAULT_OUTER_RADIUS,
    startAngle: chartStartAngle = 0,
    endAngle: chartEndAngle = 360,
    cx: chartCx,
    cy: chartCy,
    ...restChartProps
  } = chartProps ?? {};

  const loadingBarCount = useMemo(() => {
    if (data.length > 0) return Math.max(4, Math.min(8, data.length));
    return DEFAULT_LOADING_RADIAL_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(
    () => buildLoadingRadialRows(loadingBarCount),
    [loadingBarCount],
  );
  const loadingBars = useMemo(
    () => buildLoadingRadialBars(loadingBarCount, trackColor),
    [loadingBarCount, trackColor],
  );

  const loadingLayoutOptions = useMemo((): Omit<PixelRadialLayoutOptions, 'pixel'> => {
    return {
      innerRadius,
      outerRadius,
      startAngle: chartStartAngle,
      endAngle: chartEndAngle,
      cx: chartCx,
      cy: chartCy,
    };
  }, [innerRadius, outerRadius, chartStartAngle, chartEndAngle, chartCx, chartCy]);

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
          <RadialBarChart
            data={loadingRows}
            accessibilityLayer={false}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={chartStartAngle}
            endAngle={chartEndAngle}
            cx={chartCx}
            cy={chartCy}
          >
            <PixelRadialPlotLayer
              bars={loadingBars}
              pixel={pixel}
              fill="dither"
              trackStartAngle={chartStartAngle}
              trackEndAngle={chartEndAngle}
              layoutOptions={loadingLayoutOptions}
              paintTracks={false}
              shimmer={!prefersReducedMotion}
            />

            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
              tickLine={false}
              axisLine={false}
            />

            <RadialBar
              dataKey={LOADING_RADIAL_VALUE_KEY}
              background={false}
              stroke="none"
              fill="transparent"
              fillOpacity={0}
              isAnimationActive={false}
              activeShape={false}
              legendType="none"
            >
              {loadingRows.map((row) => (
                <Cell
                  key={String(row[LOADING_RADIAL_NAME_KEY])}
                  fill="transparent"
                  stroke="none"
                />
              ))}
            </RadialBar>
          </RadialBarChart>
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
            const name = String(
              entry.name ?? entry.payload?.[nameKey as string] ?? entry.dataKey ?? '',
            );
            const raw = entry.value;
            const numeric = typeof raw === 'number' ? raw : Number(raw);
            const formatted =
              valueFormatter && Number.isFinite(numeric)
                ? valueFormatter(numeric, name)
                : String(raw ?? '');
            const label = config?.[name]?.label ?? name;
            const colorIndex = barNames.indexOf(name);
            const color = colorIndex >= 0 ? barColorForIndex(colorIndex) : entry.color;

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

  const {
    activeShape: _activeShape,
    background: _background,
    shape: _shape,
    isAnimationActive,
    animationDuration,
    animationEasing,
    ...restRadialBarProps
  } = radialBarProps ?? {};

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
      <RadialBarChart
        data={[...data]}
        accessibilityLayer={chartAccessibilityLayer}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={chartStartAngle}
        endAngle={chartEndAngle}
        cx={chartCx}
        cy={chartCy}
        {...restChartProps}
      >
        {paintsReady ? (
          <PixelRadialPlotLayer
            bars={bars}
            hits={hitSectors}
            pixel={pixel}
            fill={fill}
            trackStartAngle={chartStartAngle}
            trackEndAngle={chartEndAngle}
            trackColor={trackColor}
          />
        ) : null}

        <PolarAngleAxis
          type="number"
          domain={[0, angleMax]}
          tick={false}
          tickLine={false}
          axisLine={false}
          {...polarAngleAxisProps}
        />

        <Tooltip cursor={false} content={renderTooltip} {...tooltipProps} />
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

        <RadialBar
          dataKey={dataKey}
          {...restRadialBarProps}
          background={false}
          stroke="none"
          isAnimationActive={isAnimationActive ?? !prefersReducedMotion}
          animationDuration={animationDuration ?? DUNE_DURATION}
          animationEasing={animationEasing ?? DUNE_EASE}
          activeShape={false}
          legendType="square"
          shape={renderHitShape}
        >
          {barNames.map((name, i) => (
            <Cell key={name} fill={barColorForIndex(i)} fillOpacity={0} stroke="none" />
          ))}
        </RadialBar>

        {children}
      </RadialBarChart>
    </DuneChartContainer>
  );
}

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Cell,
  PolarAngleAxis,
  RadialBar as RechartsRadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Sector,
  type RadialBarProps,
  type SectorProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DuneRadialBarPassThrough,
  DuneRadialChartPassThrough,
  DuneRadialChartProps,
  DuneSeriesConfig,
} from '../../types';
import { usePrefersReducedMotion } from '../../utils/reducedMotion';
import {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from '../../utils/series';
import { DuneLegend, DuneTooltip } from '../shared/cartesianParts';
import {
  buildLoadingRadialBars,
  buildLoadingRadialRows,
  DEFAULT_LOADING_RADIAL_COUNT,
  LOADING_RADIAL_NAME_KEY,
  LOADING_RADIAL_VALUE_KEY,
} from '../shared/chartLoadingBars';
import {
  ChartEmptyState,
  ChartLoadingShell,
  DEFAULT_EMPTY_MESSAGE,
  DEFAULT_PIXEL,
  DUNE_DURATION,
  DUNE_EASE,
  clampPixel,
} from '../shared/chartShell';
import {
  ChartCompositionProvider,
  collectChartParts,
  markDunePart,
  readPartMetaFromType,
  useChartComposition,
  type ChartCompositionValue,
} from '../shared/composition';
import type { PixelWaveFill } from '../shared/pixelWaveEngine';
import {
  buildRadialBarList,
  radialHitsSignature,
  type PixelRadialHitSector,
  type PixelRadialLayoutOptions,
} from './pixelRadialEngine';
import { PixelRadialPlotLayer } from './PixelRadialPlotLayer';

export type { DuneRadialChartProps };

const DEFAULT_INNER_RADIUS = '30%';
const DEFAULT_OUTER_RADIUS = '80%';

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

export type DuneRadialChartRadialBarProps = Omit<RadialBarProps, 'data' | 'dataKey' | 'fill'> & {
  dataKey: string;
  nameKey?: string;
  /** Pixel fill style for this radial bar (falls back to chart `fill`). */
  fill?: PixelWaveFill;
};

const RadialBar = markDunePart(
  function RadialBar({
    dataKey,
    nameKey: _nameKey,
    fill: _pixelFill,
    activeShape: _activeShape,
    background: _background,
    shape: _shape,
    isAnimationActive,
    animationDuration,
    animationEasing,
    ...rest
  }: DuneRadialChartRadialBarProps) {
    const { categories: barNames } = useChartComposition();
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <RechartsRadialBar
        dataKey={dataKey}
        {...rest}
        background={false}
        stroke="none"
        isAnimationActive={isAnimationActive ?? !prefersReducedMotion}
        animationDuration={animationDuration ?? DUNE_DURATION}
        animationEasing={animationEasing ?? DUNE_EASE}
        activeShape={false}
        legendType="square"
      >
        {barNames.map((name, i) => (
          <Cell key={name} fill={getSeriesVar(i)} fillOpacity={0} stroke="none" />
        ))}
      </RechartsRadialBar>
    );
  },
  (props) => ({
    part: 'radial-bar',
    dataKey: props.dataKey,
    nameKey: props.nameKey,
    fill: props.fill,
  }),
);

export type DuneRadialChartRootProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  config?: Partial<Record<string, DuneSeriesConfig>>;
  fill?: PixelWaveFill;
  pixel?: number;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  loadingIndicator?: ReactNode;
  valueFormatter?: (value: number, name: string) => string;
  chartProps?: DuneRadialChartPassThrough;
  /** Applied to the auto-mounted PolarAngleAxis. */
  polarAngleAxisProps?: DuneRadialChartProps<T>['polarAngleAxisProps'];
  children?: ReactNode;
};

function DuneRadialChartRoot<T extends Record<string, unknown>>({
  data,
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
  polarAngleAxisProps,
  children,
}: DuneRadialChartRootProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp, DEFAULT_PIXEL);
  const { theme } = useDuneTheme();

  const collected = useMemo(() => collectChartParts(children), [children]);
  const dataKey = (collected.radialDataKey ?? 'value') as DataKey<T>;
  const nameKey = (collected.radialNameKey ?? 'name') as DataKey<T>;
  const effectiveFill = collected.radialFill ?? fill;

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

  const loadingRows = useMemo(() => buildLoadingRadialRows(loadingBarCount), [loadingBarCount]);
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

  const compositionValue = useMemo<ChartCompositionValue>(
    () => ({
      data,
      config,
      pixel,
      fill: effectiveFill,
      loading,
      valueFormatter,
      title,
      categories: barNames,
      indexKey: null,
      series: [],
    }),
    [data, config, pixel, effectiveFill, loading, valueFormatter, title, barNames],
  );

  if (!loading && data.length === 0) {
    return (
      <ChartEmptyState
        className={className}
        style={seriesStyle}
        height={height}
        title={title}
        description={description}
        emptyMessage={emptyMessage}
      />
    );
  }

  if (loading) {
    return (
      <ChartCompositionProvider value={compositionValue}>
        <ChartLoadingShell
          className={className}
          style={seriesStyle}
          height={height}
          badge={<DuneChartLoadingBadge message={loadingMessage} indicator={loadingIndicator} />}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
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

                <RechartsRadialBar
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
                </RechartsRadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </ChartLoadingShell>
      </ChartCompositionProvider>
    );
  }

  return (
    <ChartCompositionProvider value={compositionValue}>
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
              fill={effectiveFill}
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

          {rewriteRadialBarChildren(children, renderHitShape, prefersReducedMotion)}
        </RadialBarChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function rewriteRadialBarChildren(
  children: ReactNode,
  renderHitShape: (props: SectorProps) => ReactElement,
  prefersReducedMotion: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const resolved = readPartMetaFromType(child.type, props);
    if (resolved?.part === 'radial-bar') {
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        shape: renderHitShape,
        isAnimationActive: !prefersReducedMotion,
      });
    }
    return child;
  });
}

function isLegacyRadialProps<T extends Record<string, unknown>>(
  props: DuneRadialChartRootProps<T> | DuneRadialChartProps<T>,
): props is DuneRadialChartProps<T> {
  return 'dataKey' in props && props.dataKey != null;
}

function DuneRadialChartLegacy<T extends Record<string, unknown>>(props: DuneRadialChartProps<T>) {
  const {
    data,
    dataKey,
    nameKey,
    config,
    fill,
    pixel,
    className,
    height,
    title,
    description,
    emptyMessage,
    loading,
    loadingMessage,
    loadingIndicator,
    valueFormatter,
    chartProps,
    radialBarProps,
    polarAngleAxisProps,
    tooltipProps,
    legendProps,
    children,
  } = props;

  const {
    activeShape: _activeShape,
    background: _background,
    shape: _shape,
    fill: _rechartsFill,
    ...restRadialBarProps
  } = (radialBarProps ?? {}) as DuneRadialBarPassThrough & { fill?: string };

  return (
    <DuneRadialChartRoot
      data={data}
      config={config}
      fill={fill}
      pixel={pixel}
      className={className}
      height={height}
      title={title}
      description={description}
      emptyMessage={emptyMessage}
      loading={loading}
      loadingMessage={loadingMessage}
      loadingIndicator={loadingIndicator}
      valueFormatter={valueFormatter}
      chartProps={chartProps}
      polarAngleAxisProps={polarAngleAxisProps}
    >
      <DuneTooltip cursor={false} {...tooltipProps} />
      <DuneLegend {...legendProps} />
      <RadialBar dataKey={dataKey} nameKey={nameKey} {...restRadialBarProps} />
      {children}
    </DuneRadialChartRoot>
  );
}

function DuneRadialChartInner<T extends Record<string, unknown>>(
  props: DuneRadialChartRootProps<T> | DuneRadialChartProps<T>,
) {
  if (isLegacyRadialProps(props)) {
    return <DuneRadialChartLegacy {...props} />;
  }
  return <DuneRadialChartRoot {...props} />;
}

export const DuneRadialChart = Object.assign(DuneRadialChartInner, {
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  RadialBar: RadialBar,
}) as typeof DuneRadialChartInner & {
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  RadialBar: typeof RadialBar;
};

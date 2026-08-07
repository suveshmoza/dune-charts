import {
  Children,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart,
  ResponsiveContainer,
  type RadarProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DuneRadarChartPassThrough,
  DuneRadarChartProps,
  DuneRadarSeriesPassThrough,
  DuneSeriesConfig,
} from '../../types';
import { usePrefersReducedMotion } from '../../utils/reducedMotion';
import {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from '../../utils/series';
import { buildSeriesList } from '../shared/buildSeriesList';
import { DuneLegend, DuneTooltip } from '../shared/cartesianParts';
import {
  buildLoadingRadarRows,
  buildLoadingRadarSeriesFromRows,
  DEFAULT_LOADING_RADAR_COUNT,
  LOADING_RADAR_INDEX_KEY,
  LOADING_RADAR_VALUE_KEY,
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
  asDataKeyString,
  ChartCompositionProvider,
  collectChartParts,
  markDunePart,
  mergeSeriesConfig,
  readPartMetaFromType,
  type ChartCompositionValue,
} from '../shared/composition';
import type { PixelWaveBands, PixelWaveFill } from '../shared/pixelWaveEngine';
import { DunePolarAngleAxis, DunePolarGrid, DunePolarRadiusAxis } from '../shared/polarParts';
import { PixelRadarPlotLayer } from './PixelRadarPlotLayer';

export type { DuneRadarChartProps };

export type DuneRadarChartRadarProps = Omit<
  RadarProps<unknown, unknown>,
  'data' | 'name' | 'fill'
> & {
  dataKey: string;
  /** Pixel fill style for this series (falls back to chart `fill`). */
  fill?: PixelWaveFill;
  color?: string;
  bands?: PixelWaveBands;
};

const Radar = markDunePart(
  function Radar({
    dataKey,
    fill: _pixelFill,
    color: _color,
    bands: _bands,
    strokeOpacity = 0,
    fillOpacity = 0,
    dot = false,
    activeDot = false,
    legendType = 'square',
    ...rest
  }: DuneRadarChartRadarProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    return (
      <RechartsRadar
        dataKey={dataKey}
        name={dataKey}
        stroke="transparent"
        strokeOpacity={strokeOpacity}
        fill="transparent"
        fillOpacity={fillOpacity}
        dot={dot}
        activeDot={activeDot}
        animationDuration={DUNE_DURATION}
        animationEasing={DUNE_EASE}
        isAnimationActive={!prefersReducedMotion}
        legendType={legendType}
        {...rest}
      />
    );
  },
  (props) => ({
    part: 'series',
    kind: 'radar',
    dataKey: props.dataKey,
    fill: props.fill,
    color: props.color,
    bands: props.bands,
  }),
);

export type DuneRadarChartRootProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
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
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  chartProps?: DuneRadarChartPassThrough;
  children?: ReactNode;
};

function DuneRadarChartRoot<T extends Record<string, unknown>>({
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
  children,
}: DuneRadarChartRootProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp, DEFAULT_PIXEL);
  const { theme } = useDuneTheme();

  const collected = useMemo(() => collectChartParts(children), [children]);
  const categories = useMemo(
    () => collected.series.map((entry) => entry.dataKey),
    [collected.series],
  );
  const indexKey = collected.indexKey;
  const mergedConfig = useMemo(
    () => mergeSeriesConfig(config as Partial<Record<string, DuneSeriesConfig>>, collected.series),
    [config, collected.series],
  );

  const seriesStyle = buildSeriesStyle(categories, mergedConfig);
  const [baseColors, setBaseColors] = useState<string[]>([]);
  const [trackColor, setTrackColor] = useState('#d9d3c8');

  useLayoutEffect(() => {
    const host = containerRef.current;
    if (host == null) return;
    setTrackColor(resolveCssColor(host, 'var(--dune-track)'));
    if (categories.length === 0) {
      setBaseColors([]);
      return;
    }
    setBaseColors(resolveSeriesBaseColors(host, categories.length));
  }, [categories, mergedConfig, theme, loading]);

  const radarSeries = useMemo(
    () =>
      buildSeriesList(
        data,
        categories as DataKey<T>[],
        mergedConfig as Partial<Record<DataKey<T>, DuneSeriesConfig>>,
        baseColors,
        undefined,
        undefined,
      ),
    [data, categories, mergedConfig, baseColors],
  );
  const paintsReady = categories.length > 0 && baseColors.length === categories.length;

  const loadingPointCount = useMemo(() => {
    if (data.length > 0) return Math.max(5, Math.min(10, data.length));
    return DEFAULT_LOADING_RADAR_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(() => buildLoadingRadarRows(loadingPointCount), [loadingPointCount]);
  const loadingSeries = useMemo(
    () => buildLoadingRadarSeriesFromRows(loadingRows, trackColor),
    [loadingRows, trackColor],
  );

  const compositionValue = useMemo<ChartCompositionValue>(
    () => ({
      data,
      config: mergedConfig,
      pixel,
      fill,
      loading,
      valueFormatter: valueFormatter as ((value: number, key: string) => string) | undefined,
      title,
      categories,
      indexKey,
      series: collected.series,
    }),
    [
      data,
      mergedConfig,
      pixel,
      fill,
      loading,
      valueFormatter,
      title,
      categories,
      indexKey,
      collected.series,
    ],
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
              <RadarChart
                data={loadingRows}
                margin={{ top: 16, right: 24, left: 24, bottom: 8 }}
                accessibilityLayer={false}
              >
                <PolarAngleAxis dataKey={LOADING_RADAR_INDEX_KEY} tick={false} axisLine={false} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />

                <PixelRadarPlotLayer
                  series={loadingSeries}
                  pointCount={loadingRows.length}
                  pixel={pixel}
                  fill="dither"
                  domainMax={100}
                  shimmer={!prefersReducedMotion}
                />

                <RechartsRadar
                  dataKey={LOADING_RADAR_VALUE_KEY}
                  stroke="none"
                  fill="transparent"
                  fillOpacity={0}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartLoadingShell>
      </ChartCompositionProvider>
    );
  }

  const { accessibilityLayer: chartAccessibilityLayer = true, ...restChartProps } =
    chartProps ?? {};

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
        <RadarChart
          data={[...data]}
          margin={{ top: 16, right: 24, left: 24, bottom: 8 }}
          accessibilityLayer={chartAccessibilityLayer}
          {...restChartProps}
        >
          {paintsReady ? (
            <PixelRadarPlotLayer
              series={radarSeries}
              pointCount={data.length}
              pixel={pixel}
              fill={fill}
              animate={!prefersReducedMotion}
            />
          ) : null}

          {rewriteRadarSeriesChildren(children, categories, mergedConfig, prefersReducedMotion)}
        </RadarChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function rewriteRadarSeriesChildren(
  children: ReactNode,
  categories: readonly string[],
  config: Partial<Record<string, DuneSeriesConfig>>,
  prefersReducedMotion: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const meta = readPartMetaFromType(child.type, props);
    if (meta?.part === 'series' && meta.kind === 'radar') {
      const dataKey = asDataKeyString(props.dataKey);
      const i = categories.indexOf(dataKey);
      const color = i >= 0 ? getSeriesVar(i) : 'transparent';
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        name: config[dataKey]?.label ?? dataKey,
        stroke: color,
        fill: color,
        strokeOpacity: 0,
        fillOpacity: 0,
        isAnimationActive: !prefersReducedMotion,
      });
    }
    return child;
  });
}

function isLegacyRadarProps<T extends Record<string, unknown>>(
  props: DuneRadarChartRootProps<T> | DuneRadarChartProps<T>,
): props is DuneRadarChartProps<T> {
  return 'categories' in props && Array.isArray(props.categories);
}

function DuneRadarChartLegacy<T extends Record<string, unknown>>(props: DuneRadarChartProps<T>) {
  const {
    data,
    categories,
    index,
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
    seriesProps,
    polarAngleAxisProps,
    polarRadiusAxisProps,
    polarGridProps,
    tooltipProps,
    legendProps,
    children,
  } = props;

  return (
    <DuneRadarChartRoot
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
    >
      <DunePolarGrid {...polarGridProps} />
      <DunePolarAngleAxis dataKey={index} {...polarAngleAxisProps} />
      <DunePolarRadiusAxis {...polarRadiusAxisProps} />
      <DuneTooltip cursor={false} {...tooltipProps} />
      <DuneLegend {...legendProps} />
      {categories.map((key) => {
        const { fill: _rechartsFill, ...seriesRest } = (seriesProps?.[key] ??
          {}) as DuneRadarSeriesPassThrough & { fill?: string };
        return <Radar key={key} dataKey={key} {...seriesRest} />;
      })}
      {children}
    </DuneRadarChartRoot>
  );
}

function DuneRadarChartInner<T extends Record<string, unknown>>(
  props: DuneRadarChartRootProps<T> | DuneRadarChartProps<T>,
) {
  if (isLegacyRadarProps(props)) {
    return <DuneRadarChartLegacy {...props} />;
  }
  return <DuneRadarChartRoot {...props} />;
}

export const DuneRadarChart = Object.assign(DuneRadarChartInner, {
  PolarGrid: DunePolarGrid,
  PolarAngleAxis: DunePolarAngleAxis,
  PolarRadiusAxis: DunePolarRadiusAxis,
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  Radar: Radar,
}) as typeof DuneRadarChartInner & {
  PolarGrid: typeof DunePolarGrid;
  PolarAngleAxis: typeof DunePolarAngleAxis;
  PolarRadiusAxis: typeof DunePolarRadiusAxis;
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  Radar: typeof Radar;
};

export type { PixelWaveBands };

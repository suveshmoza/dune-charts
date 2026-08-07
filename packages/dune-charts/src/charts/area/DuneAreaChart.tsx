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
  Area as RechartsArea,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type AreaProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DuneAreaChartPassThrough,
  DuneAreaSeriesPassThrough,
  DuneCartesianChartProps,
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
import {
  DuneCartesianGrid,
  DuneLegend,
  DuneTooltip,
  DuneXAxis,
  DuneYAxis,
} from '../shared/cartesianParts';
import {
  buildLoadingAreaRows,
  buildLoadingAreaSeriesFromRows,
  DEFAULT_LOADING_AREA_COUNT,
  LOADING_AREA_INDEX_KEY,
  LOADING_AREA_VALUE_KEY,
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
  seriesPropsFromRegistry,
  type ChartCompositionValue,
} from '../shared/composition';
import type { PixelWaveBands, PixelWaveFill } from '../shared/pixelWaveEngine';
import { PixelWavePlotLayer } from './PixelWavePlotLayer';

export type DuneAreaChartAreaProps = Omit<AreaProps<unknown, unknown>, 'data' | 'name' | 'fill'> & {
  dataKey: string;
  /** Pixel fill style for this series (falls back to chart `fill`). */
  fill?: PixelWaveFill;
  color?: string;
  bands?: PixelWaveBands;
};

const Area = markDunePart(
  function Area({
    dataKey,
    fill: _pixelFill,
    color: _color,
    bands: _bands,
    stackId,
    type = 'monotone',
    strokeOpacity = 0,
    strokeWidth = 2,
    strokeLinecap = 'square',
    strokeLinejoin = 'miter',
    dot = false,
    legendType = 'square',
    ...rest
  }: DuneAreaChartAreaProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    return (
      <RechartsArea
        type={type}
        dataKey={dataKey}
        name={dataKey}
        stackId={stackId}
        stroke="transparent"
        fill="transparent"
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
        dot={dot}
        activeDot={{ r: 4, strokeWidth: 0 }}
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
    kind: 'area',
    dataKey: props.dataKey,
    fill: props.fill,
    color: props.color,
    bands: props.bands,
    stackId: props.stackId,
  }),
);

export type DuneAreaChartRootProps<T extends Record<string, unknown>> = {
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
  chartProps?: DuneAreaChartPassThrough;
  children?: ReactNode;
};

function DuneAreaChartRoot<T extends Record<string, unknown>>({
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
}: DuneAreaChartRootProps<T>) {
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
  const seriesPropMap = useMemo(
    () => seriesPropsFromRegistry(collected.series),
    [collected.series],
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

  const waveSeries = useMemo(
    () =>
      buildSeriesList(
        data,
        categories as DataKey<T>[],
        mergedConfig as Partial<Record<DataKey<T>, DuneSeriesConfig>>,
        baseColors,
        seriesPropMap as Partial<Record<DataKey<T>, { stackId?: string | number }>>,
        chartProps,
      ),
    [data, categories, mergedConfig, baseColors, seriesPropMap, chartProps],
  );
  const paintsReady = categories.length > 0 && baseColors.length === categories.length;
  const indexValues = useMemo(() => {
    if (indexKey == null) return data.map((_, i) => i);
    return data.map((row) => row[indexKey as DataKey<T>]);
  }, [data, indexKey]);

  const loadingPointCount = useMemo(() => {
    if (data.length > 0) return Math.max(8, Math.min(24, data.length));
    return DEFAULT_LOADING_AREA_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(() => buildLoadingAreaRows(loadingPointCount), [loadingPointCount]);
  const loadingSeries = useMemo(
    () => buildLoadingAreaSeriesFromRows(loadingRows, trackColor),
    [loadingRows, trackColor],
  );
  const loadingIndexValues = useMemo(
    () => loadingRows.map((row) => row[LOADING_AREA_INDEX_KEY]),
    [loadingRows],
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
      stackOffset: chartProps?.stackOffset,
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
      chartProps?.stackOffset,
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
              <AreaChart
                data={loadingRows}
                margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                accessibilityLayer={false}
              >
                <XAxis dataKey={LOADING_AREA_INDEX_KEY} hide />
                <YAxis hide domain={[0, 100]} width={0} />
                <PixelWavePlotLayer
                  series={loadingSeries}
                  pointCount={loadingRows.length}
                  indexValues={loadingIndexValues}
                  pixel={pixel}
                  fill="dither"
                  shimmer={!prefersReducedMotion}
                />
                <RechartsArea
                  type="monotone"
                  dataKey={LOADING_AREA_VALUE_KEY}
                  fill="transparent"
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                  tooltipType="none"
                  activeDot={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartLoadingShell>
      </ChartCompositionProvider>
    );
  }

  const { accessibilityLayer: chartAccessibilityLayer = true, ...restChartProps } =
    chartProps ?? {};

  // Inject per-series stroke colors by cloning isn't needed — render hit areas with indexed colors.
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
        <AreaChart
          data={[...data]}
          margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          accessibilityLayer={chartAccessibilityLayer}
          {...restChartProps}
        >
          {paintsReady ? (
            <PixelWavePlotLayer
              series={waveSeries}
              pointCount={data.length}
              indexValues={indexValues}
              pixel={pixel}
              fill={fill}
            />
          ) : null}

          {rewriteAreaSeriesChildren(children, categories, mergedConfig, prefersReducedMotion)}
        </AreaChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function rewriteAreaSeriesChildren(
  children: ReactNode,
  categories: readonly string[],
  config: Partial<Record<string, DuneSeriesConfig>>,
  prefersReducedMotion: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const meta = readPartMetaFromType(child.type, props);
    if (meta?.part === 'series' && meta.kind === 'area') {
      const dataKey = asDataKeyString(props.dataKey);
      const i = categories.indexOf(dataKey);
      const color = i >= 0 ? getSeriesVar(i) : 'transparent';
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        name: config[dataKey]?.label ?? dataKey,
        stroke: color,
        activeDot: { r: 4, strokeWidth: 0, fill: color },
        isAnimationActive: !prefersReducedMotion,
      });
    }
    return child;
  });
}

/** @deprecated Prefer compound children (`DuneAreaChart.Area`, `.XAxis`, …). */
export type DuneAreaChartProps<T> = DuneCartesianChartProps<T>;

function isLegacyAreaProps<T extends Record<string, unknown>>(
  props: DuneAreaChartRootProps<T> | DuneAreaChartProps<T>,
): props is DuneAreaChartProps<T> {
  return 'categories' in props && Array.isArray(props.categories);
}

function DuneAreaChartLegacy<T extends Record<string, unknown>>(props: DuneAreaChartProps<T>) {
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
    xAxisProps,
    yAxisProps,
    tooltipProps,
    legendProps,
    children,
  } = props;

  return (
    <DuneAreaChartRoot
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
      <DuneCartesianGrid />
      <DuneXAxis dataKey={index} {...xAxisProps} />
      <DuneYAxis {...yAxisProps} />
      <DuneTooltip {...tooltipProps} />
      <DuneLegend {...legendProps} />
      {categories.map((key) => {
        const { fill: _rechartsFill, ...seriesRest } = (seriesProps?.[key] ??
          {}) as DuneAreaSeriesPassThrough & { fill?: string };
        return <Area key={key} dataKey={key} {...seriesRest} />;
      })}
      {children}
    </DuneAreaChartRoot>
  );
}

function DuneAreaChartInner<T extends Record<string, unknown>>(
  props: DuneAreaChartRootProps<T> | DuneAreaChartProps<T>,
) {
  if (isLegacyAreaProps(props)) {
    return <DuneAreaChartLegacy {...props} />;
  }
  return <DuneAreaChartRoot {...props} />;
}

export const DuneAreaChart = Object.assign(DuneAreaChartInner, {
  Grid: DuneCartesianGrid,
  XAxis: DuneXAxis,
  YAxis: DuneYAxis,
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  Area: Area,
}) as typeof DuneAreaChartInner & {
  Grid: typeof DuneCartesianGrid;
  XAxis: typeof DuneXAxis;
  YAxis: typeof DuneYAxis;
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  Area: typeof Area;
};

export type { PixelWaveBands };

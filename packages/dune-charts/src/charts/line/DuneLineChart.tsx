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
  Line as RechartsLine,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type LineProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DuneLineChartPassThrough,
  DuneLineChartProps,
  DuneLineSeriesPassThrough,
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
import type { PixelWaveBands } from '../shared/pixelWaveEngine';
import { PixelLinePlotLayer } from './PixelLinePlotLayer';

export type { DuneLineChartProps };

export type DuneLineChartLineProps = Omit<LineProps<unknown, unknown>, 'data' | 'name'> & {
  dataKey: string;
  color?: string;
  bands?: PixelWaveBands;
};

const Line = markDunePart(
  function Line({
    dataKey,
    color: _color,
    bands: _bands,
    type = 'stepAfter',
    strokeOpacity = 0,
    strokeWidth = 2,
    dot = false,
    activeDot = false,
    legendType = 'square',
    ...rest
  }: DuneLineChartLineProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    return (
      <RechartsLine
        type={type}
        dataKey={dataKey}
        name={dataKey}
        stroke="transparent"
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
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
    kind: 'line',
    dataKey: props.dataKey,
    color: props.color,
    bands: props.bands,
  }),
);

export type DuneLineChartRootProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
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
  chartProps?: DuneLineChartPassThrough;
  children?: ReactNode;
};

function DuneLineChartRoot<T extends Record<string, unknown>>({
  data,
  config,
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
}: DuneLineChartRootProps<T>) {
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

  const lineSeries = useMemo(
    () =>
      buildSeriesList(
        data,
        categories as DataKey<T>[],
        mergedConfig as Partial<Record<DataKey<T>, DuneSeriesConfig>>,
        baseColors,
        seriesPropMap as Partial<Record<DataKey<T>, { stackId?: string | number }>>,
        undefined,
      ),
    [data, categories, mergedConfig, baseColors, seriesPropMap],
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
      fill: 'bands',
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
              <LineChart
                data={loadingRows}
                margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
                accessibilityLayer={false}
              >
                <XAxis dataKey={LOADING_AREA_INDEX_KEY} hide />
                <YAxis hide domain={[0, 100]} width={0} />
                <PixelLinePlotLayer
                  series={loadingSeries}
                  pointCount={loadingRows.length}
                  indexValues={loadingIndexValues}
                  pixel={pixel}
                  shimmer={!prefersReducedMotion}
                />
                <RechartsLine
                  type="stepAfter"
                  dataKey={LOADING_AREA_VALUE_KEY}
                  stroke="transparent"
                  strokeOpacity={0}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  legendType="none"
                  tooltipType="none"
                />
              </LineChart>
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
        <LineChart
          data={[...data]}
          margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          accessibilityLayer={chartAccessibilityLayer}
          {...restChartProps}
        >
          {paintsReady ? (
            <PixelLinePlotLayer
              series={lineSeries}
              pointCount={data.length}
              indexValues={indexValues}
              pixel={pixel}
              animate={!prefersReducedMotion}
            />
          ) : null}

          {rewriteLineSeriesChildren(children, categories, mergedConfig, prefersReducedMotion)}
        </LineChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function rewriteLineSeriesChildren(
  children: ReactNode,
  categories: readonly string[],
  config: Partial<Record<string, DuneSeriesConfig>>,
  prefersReducedMotion: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const meta = readPartMetaFromType(child.type, props);
    if (meta?.part === 'series' && meta.kind === 'line') {
      const dataKey = asDataKeyString(props.dataKey);
      const i = categories.indexOf(dataKey);
      const color = i >= 0 ? getSeriesVar(i) : 'transparent';
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        name: config[dataKey]?.label ?? dataKey,
        stroke: color,
        strokeOpacity: 0,
        isAnimationActive: !prefersReducedMotion,
      });
    }
    return child;
  });
}

function isLegacyLineProps<T extends Record<string, unknown>>(
  props: DuneLineChartRootProps<T> | DuneLineChartProps<T>,
): props is DuneLineChartProps<T> {
  return 'categories' in props && Array.isArray(props.categories);
}

function DuneLineChartLegacy<T extends Record<string, unknown>>(props: DuneLineChartProps<T>) {
  const {
    data,
    categories,
    index,
    config,
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
    <DuneLineChartRoot
      data={data}
      config={config}
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
          {}) as DuneLineSeriesPassThrough & { fill?: string };
        return <Line key={key} dataKey={key} {...seriesRest} />;
      })}
      {children}
    </DuneLineChartRoot>
  );
}

function DuneLineChartInner<T extends Record<string, unknown>>(
  props: DuneLineChartRootProps<T> | DuneLineChartProps<T>,
) {
  if (isLegacyLineProps(props)) {
    return <DuneLineChartLegacy {...props} />;
  }
  return <DuneLineChartRoot {...props} />;
}

export const DuneLineChart = Object.assign(DuneLineChartInner, {
  Grid: DuneCartesianGrid,
  XAxis: DuneXAxis,
  YAxis: DuneYAxis,
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  Line: Line,
}) as typeof DuneLineChartInner & {
  Grid: typeof DuneCartesianGrid;
  XAxis: typeof DuneXAxis;
  YAxis: typeof DuneYAxis;
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  Line: typeof Line;
};

export type { PixelWaveBands };

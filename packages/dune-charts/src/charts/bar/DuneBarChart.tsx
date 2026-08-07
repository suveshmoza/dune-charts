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
  Bar as RechartsBar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type BarProps,
} from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DuneBarChartPassThrough,
  DuneBarChartProps,
  DuneBarSeriesPassThrough,
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
  buildLoadingBarRows,
  buildLoadingBarSeriesFromRows,
  DEFAULT_LOADING_BAR_COUNT,
  LOADING_BAR_INDEX_KEY,
  LOADING_BAR_VALUE_KEY,
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
import type { PixelBarChartLayout } from './pixelBarEngine';
import { PixelBarPlotLayer } from './PixelBarPlotLayer';

export type { DuneBarChartProps };

export type DuneBarChartBarProps = Omit<BarProps<unknown, unknown>, 'data' | 'name' | 'fill'> & {
  dataKey: string;
  /** Pixel fill style for this series (falls back to chart `fill`). */
  fill?: PixelWaveFill;
  color?: string;
  bands?: PixelWaveBands;
};

const Bar = markDunePart(
  function Bar({
    dataKey,
    fill: _pixelFill,
    color: _color,
    bands: _bands,
    stackId,
    fillOpacity = 0,
    stroke = 'none',
    maxBarSize = 48,
    legendType = 'square',
    activeBar = false,
    ...rest
  }: DuneBarChartBarProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    return (
      <RechartsBar
        dataKey={dataKey}
        name={dataKey}
        stackId={stackId}
        fill="transparent"
        fillOpacity={fillOpacity}
        stroke={stroke}
        maxBarSize={maxBarSize}
        animationDuration={DUNE_DURATION}
        animationEasing={DUNE_EASE}
        isAnimationActive={!prefersReducedMotion}
        legendType={legendType}
        activeBar={activeBar}
        {...rest}
      />
    );
  },
  (props) => ({
    part: 'series',
    kind: 'bar',
    dataKey: props.dataKey,
    fill: props.fill,
    color: props.color,
    bands: props.bands,
    stackId: props.stackId,
  }),
);

export type DuneBarChartRootProps<T extends Record<string, unknown>> = {
  data: readonly T[];
  config?: Partial<Record<DataKey<T>, DuneSeriesConfig>>;
  fill?: PixelWaveFill;
  pixel?: number;
  /** Recharts BarChart layout. Default `horizontal` (vertical bars). `vertical` = horizontal bars. */
  layout?: PixelBarChartLayout;
  className?: string;
  height?: DuneChartSize;
  title?: string;
  description?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  loadingIndicator?: ReactNode;
  valueFormatter?: (value: number, key: DataKey<T>) => string;
  chartProps?: DuneBarChartPassThrough;
  children?: ReactNode;
};

function findYAxisDataKey(children: ReactNode): string | null {
  let found: string | null = null;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    const meta = readPartMetaFromType(child.type, props);
    if (meta?.part !== 'y-axis') return;
    const fromMeta = 'dataKey' in meta ? meta.dataKey : undefined;
    const fromProps = typeof props.dataKey === 'string' ? props.dataKey : undefined;
    const key = fromMeta ?? fromProps;
    if (key != null && key !== '') found = key;
  });
  return found;
}

function DuneBarChartRoot<T extends Record<string, unknown>>({
  data,
  config,
  fill = 'bands',
  pixel: pixelProp,
  layout: layoutProp,
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
}: DuneBarChartRootProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp, DEFAULT_PIXEL);
  const { theme } = useDuneTheme();

  const {
    accessibilityLayer: chartAccessibilityLayer = true,
    layout: layoutFromChartProps = 'horizontal',
    ...restChartProps
  } = chartProps ?? {};
  const barLayout: PixelBarChartLayout = layoutProp ?? layoutFromChartProps;
  const isHorizontalBars = barLayout === 'vertical';

  const collected = useMemo(() => collectChartParts(children), [children]);
  const categories = useMemo(
    () => collected.series.map((entry) => entry.dataKey),
    [collected.series],
  );
  const indexKey = isHorizontalBars
    ? (findYAxisDataKey(children) ?? collected.indexKey)
    : collected.indexKey;
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

  const barSeries = useMemo(
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

  const loadingBarCount = useMemo(() => {
    if (data.length > 0) return Math.max(6, Math.min(16, data.length));
    return DEFAULT_LOADING_BAR_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(() => buildLoadingBarRows(loadingBarCount), [loadingBarCount]);
  const loadingSeries = useMemo(
    () => buildLoadingBarSeriesFromRows(loadingRows, trackColor),
    [loadingRows, trackColor],
  );
  const loadingIndexValues = useMemo(
    () => loadingRows.map((row) => row[LOADING_BAR_INDEX_KEY]),
    [loadingRows],
  );

  const chartMargin = isHorizontalBars
    ? { top: 12, right: 16, left: 8, bottom: 4 }
    : { top: 12, right: 16, left: 4, bottom: 4 };

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
              <BarChart
                data={loadingRows}
                margin={chartMargin}
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
                <RechartsBar
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
        <BarChart
          data={[...data]}
          margin={chartMargin}
          accessibilityLayer={chartAccessibilityLayer}
          layout={barLayout}
          {...restChartProps}
        >
          {paintsReady ? (
            <PixelBarPlotLayer
              series={barSeries}
              pointCount={data.length}
              indexValues={indexValues}
              pixel={pixel}
              fill={fill}
              layout={barLayout}
              animate={!prefersReducedMotion}
            />
          ) : null}

          {rewriteBarSeriesChildren(children, categories, mergedConfig, prefersReducedMotion)}
        </BarChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function rewriteBarSeriesChildren(
  children: ReactNode,
  categories: readonly string[],
  config: Partial<Record<string, DuneSeriesConfig>>,
  prefersReducedMotion: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const props = child.props as Record<string, unknown>;
    const meta = readPartMetaFromType(child.type, props);
    if (meta?.part === 'series' && meta.kind === 'bar') {
      const dataKey = asDataKeyString(props.dataKey);
      const i = categories.indexOf(dataKey);
      const color = i >= 0 ? getSeriesVar(i) : 'transparent';
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        name: config[dataKey]?.label ?? dataKey,
        fill: color,
        fillOpacity: 0,
        isAnimationActive: !prefersReducedMotion,
      });
    }
    return child;
  });
}

function isLegacyBarProps<T extends Record<string, unknown>>(
  props: DuneBarChartRootProps<T> | DuneBarChartProps<T>,
): props is DuneBarChartProps<T> {
  return 'categories' in props && Array.isArray(props.categories);
}

function DuneBarChartLegacy<T extends Record<string, unknown>>(props: DuneBarChartProps<T>) {
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

  const barLayout: PixelBarChartLayout = chartProps?.layout ?? 'horizontal';
  const isHorizontalBars = barLayout === 'vertical';

  return (
    <DuneBarChartRoot
      data={data}
      config={config}
      fill={fill}
      pixel={pixel}
      layout={barLayout}
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
      {isHorizontalBars ? (
        <>
          <DuneXAxis type="number" domain={[0, 'auto']} dy={0} {...xAxisProps} />
          <DuneYAxis type="category" dataKey={index} {...yAxisProps} />
        </>
      ) : (
        <>
          <DuneXAxis dataKey={index} {...xAxisProps} />
          <DuneYAxis {...yAxisProps} />
        </>
      )}
      <DuneTooltip cursor={false} {...tooltipProps} />
      <DuneLegend {...legendProps} />
      {categories.map((key) => {
        const { fill: _rechartsFill, ...seriesRest } = (seriesProps?.[key] ??
          {}) as DuneBarSeriesPassThrough & { fill?: string };
        return <Bar key={key} dataKey={key} {...seriesRest} />;
      })}
      {children}
    </DuneBarChartRoot>
  );
}

function DuneBarChartInner<T extends Record<string, unknown>>(
  props: DuneBarChartRootProps<T> | DuneBarChartProps<T>,
) {
  if (isLegacyBarProps(props)) {
    return <DuneBarChartLegacy {...props} />;
  }
  return <DuneBarChartRoot {...props} />;
}

export const DuneBarChart = Object.assign(DuneBarChartInner, {
  Grid: DuneCartesianGrid,
  XAxis: DuneXAxis,
  YAxis: DuneYAxis,
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  Bar: Bar,
}) as typeof DuneBarChartInner & {
  Grid: typeof DuneCartesianGrid;
  XAxis: typeof DuneXAxis;
  YAxis: typeof DuneYAxis;
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  Bar: typeof Bar;
};

export type { PixelWaveBands };

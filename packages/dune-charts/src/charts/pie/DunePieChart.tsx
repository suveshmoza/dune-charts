import {
  Children,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Cell, Pie as RechartsPie, PieChart, ResponsiveContainer, type PieProps } from 'recharts';

import { DuneChartContainer } from '../../primitives/DuneChartContainer';
import type { DuneChartSize } from '../../primitives/DuneChartContainer';
import { DEFAULT_LOADING_MESSAGE, DuneChartLoadingBadge } from '../../primitives/DuneChartLoading';
import { useDuneTheme } from '../../provider/DuneChartProvider';
import type {
  DataKey,
  DunePieChartPassThrough,
  DunePieChartProps,
  DunePiePassThrough,
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
  buildLoadingPieRows,
  buildLoadingPieSlices,
  DEFAULT_LOADING_PIE_COUNT,
  LOADING_PIE_NAME_KEY,
  LOADING_PIE_VALUE_KEY,
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
import { buildPieSliceList, type PixelPieLayoutOptions } from './pixelPieEngine';
import { PixelPiePlotLayer } from './PixelPiePlotLayer';

export type { DunePieChartProps };

export type DunePieChartPieProps = Omit<
  PieProps<unknown, unknown>,
  'data' | 'dataKey' | 'nameKey' | 'fill'
> & {
  dataKey: string;
  nameKey?: string;
  /** Pixel fill style for this pie (falls back to chart `fill`). */
  fill?: PixelWaveFill;
};

const Pie = markDunePart(
  function Pie({
    dataKey,
    nameKey: nameKeyProp,
    fill: _pixelFill,
    activeShape: _activeShape,
    isAnimationActive,
    animationDuration,
    animationEasing,
    ...rest
  }: DunePieChartPieProps) {
    const { data, categories: sliceNames } = useChartComposition();
    const prefersReducedMotion = usePrefersReducedMotion();
    const nameKey = nameKeyProp ?? 'name';

    return (
      <RechartsPie
        data={[...data]}
        dataKey={dataKey}
        nameKey={nameKey}
        {...rest}
        stroke="none"
        isAnimationActive={isAnimationActive ?? !prefersReducedMotion}
        animationDuration={animationDuration ?? DUNE_DURATION}
        animationEasing={animationEasing ?? DUNE_EASE}
        activeShape={false}
        legendType="square"
      >
        {sliceNames.map((name, i) => (
          <Cell key={name} fill={getSeriesVar(i)} fillOpacity={0} stroke="none" />
        ))}
      </RechartsPie>
    );
  },
  (props) => ({
    part: 'pie',
    dataKey: props.dataKey,
    nameKey: props.nameKey,
    fill: props.fill,
  }),
);

export type DunePieChartRootProps<T extends Record<string, unknown>> = {
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
  chartProps?: DunePieChartPassThrough;
  children?: ReactNode;
};

function extractPieChildProps(children: ReactNode): DunePiePassThrough {
  let found: DunePiePassThrough = {};
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    const resolved = readPartMetaFromType(child.type, props);
    if (resolved?.part !== 'pie') return;
    const {
      dataKey: _dataKey,
      nameKey: _nameKey,
      fill: _fill,
      ...rest
    } = props as DunePieChartPieProps;
    found = rest;
  });
  return found;
}

function pieLayoutFromProps(pieProps: DunePiePassThrough): Omit<PixelPieLayoutOptions, 'pixel'> {
  const { innerRadius, outerRadius, startAngle, endAngle, paddingAngle, cx, cy } = pieProps;
  return {
    innerRadius,
    outerRadius: typeof outerRadius === 'function' ? undefined : outerRadius,
    startAngle,
    endAngle,
    paddingAngle,
    cx,
    cy,
  };
}

function DunePieChartRoot<T extends Record<string, unknown>>({
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
}: DunePieChartRootProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const pixel = clampPixel(pixelProp, DEFAULT_PIXEL);
  const { theme } = useDuneTheme();

  const collected = useMemo(() => collectChartParts(children), [children]);
  const dataKey = (collected.pieDataKey ?? 'value') as DataKey<T>;
  const nameKey = (collected.pieNameKey ?? 'name') as DataKey<T>;
  const effectiveFill = collected.pieFill ?? fill;

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

  const pieChildProps = useMemo(() => extractPieChildProps(children), [children]);
  const layoutOptions = useMemo(() => pieLayoutFromProps(pieChildProps), [pieChildProps]);

  const loadingSliceCount = useMemo(() => {
    if (data.length > 0) return Math.max(4, Math.min(10, data.length));
    return DEFAULT_LOADING_PIE_COUNT;
  }, [data.length]);

  const loadingRows = useMemo(() => buildLoadingPieRows(loadingSliceCount), [loadingSliceCount]);
  const loadingSlices = useMemo(
    () => buildLoadingPieSlices(loadingSliceCount, trackColor),
    [loadingSliceCount, trackColor],
  );

  const compositionValue = useMemo<ChartCompositionValue>(
    () => ({
      data,
      config,
      pixel,
      fill: effectiveFill,
      loading,
      valueFormatter,
      title,
      categories: sliceNames,
      indexKey: null,
      series: [],
    }),
    [data, config, pixel, effectiveFill, loading, valueFormatter, title, sliceNames],
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
    const {
      activeShape: _activeShape,
      isAnimationActive: _isAnimationActive,
      animationDuration: _animationDuration,
      animationEasing: _animationEasing,
      ...restLoadingPieProps
    } = pieChildProps;

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
              <PieChart accessibilityLayer={false}>
                <PixelPiePlotLayer
                  slices={loadingSlices}
                  pixel={pixel}
                  fill="dither"
                  layoutOptions={layoutOptions}
                  shimmer={!prefersReducedMotion}
                />

                <RechartsPie
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
                    <Cell
                      key={String(row[LOADING_PIE_NAME_KEY])}
                      fill="transparent"
                      stroke="none"
                    />
                  ))}
                </RechartsPie>
              </PieChart>
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
        <PieChart accessibilityLayer={chartAccessibilityLayer} {...restChartProps}>
          {paintsReady ? (
            <PixelPiePlotLayer
              slices={slices}
              pixel={pixel}
              fill={effectiveFill}
              layoutOptions={layoutOptions}
              animate={!prefersReducedMotion}
            />
          ) : null}

          {children}
        </PieChart>
      </DuneChartContainer>
    </ChartCompositionProvider>
  );
}

function isLegacyPieProps<T extends Record<string, unknown>>(
  props: DunePieChartRootProps<T> | DunePieChartProps<T>,
): props is DunePieChartProps<T> {
  return 'dataKey' in props && props.dataKey != null;
}

function DunePieChartLegacy<T extends Record<string, unknown>>(props: DunePieChartProps<T>) {
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
    pieProps,
    tooltipProps,
    legendProps,
    children,
  } = props;

  const { fill: _rechartsFill, ...restPieProps } = (pieProps ?? {}) as DunePiePassThrough & {
    fill?: string;
  };

  return (
    <DunePieChartRoot
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
      <DuneTooltip {...tooltipProps} />
      <DuneLegend {...legendProps} />
      <Pie dataKey={dataKey} nameKey={nameKey} {...restPieProps} />
      {children}
    </DunePieChartRoot>
  );
}

function DunePieChartInner<T extends Record<string, unknown>>(
  props: DunePieChartRootProps<T> | DunePieChartProps<T>,
) {
  if (isLegacyPieProps(props)) {
    return <DunePieChartLegacy {...props} />;
  }
  return <DunePieChartRoot {...props} />;
}

export const DunePieChart = Object.assign(DunePieChartInner, {
  Tooltip: DuneTooltip,
  Legend: DuneLegend,
  Pie: Pie,
}) as typeof DunePieChartInner & {
  Tooltip: typeof DuneTooltip;
  Legend: typeof DuneLegend;
  Pie: typeof Pie;
};

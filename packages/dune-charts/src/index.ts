import './styles.css';

export {
  DuneChartProvider,
  useDuneTheme,
  type DuneChartContextValue,
  type DuneChartProviderProps,
} from './provider/DuneChartProvider';

export { DuneChartContainer, type DuneChartContainerProps } from './primitives/DuneChartContainer';

export {
  DuneChartLoading,
  DuneChartLoadingBadge,
  DEFAULT_LOADING_MESSAGE,
  type DuneChartLoadingProps,
  type DuneChartLoadingBadgeProps,
} from './primitives/DuneChartLoading';

export {
  DUNE_CSS_VARS,
  DUNE_THEMES,
  DUNE_TOKEN_KEYS,
  type DuneTheme,
  type DuneTokenKey,
} from './tokens/theme';

export type {
  DataKey,
  DuneAreaChartPassThrough,
  DuneAreaSeriesPassThrough,
  DuneBarChartPassThrough,
  DuneBarChartProps,
  DuneBarSeriesPassThrough,
  DuneCartesianChartProps,
  DuneLineChartPassThrough,
  DuneLineChartProps,
  DuneLineSeriesPassThrough,
  DunePieChartPassThrough,
  DunePieChartProps,
  DunePiePassThrough,
  DuneRadarChartPassThrough,
  DuneRadarChartProps,
  DuneRadarSeriesPassThrough,
  DuneRadialBarPassThrough,
  DuneRadialChartPassThrough,
  DuneRadialChartProps,
  DuneSeriesConfig,
} from './types';

export { DuneAreaChart, type DuneAreaChartProps } from './charts/area/DuneAreaChart';

export { DuneBarChart } from './charts/bar/DuneBarChart';

export { DuneLineChart } from './charts/line/DuneLineChart';

export { DunePieChart } from './charts/pie/DunePieChart';

export { DuneRadarChart } from './charts/radar/DuneRadarChart';

export { DuneRadialChart } from './charts/radial/DuneRadialChart';

export {
  bandsFromColor,
  bandsFromHue,
  resolveSeriesBands,
  PIXEL_WAVE_FILLS,
  DUNE_BAND_RAMPS,
  DUNE_SERIES_HUES,
  type PixelWaveBands,
  type PixelWaveFill,
  type PixelWaveSeries,
} from './charts/shared/pixelWaveEngine';

export {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from './utils/series';

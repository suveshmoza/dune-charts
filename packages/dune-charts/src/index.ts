import './styles.css';

export const DUNE_CHARTS_VERSION = '0.0.1';

export {
  DuneChartProvider,
  useDuneTheme,
  type DuneChartContextValue,
  type DuneChartProviderProps,
} from './provider/DuneChartProvider';

export { DuneChartContainer, type DuneChartContainerProps } from './primitives/DuneChartContainer';

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
  DuneSeriesConfig,
} from './types';

export { DuneAreaChart, type DuneAreaChartProps } from './charts/DuneAreaChart';

export { DuneBarChart } from './charts/DuneBarChart';

export { DuneLineChart } from './charts/DuneLineChart';

export { DunePieChart } from './charts/DunePieChart';

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
} from './charts/pixelWaveEngine';

export {
  buildSeriesStyle,
  getSeriesVar,
  resolveCssColor,
  resolveSeriesBaseColors,
} from './utils/series';

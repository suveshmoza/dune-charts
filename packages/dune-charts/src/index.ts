import './styles.css';

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
  DuneComposedChartPassThrough,
  DuneComposedChartProps,
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

export { DuneAreaChart, type DuneAreaChartProps } from './charts/DuneAreaChart';

export { DuneBarChart } from './charts/DuneBarChart';

export { DuneLineChart } from './charts/DuneLineChart';

export { DunePieChart } from './charts/DunePieChart';

export { DuneRadarChart } from './charts/DuneRadarChart';

export { DuneRadialChart } from './charts/DuneRadialChart';

export { DuneComposedChart } from './charts/DuneComposedChart';

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

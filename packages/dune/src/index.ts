import './styles.css';

export const DUNE_CHARTS_VERSION = '0.0.1';

export {
  DuneChartProvider,
  useDuneTheme,
  type DuneChartContextValue,
  type DuneChartProviderProps,
} from './provider/DuneChartProvider';

export { DUNE_GRAINS, type DuneGrain } from './provider/duneGrain';

export { DuneChartContainer, type DuneChartContainerProps } from './primitives/DuneChartContainer';

export {
  DUNE_CSS_VARS,
  DUNE_THEMES,
  DUNE_TOKEN_KEYS,
  type DuneTheme,
  type DuneTokenKey,
} from './tokens/theme';

export type { DataKey, DuneCartesianChartProps, DuneSeriesConfig } from './types';

export { DuneAreaChart, type DuneAreaChartProps } from './charts/DuneAreaChart';

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

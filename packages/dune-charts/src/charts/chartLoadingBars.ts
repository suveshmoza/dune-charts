import { bandsFromColor, type PixelWaveBands, type PixelWaveSeries } from './pixelWaveEngine';
import type { PixelPieSlice } from './pixelPieEngine';

export const LOADING_BAR_INDEX_KEY = '__dune_loading_i';
export const LOADING_BAR_VALUE_KEY = '__dune_loading';
export const LOADING_AREA_INDEX_KEY = '__dune_loading_i';
export const LOADING_AREA_VALUE_KEY = '__dune_loading';
export const DEFAULT_LOADING_BAR_COUNT = 12;
export const DEFAULT_LOADING_AREA_COUNT = 14;

/** Muted crest→depth ramp used when track color cannot be parsed. */
const FALLBACK_LOADING_BANDS: PixelWaveBands = [
  '#b8b2a8',
  '#c9c3b8',
  '#d9d3c8',
  '#e6e1d8',
  '#f0ebe4',
];

type Rgb = { r: number; g: number; b: number };

function parseRgb(color: string): Rgb | null {
  const value = color.trim();
  const hex = value.replace(/^#/, '');
  const full =
    hex.length === 3 && /^[0-9a-fA-F]{3}$/.test(hex)
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.length === 6 && /^[0-9a-fA-F]{6}$/.test(hex)
        ? hex
        : null;
  if (full != null) {
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const rgbMatch = value.match(
    /^rgba?\(\s*([+-]?\d*\.?\d+)\s*[, ]\s*([+-]?\d*\.?\d+)\s*[, ]\s*([+-]?\d*\.?\d+)/i,
  );
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) };
  }
  return null;
}

function channelToHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function mixRgb(from: Rgb, toward: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return {
    r: from.r + (toward.r - from.r) * t,
    g: from.g + (toward.g - from.g) * t,
    b: from.b + (toward.b - from.b) * t,
  };
}

/**
 * Soft gray band ramp for skeleton bars (keeps near-neutral chroma).
 * Falls back to `bandsFromColor` only for chromatic tokens.
 */
export function loadingBandsFromColor(color: string): PixelWaveBands {
  const base = parseRgb(color);
  if (base == null) return FALLBACK_LOADING_BANDS;

  const chroma = (Math.max(base.r, base.g, base.b) - Math.min(base.r, base.g, base.b)) / 255;
  if (chroma > 0.12) return bandsFromColor(color);

  const mid = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.15);
  return [
    rgbToHex(mixRgb(mid, { r: 0, g: 0, b: 0 }, 0.14)),
    rgbToHex(mixRgb(mid, { r: 0, g: 0, b: 0 }, 0.07)),
    rgbToHex(mid),
    rgbToHex(mixRgb(mid, { r: 255, g: 255, b: 255 }, 0.1)),
    rgbToHex(mixRgb(mid, { r: 255, g: 255, b: 255 }, 0.2)),
  ];
}

/** Deterministic pseudo-random in [0, 1). */
function hashUnit(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Skeleton bar heights in a fixed domain.
 * Stable for a given `count`/`epoch` — charts should pass a fixed epoch so
 * bars do not jump while loading.
 */
export function getLoadingBarHeights(
  count: number,
  epoch = 0,
  min = 22,
  max = 88,
): number[] {
  const n = Math.max(1, Math.floor(count));
  const span = Math.max(1, max - min);
  const heights: number[] = [];
  let prev = min + hashUnit(epoch * 17 + 3) * span;
  for (let i = 0; i < n; i += 1) {
    const drift = (hashUnit(epoch * 31 + i * 7 + 11) - 0.5) * span * 0.55;
    let next = prev + drift;
    if (next < min || next > max) {
      next = min + hashUnit(epoch * 13 + i * 19 + 5) * span;
    }
    heights.push(Math.round(next));
    prev = next;
  }
  return heights;
}

export function buildLoadingBarRows(
  count: number,
  epoch = 0,
): Record<string, string | number>[] {
  return getLoadingBarHeights(count, epoch).map((value, i) => ({
    [LOADING_BAR_INDEX_KEY]: String(i),
    [LOADING_BAR_VALUE_KEY]: value,
  }));
}

/** Synthetic area/line points for loading skeletons. */
export function buildLoadingAreaRows(
  count: number,
  epoch = 0,
): Record<string, string | number>[] {
  return getLoadingBarHeights(count, epoch).map((value, i) => ({
    [LOADING_AREA_INDEX_KEY]: String(i),
    [LOADING_AREA_VALUE_KEY]: value,
  }));
}

/**
 * Pixel series for loading rows (values taken from the synthetic table).
 */
export function buildLoadingBarSeriesFromRows(
  rows: readonly Record<string, string | number>[],
  trackColor: string,
): PixelWaveSeries[] {
  return [
    {
      name: LOADING_BAR_VALUE_KEY,
      values: rows.map((row) => Number(row[LOADING_BAR_VALUE_KEY]) || 0),
      bands: loadingBandsFromColor(trackColor),
    },
  ];
}

/** Pixel series for area/line loading skeletons (dither-friendly muted bands). */
export function buildLoadingAreaSeriesFromRows(
  rows: readonly Record<string, string | number>[],
  trackColor: string,
): PixelWaveSeries[] {
  return [
    {
      name: LOADING_AREA_VALUE_KEY,
      values: rows.map((row) => Number(row[LOADING_AREA_VALUE_KEY]) || 0),
      bands: loadingBandsFromColor(trackColor),
    },
  ];
}

export const DEFAULT_LOADING_PIE_COUNT = 6;
export const LOADING_PIE_VALUE_KEY = '__dune_loading';
export const LOADING_PIE_NAME_KEY = '__dune_loading_name';

/** Equal-weight pie rows for Recharts Pie hit/layout during loading. */
export function buildLoadingPieRows(
  count: number,
): Record<string, string | number>[] {
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n }, (_, i) => ({
    [LOADING_PIE_NAME_KEY]: `loading-${i}`,
    [LOADING_PIE_VALUE_KEY]: 1,
  }));
}

/** Equal-weight muted dither slices for pie loading skeletons. */
export function buildLoadingPieSlices(
  count: number,
  trackColor: string,
): PixelPieSlice[] {
  const n = Math.max(1, Math.floor(count));
  const bands = loadingBandsFromColor(trackColor);
  return Array.from({ length: n }, (_, i) => ({
    name: `loading-${i}`,
    value: 1,
    bands,
  }));
}

export const DEFAULT_LOADING_RADAR_COUNT = 6;
export const LOADING_RADAR_INDEX_KEY = '__dune_loading_i';
export const LOADING_RADAR_VALUE_KEY = '__dune_loading';

/** Stable radar polygon vertices for loading skeletons. */
export function buildLoadingRadarRows(
  count: number,
  epoch = 0,
): Record<string, string | number>[] {
  return getLoadingBarHeights(count, epoch, 28, 92).map((value, i) => ({
    [LOADING_RADAR_INDEX_KEY]: String(i),
    [LOADING_RADAR_VALUE_KEY]: value,
  }));
}

export function buildLoadingRadarSeriesFromRows(
  rows: readonly Record<string, string | number>[],
  trackColor: string,
): PixelWaveSeries[] {
  return [
    {
      name: LOADING_RADAR_VALUE_KEY,
      values: rows.map((row) => Number(row[LOADING_RADAR_VALUE_KEY]) || 0),
      bands: loadingBandsFromColor(trackColor),
    },
  ];
}

export const DEFAULT_LOADING_RADIAL_COUNT = 5;
export const LOADING_RADIAL_VALUE_KEY = '__dune_loading';
export const LOADING_RADIAL_NAME_KEY = '__dune_loading_name';

/** Varied radial-arc rows for Recharts RadialBar layout during loading. */
export function buildLoadingRadialRows(
  count: number,
  epoch = 0,
): Record<string, string | number>[] {
  return getLoadingBarHeights(count, epoch, 32, 96).map((value, i) => ({
    [LOADING_RADIAL_NAME_KEY]: `loading-${i}`,
    [LOADING_RADIAL_VALUE_KEY]: value,
  }));
}

/** Concentric muted dither arcs for radial loading skeletons. */
export function buildLoadingRadialBars(
  count: number,
  trackColor: string,
  epoch = 0,
): PixelPieSlice[] {
  const bands = loadingBandsFromColor(trackColor);
  return getLoadingBarHeights(count, epoch, 32, 96).map((value, i) => ({
    name: `loading-${i}`,
    value,
    bands,
  }));
}

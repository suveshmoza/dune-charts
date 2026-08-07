import {
  createDitherTileCanvas,
  ensureDitherTileCache,
  type DitherTileCache,
} from '../shared/ditherTiles';
import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  ditherDensityForBand,
  ditherPairFromBands,
  type PixelWaveBands,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';
import type { PixelRadialBar, PixelRadialPlotLayout } from './pixelRadialEngine';

export type PaintPixelRadialOptions = {
  layout: PixelRadialPlotLayout;
  bars: readonly PixelRadialBar[];
  fill?: PixelWaveFill;
  /** Unfilled ring remainder (resolved concrete color). */
  trackColor?: string;
  /** When `true`, paint unfilled track remainder cells. Default `false`. */
  paintTracks?: boolean;
  ditherTiles?: DitherTileCache;
};

const DEFAULT_TRACK_COLOR = '#eceae4';

/** Light gray crest→depth ramp used when the track color cannot be parsed. */
const DEFAULT_TRACK_BANDS: PixelWaveBands = ['#ddd9d1', '#e6e2da', '#eceae4', '#f3f1ec', '#f8f6f2'];

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
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  return null;
}

function channelToHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
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
 * Light gray band ramp from the theme track token.
 * Keeps near-neutral chroma and a soft lightness step — never the saturated
 * mid-tone ramps from `bandsFromColor` (which also ignore `rgb(...)` poorly).
 */
function trackBandsFromColor(color: string): PixelWaveBands {
  const base = parseRgb(color);
  if (base == null) return DEFAULT_TRACK_BANDS;

  // Nudge the mid band slightly toward white so remainders read as light gray.
  const mid = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.25);
  return [
    rgbToHex(mixRgb(mid, { r: 0, g: 0, b: 0 }, 0.07)),
    rgbToHex(mixRgb(mid, { r: 0, g: 0, b: 0 }, 0.03)),
    rgbToHex(mid),
    rgbToHex(mixRgb(mid, { r: 255, g: 255, b: 255 }, 0.1)),
    rgbToHex(mixRgb(mid, { r: 255, g: 255, b: 255 }, 0.18)),
  ];
}

/** Soft dither twin — series dither darkens ~55%, which turns gray tracks muddy. */
function softTrackDitherPair(
  bands: PixelWaveBands,
  bandIndex: 0 | 1 | 2 | 3 | 4,
): readonly [string, string] {
  const hi = bands[bandIndex] ?? bands[0] ?? DEFAULT_TRACK_COLOR;
  const parsed = parseRgb(hi);
  if (parsed == null) return [hi, '#d0ccc4'];
  const lo = rgbToHex(mixRgb(parsed, { r: 0, g: 0, b: 0 }, 0.1));
  return [hi, lo];
}

function barsAsSeries(bars: readonly PixelRadialBar[]): PixelWaveSeries[] {
  return bars.map((b) => ({
    name: b.name,
    values: [b.value],
    bands: b.bands,
  }));
}

/**
 * Paint pixel radial-bar cells into a plot-local canvas context.
 * Cell coords are chart-absolute; this subtracts plot origin.
 * Track remainder cells are skipped unless `paintTracks` is set.
 */
export function paintPixelRadial(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelRadialOptions,
): void {
  const {
    layout,
    bars,
    fill = 'bands',
    trackColor = DEFAULT_TRACK_COLOR,
    paintTracks = false,
  } = options;
  const { pixel, plotX, plotY, plotW, plotH, cells } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(bars.map((b) => [b.name, b]));
  const trackBands = paintTracks ? trackBandsFromColor(trackColor) : null;
  const ditherTiles =
    fill === 'dither'
      ? ensureDitherTileCache(barsAsSeries(bars), options.ditherTiles ?? new Map())
      : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const cell of cells) {
    if (cell.kind === 'track' && !paintTracks) continue;

    const localX = cell.x - plotX;
    const localY = cell.y - plotY;

    const bands = cell.kind === 'track' ? trackBands : byName.get(cell.barName)?.bands;
    if (bands == null) continue;

    const band =
      fill === 'dither'
        ? bandIndexFromCrestRowDither(cell.crestRow)
        : bandIndexFromCrestRow(cell.crestRow);

    if (fill === 'dither' && ditherTiles != null) {
      const [hi, lo] =
        cell.kind === 'track' ? softTrackDitherPair(bands, band) : ditherPairFromBands(bands, band);
      const density = ditherDensityForBand(band);
      const key = `${hi}|${lo}|${density}`;
      let pattern = patternCache.get(key);
      if (pattern === undefined) {
        let tile = ditherTiles.get(key);
        if (tile == null && cell.kind === 'track') {
          tile = createDitherTileCanvas(hi, lo, density);
          ditherTiles.set(key, tile);
        }
        pattern = tile != null ? ctx.createPattern(tile, 'repeat') : null;
        if (pattern != null && 'setTransform' in pattern) {
          pattern.setTransform(new DOMMatrix().translateSelf(-plotX, -plotY));
        }
        patternCache.set(key, pattern);
      }
      if (pattern != null) {
        ctx.fillStyle = pattern;
        ctx.fillRect(localX, localY, pixel, pixel);
        continue;
      }
    }

    ctx.fillStyle = bands[band] ?? bands[0] ?? DEFAULT_TRACK_COLOR;
    ctx.fillRect(localX, localY, pixel, pixel);
  }
}

export { ensureDitherTileCache, type DitherTileCache };

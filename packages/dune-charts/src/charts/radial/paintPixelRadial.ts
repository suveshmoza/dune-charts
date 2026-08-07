import {
  createEmptyLevelPaths,
  ensureLevelPath,
  fillDitherLevelPaths,
  type DitherPatternCache,
} from '../shared/ditherTiles';
import {
  bandIndexFromCrestRow,
  ditherLevelForCrestRow,
  ditherToneFromBands,
  type PixelWaveBands,
  type PixelWaveFill,
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

/** Soft track tone — mid band of the light gray ramp (no muddy dark twin). */
function softTrackTone(bands: PixelWaveBands): string {
  return bands[2] ?? bands[0] ?? DEFAULT_TRACK_COLOR;
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

  if (fill === 'dither') {
    const patternCache: DitherPatternCache = new Map();
    const trackPaths = paintTracks ? createEmptyLevelPaths() : null;
    const pathsByBar = new Map<string, (Path2D | null)[]>();

    for (const cell of cells) {
      if (cell.kind === 'track') {
        if (trackPaths == null) continue;
        const level = ditherLevelForCrestRow(cell.crestRow);
        const path = ensureLevelPath(trackPaths, level);
        path.rect(cell.x - plotX, cell.y - plotY, pixel, pixel);
        continue;
      }

      let paths = pathsByBar.get(cell.barName);
      if (paths == null) {
        paths = createEmptyLevelPaths();
        pathsByBar.set(cell.barName, paths);
      }
      const level = ditherLevelForCrestRow(cell.crestRow);
      const path = ensureLevelPath(paths, level);
      path.rect(cell.x - plotX, cell.y - plotY, pixel, pixel);
    }

    // Tracks under bars — light underpaint keeps the ring soft, not muddy.
    if (trackPaths != null && trackBands != null) {
      const trackTone = softTrackTone(trackBands);
      fillDitherLevelPaths(ctx, trackPaths, patternCache, trackTone, plotX, plotY, trackTone);
    }

    for (const [name, paths] of pathsByBar) {
      const bar = byName.get(name);
      if (bar == null) continue;
      fillDitherLevelPaths(ctx, paths, patternCache, ditherToneFromBands(bar.bands), plotX, plotY);
    }
    return;
  }

  for (const cell of cells) {
    if (cell.kind === 'track' && !paintTracks) continue;

    const bands = cell.kind === 'track' ? trackBands : byName.get(cell.barName)?.bands;
    if (bands == null) continue;

    const band = bandIndexFromCrestRow(cell.crestRow);
    ctx.fillStyle = bands[band] ?? bands[0] ?? DEFAULT_TRACK_COLOR;
    ctx.fillRect(cell.x - plotX, cell.y - plotY, pixel, pixel);
  }
}

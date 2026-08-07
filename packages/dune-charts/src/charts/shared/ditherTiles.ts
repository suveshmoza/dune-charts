import {
  buildBayerTile,
  ditherDensityForLevel,
  ditherLowToneFromColor,
  DITHER_LEVELS,
} from './pixelWaveEngine';

const DITHER_SUBPIXEL = 1;
const DITHER_TILE_SIZE = 8;
const DITHER_LO = 'transparent';

/** Module-level tile cache shared across chart instances (keyed tone|level). */
const tileCache = new Map<string, HTMLCanvasElement>();

export type DitherPatternCache = Map<string, CanvasPattern | null>;

export function ditherTileKey(tone: string, level: number): string {
  return `${tone}|${level}`;
}

/** Build an offscreen canvas with one Bayer tile (transparent off-cells). */
export function createDitherTileCanvas(
  tone: string,
  level: number,
  subpixel = DITHER_SUBPIXEL,
): HTMLCanvasElement {
  const size = 8 * subpixel;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx == null) return canvas;

  const density = ditherDensityForLevel(level);
  const cells = buildBayerTile(tone, DITHER_LO, density, subpixel);
  for (const cell of cells) {
    ctx.fillStyle = cell.fill;
    ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
  }
  return canvas;
}

function getDitherTile(tone: string, level: number): HTMLCanvasElement {
  const key = ditherTileKey(tone, level);
  let tile = tileCache.get(key);
  if (tile == null) {
    tile = createDitherTileCanvas(tone, level);
    tileCache.set(key, tile);
  }
  return tile;
}

/**
 * Lazy tile + pattern lookup. Patterns are context-bound so `patternCache`
 * is per paint; tiles live in the module cache.
 */
export function getDitherPattern(
  ctx: CanvasRenderingContext2D,
  patternCache: DitherPatternCache,
  tone: string,
  level: number,
  plotX: number,
  plotY: number,
): CanvasPattern | null {
  const key = ditherTileKey(tone, level);
  let pattern = patternCache.get(key);
  if (pattern === undefined) {
    const tile = getDitherTile(tone, level);
    pattern = ctx.createPattern(tile, 'repeat');
    if (pattern != null && 'setTransform' in pattern) {
      pattern.setTransform(new DOMMatrix().translateSelf(-plotX, -plotY));
    }
    patternCache.set(key, pattern);
  }
  return pattern ?? null;
}

/**
 * Fill each non-empty level path (level-major). Every path is first painted
 * with an opaque low tone so Bayer off-cells read as depth instead of exposing
 * the chart background, then overlaid with the transparent Bayer pattern.
 * Pass `lowTone` to override the default same-hue darkened underpaint.
 */
export function fillDitherLevelPaths(
  ctx: CanvasRenderingContext2D,
  paths: readonly (Path2D | null)[],
  patternCache: DitherPatternCache,
  tone: string,
  plotX: number,
  plotY: number,
  lowTone?: string,
): void {
  const under = lowTone ?? ditherLowToneFromColor(tone);
  for (let level = 0; level < DITHER_LEVELS; level += 1) {
    const path = paths[level];
    if (path == null) continue;
    ctx.fillStyle = under;
    ctx.fill(path);
    const pattern = getDitherPattern(ctx, patternCache, tone, level, plotX, plotY);
    if (pattern == null) continue;
    ctx.fillStyle = pattern;
    ctx.fill(path);
  }
}

export function createEmptyLevelPaths(): (Path2D | null)[] {
  return Array.from({ length: DITHER_LEVELS }, () => null);
}

export function ensureLevelPath(paths: (Path2D | null)[], level: number): Path2D {
  let path = paths[level];
  if (path == null) {
    path = new Path2D();
    paths[level] = path;
  }
  return path;
}

export { DITHER_SUBPIXEL, DITHER_TILE_SIZE, DITHER_LEVELS };

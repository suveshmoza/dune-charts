import { describe, expect, it } from 'vitest';

import { ditherTileKey } from './ditherTiles';
import {
  bandIndexFromCrestRow,
  bandsFromColor,
  bandsFromHue,
  buildBayerTile,
  computePixelWavePlotLayout,
  ditherDensityForBand,
  ditherDensityForLevel,
  ditherLevelForCrestRow,
  ditherLowToneFromColor,
  ditherThreshold,
  ditherToneFromBands,
  DITHER_DENSITY_FLOOR,
  DITHER_LEVELS,
  DITHER_RAMP_ROWS,
  fractionalIndexFromX,
  resolveSeriesBands,
  sampleSeriesAt,
  sortDrawOrder,
  type PixelWaveBands,
  type PixelWaveSeries,
} from './pixelWaveEngine';

const BANDS: PixelWaveBands = ['#111111', '#333333', '#555555', '#777777', '#999999'];

const lightnessPct = (css: string) => Number(css.match(/(\d+)%\)$/)?.[1]);

function makeSeries(
  partial: Partial<PixelWaveSeries> & Pick<PixelWaveSeries, 'name' | 'values'>,
): PixelWaveSeries {
  return { bands: BANDS, ...partial };
}

/** Linear yScale: data value 0 → baselineY, higher values go up (smaller y). */
function linearYScale(plotBottom: number, pixelsPerUnit: number) {
  return (value: number) => plotBottom - value * pixelsPerUnit;
}

describe('bandsFromHue', () => {
  it('returns 5 stops with increasing lightness crest→depth', () => {
    const bands = bandsFromHue(18);
    expect(bands).toHaveLength(5);

    const lightnesses = bands.map((css) => {
      const m = css.match(/hsl\(\d+ \d+% (\d+)%\)/);
      expect(m).not.toBeNull();
      return Number(m?.[1]);
    });

    for (let i = 1; i < lightnesses.length; i += 1) {
      expect(lightnesses[i]).toBeGreaterThan(lightnesses[i - 1]);
    }
  });
});

describe('bandsFromColor', () => {
  it('parses hex, rgb, and hsl', () => {
    expect(bandsFromColor('#c45c26')).toHaveLength(5);
    expect(bandsFromColor('rgb(196, 92, 38)')).toHaveLength(5);
    expect(bandsFromColor('hsl(18 70% 50%)')).toHaveLength(5);
  });

  it('falls back to fallback hue on invalid color', () => {
    expect(bandsFromColor('not-a-color', 43)).toEqual(bandsFromHue(43));
  });
});

describe('resolveSeriesBands', () => {
  it('prefers explicit bands, then color, then series hue', () => {
    const explicit = BANDS;
    expect(resolveSeriesBands(0, { bands: explicit })).toBe(explicit);

    const fromColor = resolveSeriesBands(0, { color: '#c45c26' });
    expect(fromColor).toEqual(bandsFromColor('#c45c26'));

    expect(resolveSeriesBands(1)).toEqual(bandsFromHue(43));
  });
});

describe('dither helpers', () => {
  it('ditherThreshold stays in (0,1) and is periodic every 8', () => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const t = ditherThreshold(x, y);
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
        expect(ditherThreshold(x + 8, y)).toBe(t);
        expect(ditherThreshold(x, y + 8)).toBe(t);
      }
    }
  });

  it('ditherDensityForBand decreases crest→depth', () => {
    const dens = ([0, 1, 2, 3, 4] as const).map(ditherDensityForBand);
    for (let i = 1; i < dens.length; i += 1) {
      expect(dens[i]).toBeLessThan(dens[i - 1]);
    }
  });

  it('ditherToneFromBands uses the crest color', () => {
    expect(ditherToneFromBands(BANDS)).toBe(BANDS[0]);
  });

  it('ditherLowToneFromColor darkens same-hue and falls back on bad input', () => {
    const low = ditherLowToneFromColor('hsl(210 60% 50%)');
    expect(low).toMatch(/^hsl\(210 /);
    const match = low.match(/^hsl\(\d+ \d+% (\d+)%\)$/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeLessThan(50);
    expect(ditherLowToneFromColor('not-a-color')).toBe('not-a-color');
  });

  it('ditherLowToneFromColor amount deepens the darkening', () => {
    expect(lightnessPct(ditherLowToneFromColor('#4488cc', 0.75))).toBeLessThan(
      lightnessPct(ditherLowToneFromColor('#4488cc', 0.35)),
    );
  });

  it('buildBayerTile has up to 64 cells; transparent lo skips off cells', () => {
    expect(buildBayerTile('#fff', '#000', 0.5)).toHaveLength(64);
    expect(buildBayerTile('#fff', '#000', 1).every((c) => c.fill === '#fff')).toBe(true);
    expect(buildBayerTile('#fff', '#000', 0).every((c) => c.fill === '#000')).toBe(true);
    expect(buildBayerTile('#fff', 'transparent', 1)).toHaveLength(64);
    expect(buildBayerTile('#fff', 'transparent', 0)).toHaveLength(0);
    expect(buildBayerTile('#fff', 'transparent', 0.5).every((c) => c.fill === '#fff')).toBe(true);
  });

  it('ditherDensityForLevel is solid at crest and floors at depth', () => {
    expect(ditherDensityForLevel(0)).toBe(1);
    expect(ditherDensityForLevel(DITHER_LEVELS - 1)).toBeCloseTo(DITHER_DENSITY_FLOOR);
    for (let i = 1; i < DITHER_LEVELS; i += 1) {
      expect(ditherDensityForLevel(i)).toBeLessThan(ditherDensityForLevel(i - 1));
    }
  });

  it('ditherLevelForCrestRow is monotonically non-increasing in density', () => {
    expect(ditherLevelForCrestRow(0)).toBe(0);
    expect(ditherLevelForCrestRow(1)).toBe(0);
    expect(ditherLevelForCrestRow(DITHER_RAMP_ROWS + 10)).toBe(DITHER_LEVELS - 1);

    let prev = ditherLevelForCrestRow(0);
    for (let row = 1; row <= DITHER_RAMP_ROWS + 20; row += 1) {
      const level = ditherLevelForCrestRow(row);
      expect(level).toBeGreaterThanOrEqual(prev);
      prev = level;
    }
  });

  it('every dither level maps to a distinct tile key', () => {
    const tone = ditherToneFromBands(BANDS);
    const keys = new Set(
      Array.from({ length: DITHER_LEVELS }, (_, level) => ditherTileKey(tone, level)),
    );
    expect(keys.size).toBe(DITHER_LEVELS);
  });
});

describe('bandIndexFromCrestRow', () => {
  it('uses fixed row boundaries', () => {
    expect(bandIndexFromCrestRow(0)).toBe(0);
    expect(bandIndexFromCrestRow(1)).toBe(0);
    expect(bandIndexFromCrestRow(2)).toBe(1);
    expect(bandIndexFromCrestRow(4)).toBe(1);
    expect(bandIndexFromCrestRow(5)).toBe(2);
    expect(bandIndexFromCrestRow(8)).toBe(2);
    expect(bandIndexFromCrestRow(9)).toBe(3);
    expect(bandIndexFromCrestRow(13)).toBe(3);
    expect(bandIndexFromCrestRow(14)).toBe(4);
  });
});

describe('sampleSeriesAt', () => {
  it('samples endpoints, midpoints, clamps, and empty', () => {
    expect(sampleSeriesAt([], 0)).toBe(0);
    expect(sampleSeriesAt([10], 0)).toBe(10);
    expect(sampleSeriesAt([0, 10], 0)).toBe(0);
    expect(sampleSeriesAt([0, 10], 1)).toBe(10);
    expect(sampleSeriesAt([0, 10], 0.5)).toBe(5);
    expect(sampleSeriesAt([0, 10], -2)).toBe(0);
    expect(sampleSeriesAt([0, 10], 99)).toBe(10);
  });
});

describe('fractionalIndexFromX', () => {
  it('maps before/after/between category centers', () => {
    const centers = [10, 30, 50];
    expect(fractionalIndexFromX(0, centers)).toBe(0);
    expect(fractionalIndexFromX(100, centers)).toBe(2);
    expect(fractionalIndexFromX(20, centers)).toBe(0.5);
    expect(fractionalIndexFromX(40, centers)).toBe(1.5);
    expect(fractionalIndexFromX(10, [10])).toBe(0);
    expect(fractionalIndexFromX(5, [])).toBe(0);
  });
});

describe('sortDrawOrder', () => {
  it('orders by stackIndex when stacked', () => {
    const series = [
      makeSeries({ name: 'top', values: [1], stackIndex: 1 }),
      makeSeries({ name: 'bottom', values: [1], stackIndex: 0 }),
    ];
    expect(sortDrawOrder(series).map((s) => s.name)).toEqual(['bottom', 'top']);
  });

  it('orders larger span first when unstacked', () => {
    const series = [
      makeSeries({ name: 'small', values: [1, 2] }),
      makeSeries({ name: 'large', values: [0, 20] }),
    ];
    expect(sortDrawOrder(series).map((s) => s.name)).toEqual(['large', 'small']);
  });
});

describe('computePixelWavePlotLayout', () => {
  const plot = { x: 0, y: 0, width: 40, height: 100 };
  const yScale = linearYScale(100, 1);

  it('returns null for empty series, zero plot, or zero points', () => {
    expect(computePixelWavePlotLayout([], plot, yScale, 3)).toBeNull();
    expect(
      computePixelWavePlotLayout(
        [makeSeries({ name: 'a', values: [1, 2, 3] })],
        { ...plot, width: 0 },
        yScale,
        3,
      ),
    ).toBeNull();
    expect(
      computePixelWavePlotLayout([makeSeries({ name: 'a', values: [] })], plot, yScale, 0),
    ).toBeNull();
  });

  it('uses default pixel 2 and snaps column count to plot width', () => {
    const layout = computePixelWavePlotLayout(
      [makeSeries({ name: 'a', values: [10, 20, 30] })],
      plot,
      yScale,
      3,
    );
    expect(layout).not.toBeNull();
    expect(layout!.pixel).toBe(2);
    expect(layout!.columns).toHaveLength(20); // floor(40/2)
  });

  it('spans dataIndex 0…pointCount-1 without xScale', () => {
    const layout = computePixelWavePlotLayout(
      [makeSeries({ name: 'a', values: [0, 10, 20] })],
      plot,
      yScale,
      3,
      { pixel: 4 },
    );
    expect(layout).not.toBeNull();
    const indices = layout!.columns.map((c) => c.dataIndex);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(2);
  });

  it('maps columns via category xScale centers', () => {
    const indexValues = ['a', 'b', 'c'];
    // Centers at 4, 20, 36 inside a 40-wide plot (pixel=4 → cols at 0,4,…36)
    const centers = [4, 20, 36];
    const xScale = (value: unknown) => {
      const i = indexValues.indexOf(String(value));
      return i >= 0 ? centers[i] : undefined;
    };

    const layout = computePixelWavePlotLayout(
      [makeSeries({ name: 's', values: [5, 15, 25] })],
      plot,
      yScale,
      3,
      { pixel: 4, indexValues, xScale },
    );
    expect(layout).not.toBeNull();

    // Column whose cell center is nearest category center 20 maps to index 1
    const midCol = layout!.columns.reduce((best, col) => {
      const center = col.x + 2;
      const bestCenter = best.x + 2;
      return Math.abs(center - 20) < Math.abs(bestCenter - 20) ? col : best;
    });
    expect(midCol.dataIndex).toBe(1);
  });

  it('keeps min 1 cell for unstacked; allows 0 for stacked bases', () => {
    const unstacked = computePixelWavePlotLayout(
      [makeSeries({ name: 'u', values: [0, 0, 0] })],
      plot,
      yScale,
      3,
      { pixel: 4 },
    );
    expect(unstacked!.columns.every((c) => (c.cellCount.u ?? 0) >= 1)).toBe(true);

    const stacked = computePixelWavePlotLayout(
      [makeSeries({ name: 's', values: [0, 0, 0], bases: [0, 0, 0] })],
      plot,
      yScale,
      3,
      { pixel: 4 },
    );
    expect(stacked!.columns.every((c) => c.cellCount.s === 0)).toBe(true);
  });

  it('cellCount matches snapped Y distance / pixel', () => {
    // value 40 → y=60; baseline y=100 → 40px → 10 cells at pixel=4
    const layout = computePixelWavePlotLayout(
      [makeSeries({ name: 'a', values: [40, 40, 40] })],
      plot,
      yScale,
      3,
      { pixel: 4 },
    );
    expect(layout).not.toBeNull();
    for (const col of layout!.columns) {
      expect(col.cellCount.a).toBe(10);
      expect(col.topY.a).toBe(60);
    }
  });
});

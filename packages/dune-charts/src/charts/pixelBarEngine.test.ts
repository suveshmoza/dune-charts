import { describe, expect, it } from 'vitest';

import { computePixelBarPlotLayout, snapBarWidth } from './pixelBarEngine';
import type { PixelWaveBands, PixelWaveSeries } from './pixelWaveEngine';

const BANDS: PixelWaveBands = ['#111', '#333', '#555', '#777', '#999'];

function makeSeries(
  partial: Partial<PixelWaveSeries> & Pick<PixelWaveSeries, 'name' | 'values'>,
): PixelWaveSeries {
  return { bands: BANDS, ...partial };
}

function linearYScale(plotBottom: number, pixelsPerUnit: number) {
  return (value: number) => plotBottom - value * pixelsPerUnit;
}

describe('snapBarWidth', () => {
  it('snaps down to the pixel grid with a minimum of one cell', () => {
    expect(snapBarWidth(17, 4)).toBe(16);
    expect(snapBarWidth(3, 4)).toBe(4);
    expect(snapBarWidth(8, 4)).toBe(8);
  });
});

describe('computePixelBarPlotLayout', () => {
  const plot = { x: 0, y: 0, width: 120, height: 100 };
  const yScale = linearYScale(100, 1);

  it('returns null for empty inputs', () => {
    expect(computePixelBarPlotLayout([], plot, yScale, 3)).toBeNull();
    expect(
      computePixelBarPlotLayout(
        [makeSeries({ name: 'a', values: [1, 2, 3] })],
        { ...plot, width: 0 },
        yScale,
        3,
      ),
    ).toBeNull();
  });

  it('places one group per category with snapped bar width', () => {
    const indexValues = ['a', 'b', 'c'];
    const centers = [20, 60, 100];
    const xScale = (value: unknown) => {
      const i = indexValues.indexOf(String(value));
      return i >= 0 ? centers[i] : undefined;
    };

    const layout = computePixelBarPlotLayout(
      [makeSeries({ name: 'melange', values: [40, 40, 40] })],
      plot,
      yScale,
      3,
      { pixel: 4, indexValues, xScale },
    );

    expect(layout).not.toBeNull();
    expect(layout!.groups).toHaveLength(3);
    for (const group of layout!.groups) {
      expect(group.segments).toHaveLength(1);
      const seg = group.segments[0];
      expect(seg.width % 4).toBe(0);
      expect(seg.width).toBeGreaterThanOrEqual(4);
      expect(seg.cellCount).toBe(10);
    }
  });

  it('stacks series on the same x with chained heights', () => {
    const layout = computePixelBarPlotLayout(
      [
        makeSeries({ name: 'a', values: [20, 20], bases: [0, 0], stackIndex: 0 }),
        makeSeries({ name: 'b', values: [50, 50], bases: [20, 20], stackIndex: 1 }),
      ],
      plot,
      yScale,
      2,
      { pixel: 4 },
    );

    expect(layout).not.toBeNull();
    const g0 = layout!.groups[0];
    expect(g0.segments[0]?.x).toBe(g0.segments[1]?.x);
    expect(g0.segments[0]?.cellCount).toBe(5); // 20px / 4
    expect(g0.segments[1]?.cellCount).toBe(8); // 30px / 4? 50-20=30 → 7.5 → 8?
    // 20 cells height: bottom at 80, top at 80-20=60 for a (20 units)
    // b: upper 50 → y=50, lower 20 → y=80; height 30 → 30/4 = 7.5 → round 8?
    // snapYFromBaseline: round((baseline-y)/pixel)*pixel
    // Actually Math.round(30/4)=8 cells. OK.
    expect(g0.segments[1]?.cellCount).toBe(8);
  });

  it('groups unstacked multi-series side by side', () => {
    const layout = computePixelBarPlotLayout(
      [makeSeries({ name: 'a', values: [40] }), makeSeries({ name: 'b', values: [40] })],
      plot,
      yScale,
      1,
      { pixel: 4 },
    );

    expect(layout).not.toBeNull();
    const segs = layout!.groups[0].segments;
    expect(segs).toHaveLength(2);
    expect(segs[1]?.x).toBeGreaterThan(segs[0]?.x);
    expect(segs[0]?.width).toBe(segs[1]?.width);
  });
});

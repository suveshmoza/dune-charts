import { describe, expect, it } from 'vitest';

import {
  angleInSector,
  buildPieSliceList,
  cellAngleDeg,
  computePieSectors,
  computePixelPieLayout,
  normalizeDeg,
  resolveRadius,
  type PixelPieSlice,
} from './pixelPieEngine';
import type { PixelWaveBands } from '../shared/pixelWaveEngine';

const BANDS: PixelWaveBands = ['#111', '#333', '#555', '#777', '#999'];

function makeSlice(name: string, value: number): PixelPieSlice {
  return { name, value, bands: BANDS };
}

describe('normalizeDeg / angleInSector', () => {
  it('normalizes negative and large angles', () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(370)).toBe(10);
  });

  it('tests sector membership including wrap', () => {
    expect(angleInSector(10, 0, 90)).toBe(true);
    expect(angleInSector(100, 0, 90)).toBe(false);
    expect(angleInSector(0, 350, 370)).toBe(true);
    expect(angleInSector(355, 350, 370)).toBe(true);
    expect(angleInSector(180, 350, 370)).toBe(false);
  });
});

describe('cellAngleDeg', () => {
  it('puts +x at 0° and +y-up at 90° (screen y down)', () => {
    expect(normalizeDeg(cellAngleDeg(0, 0, 10, 0))).toBeCloseTo(0, 5);
    expect(normalizeDeg(cellAngleDeg(0, 0, 0, -10))).toBeCloseTo(90, 5);
    expect(normalizeDeg(cellAngleDeg(0, 0, -10, 0))).toBeCloseTo(180, 5);
  });
});

describe('resolveRadius', () => {
  it('resolves percent and absolute radii', () => {
    expect(resolveRadius('80%', 100, 0)).toBe(80);
    expect(resolveRadius(40, 100, 0)).toBe(40);
    expect(resolveRadius(undefined, 100, 12)).toBe(12);
  });
});

describe('computePieSectors', () => {
  it('splits the circle by value share', () => {
    const sectors = computePieSectors([
      { name: 'a', value: 1 },
      { name: 'b', value: 1 },
    ]);
    expect(sectors).toHaveLength(2);
    expect(sectors[0]?.startAngle).toBe(0);
    expect(sectors[0]?.endAngle).toBe(180);
    expect(sectors[1]?.startAngle).toBe(180);
    expect(sectors[1]?.endAngle).toBe(360);
  });

  it('applies padding between sectors', () => {
    const sectors = computePieSectors(
      [
        { name: 'a', value: 1 },
        { name: 'b', value: 1 },
      ],
      { paddingAngle: 10 },
    );
    expect(sectors).toHaveLength(2);
    expect(sectors[0]?.endAngle - sectors[0].startAngle).toBeCloseTo(170, 5);
    expect(sectors[1]?.startAngle - sectors[0].endAngle).toBeCloseTo(10, 5);
  });

  it('ignores non-positive values', () => {
    expect(
      computePieSectors([
        { name: 'a', value: 0 },
        { name: 'b', value: 5 },
      ]),
    ).toHaveLength(1);
  });
});

describe('computePixelPieLayout', () => {
  const plot = { x: 0, y: 0, width: 100, height: 100 };

  it('returns null for empty inputs', () => {
    expect(computePixelPieLayout([], plot)).toBeNull();
    expect(computePixelPieLayout([makeSlice('a', 1)], { ...plot, width: 0 })).toBeNull();
  });

  it('assigns cells to known half-circle sectors', () => {
    const layout = computePixelPieLayout([makeSlice('right', 1), makeSlice('left', 1)], plot, {
      pixel: 4,
      outerRadius: 40,
      innerRadius: 0,
    });
    expect(layout).not.toBeNull();
    expect(layout!.cells.length).toBeGreaterThan(0);

    // Point near +x should be first sector (0–180 starts at +x going CCW → upper then left)
    // 0–180 is right half in math? 0 at +x, CCW to 180 at -x covers upper half (y up).
    // Screen: 0–180 covers top half (y decreasing).
    const topCell = layout!.cells.find((c) => c.y < layout!.cy && Math.abs(c.x - layout!.cx) < 8);
    expect(topCell?.sliceName).toBe('right');

    const bottomCell = layout!.cells.find(
      (c) => c.y > layout!.cy && Math.abs(c.x - layout!.cx) < 8,
    );
    expect(bottomCell?.sliceName).toBe('left');
  });

  it('leaves a hole when innerRadius is set', () => {
    const layout = computePixelPieLayout([makeSlice('a', 1)], plot, {
      pixel: 4,
      outerRadius: 40,
      innerRadius: 20,
    });
    expect(layout).not.toBeNull();
    const nearCenter = layout!.cells.some((c) => {
      const mx = c.x + 2;
      const my = c.y + 2;
      return Math.hypot(mx - layout!.cx, my - layout!.cy) < 16;
    });
    expect(nearCenter).toBe(false);
    expect(layout!.innerRadius).toBe(20);
  });

  it('sets crestRow 0 near the outer rim', () => {
    const layout = computePixelPieLayout([makeSlice('a', 1)], plot, {
      pixel: 4,
      outerRadius: 40,
      innerRadius: 0,
    });
    expect(layout).not.toBeNull();
    if (layout == null) return;

    const { cells, cx, cy } = layout;
    const outerish = cells.reduce<(typeof cells)[number] | null>((best, c) => {
      const dist = Math.hypot(c.x + 2 - cx, c.y + 2 - cy);
      if (best == null) return c;
      const bestDist = Math.hypot(best.x + 2 - cx, best.y + 2 - cy);
      return dist > bestDist ? c : best;
    }, null);
    expect(outerish?.crestRow).toBe(0);
  });
});

describe('buildPieSliceList', () => {
  it('reads name/value keys and applies bands', () => {
    const slices = buildPieSliceList(
      [
        { name: 'melange', value: 10 },
        { name: 'water', value: 5 },
      ],
      'value',
      'name',
      { melange: { label: 'Melange' } },
      ['rgb(1, 2, 3)', 'rgb(4, 5, 6)'],
    );
    expect(slices).toHaveLength(2);
    expect(slices[0]?.name).toBe('melange');
    expect(slices[0]?.value).toBe(10);
    expect(slices[0]?.bands).toHaveLength(5);
  });
});

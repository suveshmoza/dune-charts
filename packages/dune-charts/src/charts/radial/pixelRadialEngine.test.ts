import { describe, expect, it } from 'vitest';

import { cellAngleDeg, normalizeDeg } from '../shared/polarMath';
import {
  angleInDirectedSector,
  buildRadialBarList,
  computePixelRadialLayout,
  computePixelRadialLayoutFromHits,
  computeRadialTracks,
  type PixelRadialBar,
} from './pixelRadialEngine';
import type { PixelWaveBands } from '../shared/pixelWaveEngine';

const BANDS: PixelWaveBands = ['#111', '#333', '#555', '#777', '#999'];

function makeBar(name: string, value: number): PixelRadialBar {
  return { name, value, bands: BANDS };
}

describe('angleInDirectedSector', () => {
  it('handles clockwise semi sweeps', () => {
    expect(angleInDirectedSector(90, 180, 0)).toBe(true);
    expect(angleInDirectedSector(270, 180, 0)).toBe(false);
    expect(angleInDirectedSector(0, 180, 0)).toBe(false);
    expect(angleInDirectedSector(179, 180, 0)).toBe(true);
  });
});

describe('computeRadialTracks', () => {
  it('places first bar innermost and sweeps by value/max', () => {
    const tracks = computeRadialTracks(
      [
        { name: 'a', value: 50 },
        { name: 'b', value: 100 },
      ],
      {
        innerRadius: 20,
        outerRadius: 80,
        pixel: 4,
        startAngle: 0,
        endAngle: 360,
      },
    );

    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.name).toBe('a');
    expect(tracks[0]?.rInner).toBe(20);
    expect(tracks[0]?.endAngle - tracks[0].startAngle).toBeCloseTo(180, 5);
    expect(tracks[1]?.name).toBe('b');
    expect(tracks[1]?.rInner).toBeGreaterThan(tracks[0].rOuter);
    expect(tracks[1]?.endAngle - tracks[1].startAngle).toBeCloseTo(360, 5);
  });

  it('supports semi arcs via endAngle', () => {
    const tracks = computeRadialTracks([{ name: 'a', value: 1 }], {
      innerRadius: 10,
      outerRadius: 50,
      pixel: 4,
      startAngle: 180,
      endAngle: 0,
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.startAngle).toBe(180);
    expect(tracks[0]?.endAngle).toBe(0);
  });

  it('ignores non-positive values', () => {
    expect(
      computeRadialTracks(
        [
          { name: 'a', value: 0 },
          { name: 'b', value: 5 },
        ],
        { innerRadius: 10, outerRadius: 50, pixel: 4 },
      ),
    ).toHaveLength(1);
  });
});

describe('buildRadialBarList', () => {
  it('maps rows like pie slices', () => {
    const bars = buildRadialBarList(
      [
        { name: 'melange', value: 42 },
        { name: 'water', value: 28 },
      ],
      'value',
      'name',
      undefined,
      ['#c45c26', '#4a90a4'],
    );
    expect(bars).toHaveLength(2);
    expect(bars[0]?.name).toBe('melange');
    expect(bars[0]?.value).toBe(42);
    expect(bars[0]?.bands).toHaveLength(5);
  });
});

describe('computePixelRadialLayout', () => {
  const plot = { x: 0, y: 0, width: 100, height: 100 };

  it('returns null for empty inputs', () => {
    expect(computePixelRadialLayout([], plot)).toBeNull();
    expect(computePixelRadialLayout([makeBar('a', 1)], { ...plot, width: 0 })).toBeNull();
  });

  it('leaves the inner hole empty', () => {
    const layout = computePixelRadialLayout([makeBar('full', 1)], plot, {
      pixel: 4,
      innerRadius: 30,
      outerRadius: 45,
      startAngle: 0,
      endAngle: 360,
    });
    expect(layout).not.toBeNull();
    expect(layout!.cells.length).toBeGreaterThan(0);
    for (const cell of layout!.cells) {
      const mx = cell.x + layout!.pixel / 2;
      const my = cell.y + layout!.pixel / 2;
      const dist = Math.hypot(mx - layout!.cx, my - layout!.cy);
      expect(dist).toBeGreaterThanOrEqual(layout!.innerRadius - 1e-6);
    }
  });

  it('assigns crestRow 0 near the track outer rim', () => {
    const layout = computePixelRadialLayout([makeBar('full', 1)], plot, {
      pixel: 4,
      innerRadius: 20,
      outerRadius: 44,
      startAngle: 0,
      endAngle: 360,
    });
    expect(layout).not.toBeNull();
    const track = layout!.tracks[0];
    const crestCells = layout!.cells.filter((c) => c.crestRow === 0);
    expect(crestCells.length).toBeGreaterThan(0);
    for (const cell of crestCells) {
      const mx = cell.x + layout!.pixel / 2;
      const my = cell.y + layout!.pixel / 2;
      const dist = Math.hypot(mx - layout!.cx, my - layout!.cy);
      expect(dist).toBeGreaterThan(track.rOuter - layout!.pixel);
    }
  });

  it('paints value wedge plus gray track remainder for partial values', () => {
    const layout = computePixelRadialLayout([makeBar('half', 50), makeBar('full', 100)], plot, {
      pixel: 4,
      innerRadius: 15,
      outerRadius: 45,
      startAngle: 0,
      endAngle: 360,
    });
    expect(layout).not.toBeNull();
    const halfCells = layout!.cells.filter((c) => c.barName === 'half');
    const halfValue = halfCells.filter((c) => c.kind === 'value');
    const halfTrack = halfCells.filter((c) => c.kind === 'track');
    expect(halfValue.length).toBeGreaterThan(0);
    expect(halfTrack.length).toBeGreaterThan(0);
    // Value sweep is 0→180°; track remainder is 180→360°.
    for (const cell of halfValue) {
      const mx = cell.x + layout!.pixel / 2;
      const my = cell.y + layout!.pixel / 2;
      const ang = normalizeDeg(cellAngleDeg(layout!.cx, layout!.cy, mx, my));
      expect(ang).toBeGreaterThanOrEqual(0);
      expect(ang).toBeLessThan(180);
    }
    for (const cell of halfTrack) {
      const mx = cell.x + layout!.pixel / 2;
      const my = cell.y + layout!.pixel / 2;
      const ang = normalizeDeg(cellAngleDeg(layout!.cx, layout!.cy, mx, my));
      expect(ang).toBeGreaterThanOrEqual(180);
      expect(ang).toBeLessThan(360);
    }
  });
});

describe('computePixelRadialLayoutFromHits', () => {
  const plot = { x: 0, y: 0, width: 100, height: 100 };

  it('paints using Recharts sector radii and angles', () => {
    const layout = computePixelRadialLayoutFromHits(
      [
        {
          barName: 'inner',
          value: 1,
          cx: 50,
          cy: 50,
          rInner: 20,
          rOuter: 30,
          startAngle: 0,
          endAngle: 360,
        },
        {
          barName: 'outer',
          value: 1,
          cx: 50,
          cy: 50,
          rInner: 34,
          rOuter: 44,
          startAngle: 0,
          endAngle: 90,
        },
      ],
      plot,
      4,
    );
    expect(layout).not.toBeNull();
    expect(layout!.tracks.map((t) => t.name)).toEqual(['inner', 'outer']);
    expect(layout!.cells.some((c) => c.barName === 'inner')).toBe(true);
    expect(layout!.cells.some((c) => c.barName === 'outer')).toBe(true);
    const outerValue = layout!.cells.filter((c) => c.barName === 'outer' && c.kind === 'value');
    const outerTrack = layout!.cells.filter((c) => c.barName === 'outer' && c.kind === 'track');
    expect(outerValue.length).toBeGreaterThan(0);
    expect(outerTrack.length).toBeGreaterThan(0);
    for (const cell of outerValue) {
      const mx = cell.x + layout!.pixel / 2;
      const my = cell.y + layout!.pixel / 2;
      const ang = normalizeDeg(cellAngleDeg(layout!.cx, layout!.cy, mx, my));
      expect(ang).toBeGreaterThanOrEqual(0);
      expect(ang).toBeLessThan(90);
    }
  });
});

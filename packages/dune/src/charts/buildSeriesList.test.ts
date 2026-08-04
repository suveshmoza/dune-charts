import { describe, expect, it } from 'vitest';

import { buildSeriesList } from './buildSeriesList';

type Row = { month: string; a: number | null | string; b: number | null | string };

const baseColors = ['#c45c26', '#3d8a7a'];

describe('buildSeriesList', () => {
  it('stacks shared stackId with chained bases/tops', () => {
    const data: Row[] = [
      { month: 'Jan', a: 2, b: 3 },
      { month: 'Feb', a: 4, b: 1 },
    ];
    const series = buildSeriesList(
      data,
      ['a', 'b'],
      undefined,
      baseColors,
      { a: { stackId: 'ops' }, b: { stackId: 'ops' } },
      undefined,
    );

    expect(series).toHaveLength(2);
    expect(series[0]?.bases).toEqual([0, 0]);
    expect(series[0]?.values).toEqual([2, 4]);
    expect(series[1]?.bases).toEqual([2, 4]);
    expect(series[1]?.values).toEqual([5, 5]);
    expect(series[0]?.stackId).toBe('ops');
    expect(series[1]?.stackIndex).toBe(1);
  });

  it('normalizes expand stack so tops sum to 1', () => {
    const data: Row[] = [{ month: 'Jan', a: 2, b: 3 }];
    const series = buildSeriesList(
      data,
      ['a', 'b'],
      undefined,
      baseColors,
      { a: { stackId: 'ops' }, b: { stackId: 'ops' } },
      { stackOffset: 'expand' },
    );

    const [bottom, top] = series;
    expect(bottom).toBeDefined();
    expect(top).toBeDefined();
    expect(bottom.values[0]).toBeCloseTo(2 / 5);
    expect(top.values[0]).toBeCloseTo(1);
    expect(top.bases?.[0]).toBeCloseTo(2 / 5);
  });

  it('leaves unstacked series independent without bases', () => {
    const data: Row[] = [{ month: 'Jan', a: 2, b: 9 }];
    const series = buildSeriesList(data, ['a', 'b'], undefined, baseColors, undefined, undefined);

    expect(series[0]?.values).toEqual([2]);
    expect(series[1]?.values).toEqual([9]);
    expect(series[0]?.bases).toBeUndefined();
    expect(series[0]?.stackId).toBeUndefined();
  });

  it('coerces non-numeric values to 0', () => {
    const data: Row[] = [{ month: 'Jan', a: null, b: 'nope' }];
    const series = buildSeriesList(data, ['a', 'b'], undefined, baseColors, undefined, undefined);

    expect(series[0]?.values).toEqual([0]);
    expect(series[1]?.values).toEqual([0]);
  });

  it('uses config label for series name', () => {
    const data: Row[] = [{ month: 'Jan', a: 1, b: 1 }];
    const series = buildSeriesList(
      data,
      ['a'],
      { a: { label: 'Melange' } },
      baseColors,
      undefined,
      undefined,
    );
    expect(series[0]?.name).toBe('Melange');
  });
});

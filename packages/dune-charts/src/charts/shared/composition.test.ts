import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { collectChartParts, markDunePart } from './composition';

const FakeArea = markDunePart(
  function FakeArea(_props: { dataKey: string; stackId?: string }) {
    return null;
  },
  (props) => ({
    part: 'series',
    kind: 'area',
    dataKey: props.dataKey,
    stackId: props.stackId,
  }),
);

const FakeXAxis = markDunePart(
  function FakeXAxis(_props: { dataKey: string }) {
    return null;
  },
  (props) => ({ part: 'x-axis', dataKey: props.dataKey }),
);

describe('collectChartParts', () => {
  it('collects series order and index key from compound children', () => {
    const parts = collectChartParts([
      createElement(FakeXAxis, { dataKey: 'month' }),
      createElement(FakeArea, { dataKey: 'melange', stackId: 'ops' }),
      createElement(FakeArea, { dataKey: 'water', stackId: 'ops' }),
    ]);

    expect(parts.indexKey).toBe('month');
    expect(parts.series.map((s) => s.dataKey)).toEqual(['melange', 'water']);
    expect(parts.series[0]?.stackId).toBe('ops');
  });
});

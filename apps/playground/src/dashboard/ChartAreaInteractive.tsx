import { DuneAreaChart, type PixelWaveFill } from 'dune';
import { useMemo, useState } from 'react';

import { THROUGHPUT_KEYS, throughput, throughputConfig, type ThroughputRow } from './data';

const RANGES = [
  { id: '12m', label: 'Last 12 months', months: 12 },
  { id: '6m', label: 'Last 6 months', months: 6 },
  { id: '3m', label: 'Last 3 months', months: 3 },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

export function ChartAreaInteractive({ fill = 'bands' }: { fill?: PixelWaveFill }) {
  const [range, setRange] = useState<RangeId>('12m');

  const months = RANGES.find((r) => r.id === range)?.months ?? 12;
  const data = useMemo(() => throughput.slice(-months), [months]);

  const stackProps = useMemo(
    () =>
      ({
        melange: { stackId: 'ops' },
        water: { stackId: 'ops' },
        thrift: { stackId: 'ops' },
        wind: { stackId: 'ops' },
        silica: { stackId: 'ops' },
      }) satisfies Record<(typeof THROUGHPUT_KEYS)[number], { stackId: string }>,
    [],
  );

  return (
    <section className="db-chart-card">
      <div className="db-chart-card__head">
        <div>
          <h2 className="db-chart-card__title">Total Visitors</h2>
          <p className="db-chart-card__desc">
            {range === '12m'
              ? 'Total for the last 12 months'
              : range === '6m'
                ? 'Total for the last 6 months'
                : 'Total for the last 3 months'}
          </p>
        </div>
        <div className="db-toggle" role="group" aria-label="Time range">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`db-toggle__item${range === item.id ? ' is-active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <DuneAreaChart<ThroughputRow>
        data={data}
        index="month"
        categories={[...THROUGHPUT_KEYS]}
        height={280}
        title="Total Visitors"
        description="Stacked spice throughput for the selected range."
        config={throughputConfig}
        fill={fill}
        valueFormatter={(value) => String(value)}
        seriesProps={stackProps}
      />
    </section>
  );
}

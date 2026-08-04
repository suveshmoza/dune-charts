import { DuneAreaChart, type PixelWaveFill } from 'dune';
import { useMemo, useState, type ReactNode } from 'react';

import { THROUGHPUT_KEYS, throughput, throughputConfig, type ThroughputRow } from './data';

const RANGES = [
  { id: '12m', label: 'Last 12 months', months: 12 },
  { id: '6m', label: 'Last 6 months', months: 6 },
  { id: '3m', label: 'Last 3 months', months: 3 },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

type ChartControls = {
  fill?: PixelWaveFill;
  pixel?: number;
};

function ChartCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="db-chart-card">
      <div className="db-chart-card__head">
        <div>
          <h2 className="db-chart-card__title">{title}</h2>
          <p className="db-chart-card__desc">{description}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function useRangeData() {
  const [range, setRange] = useState<RangeId>('12m');
  const months = RANGES.find((r) => r.id === range)?.months ?? 12;
  const data = useMemo(() => throughput.slice(-months), [months]);
  const rangeToggle = (
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
  );
  return { data, rangeToggle };
}

const stackProps = {
  melange: { stackId: 'ops' },
  water: { stackId: 'ops' },
  thrift: { stackId: 'ops' },
  wind: { stackId: 'ops' },
  silica: { stackId: 'ops' },
} satisfies Record<(typeof THROUGHPUT_KEYS)[number], { stackId: string }>;

const expandStackProps = {
  melange: { stackId: 'share' },
  water: { stackId: 'share' },
  thrift: { stackId: 'share' },
} satisfies Record<'melange' | 'water' | 'thrift', { stackId: string }>;

/** Stacked multi-series area with range toggle. */
export function ChartAreaStacked({ fill = 'bands', pixel = 4 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Stacked throughput"
      description="All series share one stack — classic dune ridge."
      actions={rangeToggle}
    >
      <DuneAreaChart<ThroughputRow>
        data={data}
        index="month"
        categories={[...THROUGHPUT_KEYS]}
        height={280}
        title="Stacked throughput"
        description="Stacked spice throughput for the selected range."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
        seriesProps={stackProps}
      />
    </ChartCard>
  );
}

/** Single-series area. */
export function ChartAreaSimple({ fill = 'bands', pixel = 4 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Simple area"
      description="One series — melange harvest only."
      actions={rangeToggle}
    >
      <DuneAreaChart<ThroughputRow>
        data={data}
        index="month"
        categories={['melange']}
        height={280}
        title="Simple area"
        description="Single-series melange area chart."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** 100% stacked share of three series. */
export function ChartAreaExpand({ fill = 'bands', pixel = 4 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="100% stacked"
      description="Expand stack — each month sums to full height."
      actions={rangeToggle}
    >
      <DuneAreaChart<ThroughputRow>
        data={data}
        index="month"
        categories={['melange', 'water', 'thrift']}
        height={280}
        title="100% stacked"
        description="Percent stacked melange, water, and thrift."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => `${Math.round(value * 100)}%`}
        seriesProps={expandStackProps}
        chartProps={{ stackOffset: 'expand' }}
        yAxisProps={{
          tickFormatter: (value: number) => `${Math.round(Number(value) * 100)}%`,
        }}
      />
    </ChartCard>
  );
}

/** Gallery of area chart variants for the dashboard. */
export function ChartAreaInteractive(props: ChartControls) {
  return (
    <div className="db-chart-gallery">
      <ChartAreaStacked {...props} />
      <ChartAreaSimple {...props} />
      <ChartAreaExpand {...props} />
    </div>
  );
}

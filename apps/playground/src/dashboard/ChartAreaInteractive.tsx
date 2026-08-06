import {
  DuneAreaChart,
  DuneBarChart,
  DuneComposedChart,
  DuneLineChart,
  DunePieChart,
  DuneRadarChart,
  DuneRadialChart,
  type PixelWaveFill,
} from '@suveshmoza/dune-charts';
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
export function ChartAreaStacked({ fill = 'bands', pixel = 2 }: ChartControls) {
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
export function ChartAreaSimple({ fill = 'bands', pixel = 2 }: ChartControls) {
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
export function ChartAreaExpand({ fill = 'bands', pixel = 2 }: ChartControls) {
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
          tickFormatter: (value: number) => `${Math.round(value * 100)}%`,
        }}
      />
    </ChartCard>
  );
}

/** Stacked pixel bars. */
export function ChartBarStacked({ fill = 'bands', pixel = 2 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Stacked bars"
      description="Pixel-block bars — same stack as the area ridge."
      actions={rangeToggle}
    >
      <DuneBarChart<ThroughputRow>
        data={data}
        index="month"
        categories={[...THROUGHPUT_KEYS]}
        height={280}
        title="Stacked bars"
        description="Stacked spice throughput as pixel bars."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
        seriesProps={stackProps}
      />
    </ChartCard>
  );
}

/** Single-series pixel bar. */
export function ChartBarSimple({ fill = 'bands', pixel = 2 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Simple bars"
      description="One series — melange as pixel columns."
      actions={rangeToggle}
    >
      <DuneBarChart<ThroughputRow>
        data={data}
        index="month"
        categories={['melange']}
        height={280}
        title="Simple bars"
        description="Single-series melange bar chart."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Multi-series stepped pixel lines. */
export function ChartLineMulti({ pixel = 2 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Stepped lines"
      description="Pixel step-after lines — overlay, no fill wave."
      actions={rangeToggle}
    >
      <DuneLineChart<ThroughputRow>
        data={data}
        index="month"
        categories={['melange', 'water', 'thrift']}
        height={280}
        title="Stepped lines"
        description="Multi-series stepped pixel line chart."
        config={throughputConfig}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Single-series stepped pixel line. */
export function ChartLineSimple({ pixel = 2 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Simple line"
      description="One series — melange as a stepped pixel path."
      actions={rangeToggle}
    >
      <DuneLineChart<ThroughputRow>
        data={data}
        index="month"
        categories={['melange']}
        height={280}
        title="Simple line"
        description="Single-series stepped pixel line chart."
        config={throughputConfig}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

type ShareSlice = { name: string; value: number };

const SHARE_SLICES: ShareSlice[] = [
  { name: 'melange', value: 42 },
  { name: 'water', value: 28 },
  { name: 'thrift', value: 18 },
  { name: 'wind', value: 8 },
  { name: 'silica', value: 4 },
];

/** Pixel pie wedges. */
export function ChartPieSimple({ fill = 'bands', pixel = 2 }: ChartControls) {
  return (
    <ChartCard title="Pixel pie" description="Chunky wedges — crest→depth bands from the rim.">
      <DunePieChart<ShareSlice>
        data={SHARE_SLICES}
        dataKey="value"
        nameKey="name"
        height={280}
        title="Pixel pie"
        description="Share of spice throughput as a pixel pie."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Pixel donut via pieProps.innerRadius. */
export function ChartPieDonut({ fill = 'bands', pixel = 2 }: ChartControls) {
  return (
    <ChartCard title="Pixel donut" description="Same wedges with an inner hole.">
      <DunePieChart<ShareSlice>
        data={SHARE_SLICES}
        dataKey="value"
        nameKey="name"
        height={280}
        title="Pixel donut"
        description="Donut share chart with pixel fill."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
        pieProps={{ innerRadius: '45%', outerRadius: '80%' }}
      />
    </ChartCard>
  );
}

type RadarRow = {
  axis: string;
  melange: number;
  water: number;
  thrift: number;
};

const RADAR_DATA: RadarRow[] = [
  { axis: 'Yield', melange: 86, water: 62, thrift: 54 },
  { axis: 'Purity', melange: 72, water: 88, thrift: 60 },
  { axis: 'Reach', melange: 64, water: 58, thrift: 90 },
  { axis: 'Speed', melange: 78, water: 70, thrift: 66 },
  { axis: 'Risk', melange: 48, water: 74, thrift: 52 },
  { axis: 'Stock', melange: 90, water: 55, thrift: 70 },
];

/** Pixel radar polygons. */
export function ChartRadarSimple({ fill = 'bands', pixel = 2 }: ChartControls) {
  return (
    <ChartCard title="Pixel radar" description="Filled spider polygons — crest→depth from the rim.">
      <DuneRadarChart<RadarRow>
        data={RADAR_DATA}
        index="axis"
        categories={['melange', 'water', 'thrift']}
        height={320}
        title="Pixel radar"
        description="Ops metrics as pixel-filled radar series."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Pixel radial ring arcs. */
export function ChartRadialSimple({ fill = 'bands', pixel = 2 }: ChartControls) {
  return (
    <ChartCard title="Pixel radial" description="Concentric ring arcs — value sweeps the angle.">
      <DuneRadialChart<ShareSlice>
        data={SHARE_SLICES}
        dataKey="value"
        nameKey="name"
        height={280}
        title="Pixel radial"
        description="Share of spice throughput as pixel radial bars."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Semi-circle pixel radial. */
export function ChartRadialSemi({ fill = 'bands', pixel = 2 }: ChartControls) {
  return (
    <ChartCard title="Pixel radial (semi)" description="Same arcs clipped to a half ring.">
      <DuneRadialChart<ShareSlice>
        data={SHARE_SLICES}
        dataKey="value"
        nameKey="name"
        height={280}
        title="Pixel radial semi"
        description="Semi radial bars with pixel fill."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
        chartProps={{ startAngle: 180, endAngle: 0, cy: '70%' }}
      />
    </ChartCard>
  );
}

/** Bars + line on shared scales. */
export function ChartComposedBarLine({ fill = 'bands', pixel = 2 }: ChartControls) {
  const { data, rangeToggle } = useRangeData();

  return (
    <ChartCard
      title="Pixel composed"
      description="Bars for volume, line for a companion series — one chart, shared scales."
      actions={rangeToggle}
    >
      <DuneComposedChart<ThroughputRow>
        data={data}
        index="month"
        bars={['melange', 'water']}
        lines={['thrift']}
        height={280}
        title="Pixel composed"
        description="Composed bar and line throughput."
        config={throughputConfig}
        fill={fill}
        pixel={pixel}
        valueFormatter={(value) => String(value)}
      />
    </ChartCard>
  );
}

/** Gallery of area + bar + line + pie + radar + radial + composed chart variants. */
export function ChartAreaInteractive(props: ChartControls) {
  return (
    <div className="db-chart-gallery">
      <ChartAreaStacked {...props} />
      <ChartAreaSimple {...props} />
      <ChartAreaExpand {...props} />
      <ChartBarStacked {...props} />
      <ChartBarSimple {...props} />
      <ChartLineMulti {...props} />
      <ChartLineSimple {...props} />
      <ChartPieSimple {...props} />
      <ChartPieDonut {...props} />
      <ChartRadarSimple {...props} />
      <ChartRadialSimple {...props} />
      <ChartRadialSemi {...props} />
      <ChartComposedBarLine {...props} />
    </div>
  );
}

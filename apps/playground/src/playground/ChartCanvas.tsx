import {
  DuneAreaChart,
  DuneBarChart,
  DuneLineChart,
  DunePieChart,
  DuneRadarChart,
  DuneRadialChart,
} from '@suveshmoza/dune-charts';

import type { ChartId, PlaygroundControls } from './chart-catalog';
import {
  radarData,
  shareSlices,
  throughput,
  throughputConfig,
  THROUGHPUT_KEYS,
  type RadarRow,
  type ShareSlice,
  type ThroughputRow,
} from './sample-data';

export function ChartCanvas({
  chart,
  controls,
  height = 360,
}: {
  chart: ChartId;
  controls: PlaygroundControls;
  height?: number;
}) {
  const { fill, pixel, loading, empty, variant } = controls;
  const data = empty ? ([] as ThroughputRow[]) : throughput;
  const slices = empty ? ([] as ShareSlice[]) : shareSlices;
  const radar = empty ? ([] as RadarRow[]) : radarData;

  switch (chart) {
    case 'area':
      if (variant === 'stacked') {
        return (
          <DuneAreaChart
            data={data}
            config={throughputConfig}
            fill={fill}
            pixel={pixel}
            loading={loading}
            height={height}
            title="Stacked area"
            description="All series share one stack."
            valueFormatter={(value) => String(value)}
          >
            <DuneAreaChart.Grid />
            <DuneAreaChart.XAxis dataKey="month" />
            <DuneAreaChart.YAxis />
            <DuneAreaChart.Tooltip />
            <DuneAreaChart.Legend />
            {THROUGHPUT_KEYS.map((key) => (
              <DuneAreaChart.Area key={key} dataKey={key} stackId="ops" />
            ))}
          </DuneAreaChart>
        );
      }
      if (variant === 'expand') {
        return (
          <DuneAreaChart
            data={data}
            config={throughputConfig}
            fill={fill}
            pixel={pixel}
            loading={loading}
            height={height}
            title="100% stacked area"
            description="Each month expands to full height."
            chartProps={{ stackOffset: 'expand' }}
            valueFormatter={(value) => `${Math.round(value * 100)}%`}
          >
            <DuneAreaChart.Grid />
            <DuneAreaChart.XAxis dataKey="month" />
            <DuneAreaChart.YAxis tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
            <DuneAreaChart.Tooltip />
            <DuneAreaChart.Legend />
            <DuneAreaChart.Area dataKey="melange" stackId="share" />
            <DuneAreaChart.Area dataKey="water" stackId="share" />
            <DuneAreaChart.Area dataKey="thrift" stackId="share" />
          </DuneAreaChart>
        );
      }
      return (
        <DuneAreaChart
          data={data}
          config={throughputConfig}
          fill={fill}
          pixel={pixel}
          loading={loading}
          height={height}
          title="Simple area"
          description="Single-series melange area."
          valueFormatter={(value) => String(value)}
        >
          <DuneAreaChart.Grid />
          <DuneAreaChart.XAxis dataKey="month" />
          <DuneAreaChart.YAxis />
          <DuneAreaChart.Tooltip />
          <DuneAreaChart.Legend />
          <DuneAreaChart.Area dataKey="melange" />
        </DuneAreaChart>
      );

    case 'bar':
      if (variant === 'stacked') {
        return (
          <DuneBarChart
            data={data}
            config={throughputConfig}
            fill={fill}
            pixel={pixel}
            loading={loading}
            height={height}
            title="Stacked bars"
            description="Stacked pixel bars."
            valueFormatter={(value) => String(value)}
          >
            <DuneBarChart.Grid />
            <DuneBarChart.XAxis dataKey="month" />
            <DuneBarChart.YAxis />
            <DuneBarChart.Tooltip />
            <DuneBarChart.Legend />
            {THROUGHPUT_KEYS.map((key) => (
              <DuneBarChart.Bar key={key} dataKey={key} stackId="ops" />
            ))}
          </DuneBarChart>
        );
      }
      if (variant === 'horizontal') {
        return (
          <DuneBarChart
            data={data}
            config={throughputConfig}
            fill={fill}
            pixel={pixel}
            loading={loading}
            height={height}
            title="Horizontal bars"
            description="Categories on Y as pixel rows."
            layout="vertical"
            valueFormatter={(value) => String(value)}
          >
            <DuneBarChart.Grid />
            <DuneBarChart.XAxis dataKey="month" />
            <DuneBarChart.YAxis />
            <DuneBarChart.Tooltip />
            <DuneBarChart.Legend />
            <DuneBarChart.Bar dataKey="melange" />
          </DuneBarChart>
        );
      }
      return (
        <DuneBarChart
          data={data}
          config={throughputConfig}
          fill={fill}
          pixel={pixel}
          loading={loading}
          height={height}
          title="Simple bars"
          description="Single-series melange bars."
          valueFormatter={(value) => String(value)}
        >
          <DuneBarChart.Grid />
          <DuneBarChart.XAxis dataKey="month" />
          <DuneBarChart.YAxis />
          <DuneBarChart.Tooltip />
          <DuneBarChart.Legend />
          <DuneBarChart.Bar dataKey="melange" />
        </DuneBarChart>
      );

    case 'line':
      return (
        <DuneLineChart
          data={data}
          config={throughputConfig}
          pixel={pixel}
          loading={loading}
          height={height}
          title={variant === 'multi' ? 'Multi-series line' : 'Simple line'}
          description="Stepped pixel lines."
          valueFormatter={(value) => String(value)}
        >
          <DuneLineChart.Grid />
          <DuneLineChart.XAxis dataKey="month" />
          <DuneLineChart.YAxis />
          <DuneLineChart.Tooltip />
          <DuneLineChart.Legend />
          {(variant === 'multi'
            ? (['melange', 'water', 'thrift'] as const)
            : (['melange'] as const)
          ).map((key) => (
            <DuneLineChart.Line key={key} dataKey={key} />
          ))}
        </DuneLineChart>
      );

    case 'pie':
      return (
        <DunePieChart
          data={slices}
          config={throughputConfig}
          fill={fill}
          pixel={pixel}
          loading={loading}
          height={height}
          title={variant === 'donut' ? 'Pixel donut' : 'Pixel pie'}
          description="Share as pixel wedges."
          valueFormatter={(value) => String(value)}
        >
          <DunePieChart.Tooltip />
          <DunePieChart.Legend />
          <DunePieChart.Pie
            dataKey="value"
            nameKey="name"
            {...(variant === 'donut' ? { innerRadius: '45%', outerRadius: '80%' } : null)}
          />
        </DunePieChart>
      );

    case 'radar':
      return (
        <DuneRadarChart
          data={radar}
          config={throughputConfig}
          fill={fill}
          pixel={pixel}
          loading={loading}
          height={height}
          title="Pixel radar"
          description="Ops metrics as pixel radar."
          valueFormatter={(value) => String(value)}
        >
          <DuneRadarChart.PolarGrid />
          <DuneRadarChart.PolarAngleAxis dataKey="axis" />
          <DuneRadarChart.PolarRadiusAxis />
          <DuneRadarChart.Tooltip />
          <DuneRadarChart.Legend />
          <DuneRadarChart.Radar dataKey="melange" />
          <DuneRadarChart.Radar dataKey="water" />
          <DuneRadarChart.Radar dataKey="thrift" />
        </DuneRadarChart>
      );

    case 'radial':
      return (
        <DuneRadialChart
          data={slices}
          config={throughputConfig}
          fill={fill}
          pixel={pixel}
          loading={loading}
          height={height}
          title={variant === 'semi' ? 'Semi radial' : 'Pixel radial'}
          description="Concentric pixel ring arcs."
          chartProps={variant === 'semi' ? { startAngle: 180, endAngle: 0, cy: '70%' } : undefined}
          valueFormatter={(value) => String(value)}
        >
          <DuneRadialChart.Tooltip />
          <DuneRadialChart.Legend />
          <DuneRadialChart.RadialBar dataKey="value" nameKey="name" />
        </DuneRadialChart>
      );

    default:
      return null;
  }
}

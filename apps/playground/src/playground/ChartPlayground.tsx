import {
  DuneAreaChart,
  DuneBarChart,
  DuneChartProvider,
  DuneLineChart,
  DunePieChart,
  DuneRadarChart,
  DuneRadialChart,
  DUNE_THEMES,
  PIXEL_WAVE_FILLS,
  type DuneTheme,
  type PixelWaveFill,
} from '@suveshmoza/dune-charts';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

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

const CHARTS = [
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' },
  { id: 'pie', label: 'Pie' },
  { id: 'radar', label: 'Radar' },
  { id: 'radial', label: 'Radial' },
] as const;

type ChartId = (typeof CHARTS)[number]['id'];

const VARIANTS: Record<ChartId, readonly { id: string; label: string }[]> = {
  area: [
    { id: 'simple', label: 'Simple' },
    { id: 'stacked', label: 'Stacked' },
    { id: 'expand', label: '100% stacked' },
  ],
  bar: [
    { id: 'simple', label: 'Simple' },
    { id: 'stacked', label: 'Stacked' },
    { id: 'horizontal', label: 'Horizontal' },
  ],
  line: [
    { id: 'simple', label: 'Simple' },
    { id: 'multi', label: 'Multi-series' },
  ],
  pie: [
    { id: 'pie', label: 'Pie' },
    { id: 'donut', label: 'Donut' },
  ],
  radar: [{ id: 'simple', label: 'Simple' }],
  radial: [
    { id: 'full', label: 'Full ring' },
    { id: 'semi', label: 'Semi ring' },
  ],
};

const PIXEL_SIZES = [
  { id: '1', label: '1px' },
  { id: '2', label: '2px' },
  { id: '4', label: '4px' },
  { id: '8', label: '8px' },
] as const;

type PlaygroundControls = {
  fill: PixelWaveFill;
  pixel: number;
  loading: boolean;
  empty: boolean;
  variant: string;
};

function ControlRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-muted-foreground font-normal">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ChartCanvas({ chart, controls }: { chart: ChartId; controls: PlaygroundControls }) {
  const { fill, pixel, loading, empty, variant } = controls;
  const data = empty ? ([] as ThroughputRow[]) : throughput;
  const slices = empty ? ([] as ShareSlice[]) : shareSlices;
  const radar = empty ? ([] as RadarRow[]) : radarData;
  const height = 360;

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

export function ChartPlayground() {
  const [chart, setChart] = useState<ChartId>('area');
  const [variant, setVariant] = useState('stacked');
  const [theme, setTheme] = useState<DuneTheme>('dune');
  const [fill, setFill] = useState<PixelWaveFill>('dither');
  const [pixel, setPixel] = useState('2');
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  const variants = VARIANTS[chart];
  const supportsFill = chart !== 'line';

  useEffect(() => {
    const stillValid = variants.some((item) => item.id === variant);
    if (!stillValid) {
      setVariant(variants[0]?.id ?? 'simple');
    }
  }, [chart, variant, variants]);

  const chartLabel = useMemo(
    () => CHARTS.find((item) => item.id === chart)?.label ?? chart,
    [chart],
  );

  const variantLabel = useMemo(
    () => variants.find((item) => item.id === variant)?.label ?? variant,
    [variant, variants],
  );

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <header className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            @suveshmoza/dune-charts
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
          <p className="text-muted-foreground text-sm">
            Pick a chart and toggle themes, fills, pixel size, and states.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Controls</CardTitle>
              <CardDescription>Live render options</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ControlRow label="Chart" htmlFor="chart-select">
                <Select
                  value={chart}
                  onValueChange={(value) => {
                    if (value != null) setChart(value);
                  }}
                >
                  <SelectTrigger id="chart-select" className="w-full">
                    <SelectValue>{CHARTS.find((item) => item.id === chart)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CHARTS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlRow>

              <ControlRow label="Variant" htmlFor="variant-select">
                <Select
                  value={variant}
                  onValueChange={(value) => {
                    if (value != null) setVariant(value);
                  }}
                >
                  <SelectTrigger id="variant-select" className="w-full">
                    <SelectValue>{variants.find((item) => item.id === variant)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlRow>

              <Separator />

              <ControlRow label="Theme" htmlFor="theme-select">
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    if (value != null) setTheme(value);
                  }}
                >
                  <SelectTrigger id="theme-select" className="w-full">
                    <SelectValue>{theme}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DUNE_THEMES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlRow>

              <ControlRow label="Fill" htmlFor="fill-select">
                <Select
                  value={fill}
                  disabled={!supportsFill}
                  onValueChange={(value) => {
                    if (value != null) setFill(value);
                  }}
                >
                  <SelectTrigger id="fill-select" className="w-full">
                    <SelectValue>{fill}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PIXEL_WAVE_FILLS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlRow>

              <ControlRow label="Pixel size" htmlFor="pixel-select">
                <Select
                  value={pixel}
                  onValueChange={(value) => {
                    if (value != null) setPixel(value);
                  }}
                >
                  <SelectTrigger id="pixel-select" className="w-full">
                    <SelectValue>
                      {PIXEL_SIZES.find((item) => item.id === pixel)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PIXEL_SIZES.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ControlRow>

              <Separator />

              <ToggleRow
                id="loading-toggle"
                label="Loading"
                checked={loading}
                onCheckedChange={setLoading}
              />
              <ToggleRow
                id="empty-toggle"
                label="Empty data"
                checked={empty}
                onCheckedChange={setEmpty}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {chartLabel} · {variantLabel}
              </CardTitle>
              <CardDescription>
                theme={theme}
                {supportsFill ? ` · fill=${fill}` : ''} · pixel={pixel}
                {loading ? ' · loading' : ''}
                {empty ? ' · empty' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DuneChartProvider theme={theme}>
                <ChartCanvas
                  chart={chart}
                  controls={{
                    fill,
                    pixel: Number(pixel),
                    loading,
                    empty,
                    variant,
                  }}
                />
              </DuneChartProvider>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

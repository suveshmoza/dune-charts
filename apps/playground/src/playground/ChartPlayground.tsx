import {
  DuneChartProvider,
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

import { CHARTS, VARIANTS, type ChartId } from './chart-catalog';
import { ChartCanvas } from './ChartCanvas';

const PIXEL_SIZES = [
  { id: '1', label: '1px' },
  { id: '2', label: '2px' },
  { id: '4', label: '4px' },
  { id: '8', label: '8px' },
] as const;

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
                  <SelectValue>{PIXEL_SIZES.find((item) => item.id === pixel)?.label}</SelectValue>
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
  );
}

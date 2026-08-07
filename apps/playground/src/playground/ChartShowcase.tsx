import { DuneChartProvider, DUNE_THEMES, type DuneTheme } from '@suveshmoza/dune-charts';
import { RefreshCwIcon } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { CHARTS, VARIANTS, type ChartId } from './chart-catalog';
import { ChartCanvas } from './ChartCanvas';

type ShowcaseItem = {
  chartId: ChartId;
  chartLabel: string;
  variantId: string;
  variantLabel: string;
  key: string;
};

const SHOWCASE_ITEMS: ShowcaseItem[] = CHARTS.flatMap((chart) =>
  VARIANTS[chart.id].map((variant) => ({
    chartId: chart.id,
    chartLabel: chart.label,
    variantId: variant.id,
    variantLabel: variant.label,
    key: `${chart.id}-${variant.id}`,
  })),
);

/** How long every chart stays in the loading skeleton before the stagger queue starts. */
const LOADING_VISIBLE_MS = 900;
/** Extra delay between consecutive chart reveals (keeps mounts spread out). */
const STAGGER_STEP_MS = 120;

function ShowcaseCard({
  item,
  theme,
  index,
  reloadKey,
  onBusyChange,
}: {
  item: ShowcaseItem;
  theme: DuneTheme;
  index: number;
  reloadKey: number;
  onBusyChange: (delta: 1 | -1) => void;
}) {
  const [loading, setLoading] = useState(true);
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  useEffect(() => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      onBusyChangeRef.current(-1);
    };

    setLoading(true);
    onBusyChangeRef.current(1);

    const id = window.setTimeout(
      () => {
        startTransition(() => {
          setLoading(false);
          release();
        });
      },
      LOADING_VISIBLE_MS + index * STAGGER_STEP_MS,
    );

    return () => {
      window.clearTimeout(id);
      release();
    };
  }, [theme, reloadKey, index]);

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {item.chartLabel} · {item.variantLabel}
        </CardTitle>
        <CardDescription>
          theme={theme} · fill=dither · pixel=2
          {loading ? ' · loading' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartCanvas
          chart={item.chartId}
          height={260}
          controls={{
            fill: 'dither',
            pixel: 2,
            loading,
            empty: false,
            variant: item.variantId,
          }}
        />
      </CardContent>
    </Card>
  );
}

export function ChartShowcase() {
  const [theme, setTheme] = useState<DuneTheme>('dune');
  const [reloadKey, setReloadKey] = useState(0);
  const [anyLoading, setAnyLoading] = useState(true);
  const busyCountRef = useRef(0);

  const onBusyChange = (delta: 1 | -1) => {
    busyCountRef.current = Math.max(0, busyCountRef.current + delta);
    setAnyLoading(busyCountRef.current > 0);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            @suveshmoza/dune-charts
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Showcase</h1>
          <p className="text-muted-foreground text-sm">
            All chart variants at a glance — dither fill, 2px pixels.
          </p>
        </div>

        <div className="flex w-full items-end gap-2 sm:w-auto">
          <button
            type="button"
            aria-label="Reload showcase"
            title="Reload showcase"
            className="border-input bg-background text-foreground hover:bg-muted inline-flex size-9 shrink-0 items-center justify-center rounded-md border shadow-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
            disabled={anyLoading}
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <RefreshCwIcon className={`size-4 ${anyLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-48 sm:flex-none">
            <Label htmlFor="showcase-theme" className="text-muted-foreground font-normal">
              Theme
            </Label>
            <Select
              value={theme}
              onValueChange={(value) => {
                if (value != null) setTheme(value);
              }}
            >
              <SelectTrigger id="showcase-theme" className="w-full">
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
          </div>
        </div>
      </header>

      <DuneChartProvider theme={theme}>
        <div className="grid gap-6 md:grid-cols-2">
          {SHOWCASE_ITEMS.map((item, index) => (
            <ShowcaseCard
              key={item.key}
              item={item}
              theme={theme}
              index={index}
              reloadKey={reloadKey}
              onBusyChange={onBusyChange}
            />
          ))}
        </div>
      </DuneChartProvider>
    </div>
  );
}

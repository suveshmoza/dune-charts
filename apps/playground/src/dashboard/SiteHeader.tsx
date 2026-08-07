import type { PixelWaveFill, DuneTheme } from '@suveshmoza/dune-charts';
import { PIXEL_WAVE_FILLS, DUNE_THEMES } from '@suveshmoza/dune-charts';
import { IconLayoutSidebar, IconX } from '@tabler/icons-react';

const PIXEL_SIZES = [1, 2, 4, 8] as const;
export type PixelSize = (typeof PIXEL_SIZES)[number];

type SiteHeaderProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  theme: DuneTheme;
  fill: PixelWaveFill;
  pixel: PixelSize;
  loading: boolean;
  onThemeChange: (theme: DuneTheme) => void;
  onFillChange: (fill: PixelWaveFill) => void;
  onPixelChange: (pixel: PixelSize) => void;
  onLoadingChange: (loading: boolean) => void;
};

function isDuneTheme(value: string): value is DuneTheme {
  for (const theme of DUNE_THEMES) {
    if (theme === value) return true;
  }
  return false;
}

function isPixelWaveFill(value: string): value is PixelWaveFill {
  for (const fill of PIXEL_WAVE_FILLS) {
    if (fill === value) return true;
  }
  return false;
}

function isPixelSize(value: number): value is PixelSize {
  for (const size of PIXEL_SIZES) {
    if (size === value) return true;
  }
  return false;
}

export function SiteHeader({
  sidebarOpen,
  onToggleSidebar,
  theme,
  fill,
  pixel,
  loading,
  onThemeChange,
  onFillChange,
  onPixelChange,
  onLoadingChange,
}: SiteHeaderProps) {
  return (
    <header className="db-header">
      <div className="db-header__left">
        <button
          type="button"
          className="db-header__trigger"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="db-sidebar"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? (
            <IconX size={18} stroke={2.25} aria-hidden />
          ) : (
            <IconLayoutSidebar size={18} stroke={2.25} aria-hidden />
          )}
        </button>
        <span className="db-header__sep" aria-hidden />
        <h1 className="db-header__title">Dashboard</h1>
      </div>

      <div className="db-header__right">
        <label className="db-field">
          <span>Theme</span>
          <select
            value={theme}
            onChange={(e) => {
              if (isDuneTheme(e.target.value)) onThemeChange(e.target.value);
            }}
          >
            {DUNE_THEMES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="db-field">
          <span>Fill</span>
          <select
            value={fill}
            onChange={(e) => {
              if (isPixelWaveFill(e.target.value)) onFillChange(e.target.value);
            }}
          >
            {PIXEL_WAVE_FILLS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="db-field">
          <span>Pixel</span>
          <select
            value={pixel}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isPixelSize(next)) onPixelChange(next);
            }}
          >
            {PIXEL_SIZES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="db-field">
          <span>Loading</span>
          <select
            value={loading ? 'on' : 'off'}
            onChange={(e) => onLoadingChange(e.target.value === 'on')}
          >
            <option value="off">off</option>
            <option value="on">on</option>
          </select>
        </label>
      </div>
    </header>
  );
}

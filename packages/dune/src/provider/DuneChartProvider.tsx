import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { DuneTheme } from '../tokens/theme';
import { type DuneGrain } from './duneGrain';

export type DuneChartContextValue = {
  theme: DuneTheme;
  grain: DuneGrain;
};

export type DuneChartProviderProps = {
  theme: DuneTheme;
  grain?: DuneGrain;
  children: ReactNode;
};

const DuneChartContext = createContext<DuneChartContextValue | null>(null);

export function DuneChartProvider({ theme, grain = 'subtle', children }: DuneChartProviderProps) {
  const value = useMemo(() => ({ theme, grain }), [theme, grain]);

  return (
    <DuneChartContext.Provider value={value}>
      <div data-dune-theme={theme} data-dune-grain={grain}>
        {children}
      </div>
    </DuneChartContext.Provider>
  );
}

export function useDuneTheme(): DuneChartContextValue {
  const value = useContext(DuneChartContext);
  if (value == null) {
    throw new Error('useDuneTheme must be used within a DuneChartProvider');
  }
  return value;
}

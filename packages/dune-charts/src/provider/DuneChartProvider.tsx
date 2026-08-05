import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { DuneTheme } from '../tokens/theme';

export type DuneChartContextValue = {
  theme: DuneTheme;
};

export type DuneChartProviderProps = {
  theme: DuneTheme;
  children: ReactNode;
};

const DuneChartContext = createContext<DuneChartContextValue | null>(null);

export function DuneChartProvider({ theme, children }: DuneChartProviderProps) {
  const value = useMemo(() => ({ theme }), [theme]);

  return (
    <DuneChartContext.Provider value={value}>
      <div data-dune-theme={theme}>{children}</div>
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

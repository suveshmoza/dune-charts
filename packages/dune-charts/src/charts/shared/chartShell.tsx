import type { CSSProperties, ReactNode } from 'react';

import { clampPixel, toCssSize } from './composition';

export { clampPixel, toCssSize };
export { DUNE_DURATION, DUNE_EASE, easeOutCubic } from './chartMotion';

export const DEFAULT_PIXEL = 2;
export const DEFAULT_EMPTY_MESSAGE = 'No data to display';

export function ChartEmptyState({
  className,
  style,
  height,
  title,
  description,
  emptyMessage,
}: {
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  title?: string;
  description?: string;
  emptyMessage: string;
}) {
  const emptyStyle: CSSProperties = {
    ...style,
    height: toCssSize(height),
    minHeight: toCssSize(height) ?? 160,
  };

  return (
    <div
      className={['dune-chart-container', 'dune-chart-empty', className].filter(Boolean).join(' ')}
      style={emptyStyle}
      role="status"
    >
      {title ? <span className="dune-sr-only">{title}</span> : null}
      {description ? <span className="dune-sr-only">{description}</span> : null}
      <p className="dune-chart-empty__message">{emptyMessage}</p>
    </div>
  );
}

export function ChartLoadingShell({
  className,
  style,
  height,
  children,
  badge,
}: {
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  children: ReactNode;
  badge: ReactNode;
}) {
  const loadingStyle: CSSProperties = {
    ...style,
    height: toCssSize(height),
    minHeight: toCssSize(height) ?? 160,
    position: 'relative',
  };

  return (
    <div
      className={['dune-chart-container', 'dune-chart-loading-shell', className]
        .filter(Boolean)
        .join(' ')}
      style={loadingStyle}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {children}
      {badge}
    </div>
  );
}

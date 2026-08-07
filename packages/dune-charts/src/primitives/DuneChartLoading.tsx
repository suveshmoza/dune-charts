import { useId, type CSSProperties, type ReactNode } from 'react';

export type DuneChartLoadingProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  description?: string;
  /** Accessible status text shown under the spinner. Default: "Loading…". */
  message?: string;
  /** Optional custom indicator; defaults to a spinning ring. */
  indicator?: ReactNode;
};

export type DuneChartLoadingBadgeProps = {
  message?: string;
  /** Replaces the default spinner inside the chip. */
  indicator?: ReactNode;
};

const DEFAULT_LOADING_MESSAGE = 'Loading…';

function DefaultSpinner() {
  return <span className="dune-chart-loading__spinner" aria-hidden />;
}

/**
 * Centered loading shell (no plot) — used as a full replace when a chart has
 * no skeleton geometry yet.
 */
export function DuneChartLoading({
  className,
  style,
  title,
  description,
  message = DEFAULT_LOADING_MESSAGE,
  indicator,
}: DuneChartLoadingProps) {
  const reactId = useId();
  const titleId = title ? `${reactId}-title` : undefined;
  const descriptionId = description ? `${reactId}-description` : undefined;
  const messageId = `${reactId}-message`;

  return (
    <div
      className={['dune-chart-container', 'dune-chart-loading', className].filter(Boolean).join(' ')}
      style={style}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-labelledby={titleId}
      aria-describedby={[descriptionId, messageId].filter(Boolean).join(' ') || undefined}
    >
      {title ? (
        <span id={titleId} className="dune-sr-only">
          {title}
        </span>
      ) : null}
      {description ? (
        <span id={descriptionId} className="dune-sr-only">
          {description}
        </span>
      ) : null}
      <div className="dune-chart-loading__body">
        {indicator ?? <DefaultSpinner />}
        <p id={messageId} className="dune-chart-loading__message">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Floating chip overlay for skeleton plot loading.
 */
export function DuneChartLoadingBadge({
  message = DEFAULT_LOADING_MESSAGE,
  indicator,
}: DuneChartLoadingBadgeProps) {
  return (
    <div className="dune-chart-loading-badge" role="status" aria-live="polite" aria-busy="true">
      <div className="dune-chart-loading-badge__chip">
        {indicator ?? <DefaultSpinner />}
        <span className="dune-chart-loading-badge__text">{message}</span>
      </div>
    </div>
  );
}

export { DEFAULT_LOADING_MESSAGE };

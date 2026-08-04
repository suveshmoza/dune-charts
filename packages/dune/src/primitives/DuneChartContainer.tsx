import { useId, forwardRef, type CSSProperties, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

export type DuneChartSize = number | `${number}%`;

export type DuneChartContainerProps = {
  className?: string;
  style?: CSSProperties;
  height?: DuneChartSize;
  minHeight?: number | string;
  initialDimension?: {
    width: number;
    height: number;
  };
  title?: string;
  description?: string;
  children?: ReactNode;
};

function toCssSize(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export const DuneChartContainer = forwardRef<HTMLDivElement, DuneChartContainerProps>(
  function DuneChartContainer(
    {
      className,
      style: styleProp,
      height,
      minHeight,
      initialDimension,
      title,
      description,
      children,
    },
    ref,
  ) {
    const reactId = useId();
    const titleId = title ? `${reactId}-title` : undefined;
    const descriptionId = description ? `${reactId}-description` : undefined;
    const containerHeight = height ?? '100%';

    const style: CSSProperties = {
      ...styleProp,
      height: toCssSize(height) ?? styleProp?.height,
      minHeight: toCssSize(minHeight) ?? styleProp?.minHeight,
    };

    return (
      <div
        ref={ref}
        className={['dune-chart-container', className].filter(Boolean).join(' ')}
        style={style}
        role="region"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
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
        <ResponsiveContainer
          width="100%"
          height={containerHeight}
          initialDimension={initialDimension}
        >
          {children}
        </ResponsiveContainer>
      </div>
    );
  },
);

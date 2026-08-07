import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  type PolarAngleAxisProps,
  type PolarGridProps,
  type PolarRadiusAxisProps,
} from 'recharts';

import { markDunePart } from './composition';

export type DunePolarGridProps = PolarGridProps;

export const DunePolarGrid = markDunePart(
  function DunePolarGrid(props: DunePolarGridProps) {
    return <PolarGrid stroke="var(--dune-grid)" strokeWidth={1} gridType="polygon" {...props} />;
  },
  { part: 'polar-grid' },
);

export type DunePolarAngleAxisProps = Omit<PolarAngleAxisProps, 'dataKey'> & {
  dataKey: string;
};

export const DunePolarAngleAxis = markDunePart(
  function DunePolarAngleAxis({ dataKey, ...props }: DunePolarAngleAxisProps) {
    return (
      <PolarAngleAxis
        dataKey={dataKey}
        tick={{ fill: 'var(--dune-muted-text)', fontSize: 11 }}
        {...props}
      />
    );
  },
  (props) => ({ part: 'polar-angle-axis', dataKey: props.dataKey }),
);

export type DunePolarRadiusAxisProps = PolarRadiusAxisProps;

export const DunePolarRadiusAxis = markDunePart(
  function DunePolarRadiusAxis(props: DunePolarRadiusAxisProps) {
    return (
      <PolarRadiusAxis
        stroke="var(--dune-tick)"
        tick={{ fill: 'var(--dune-muted-text)', fontSize: 10 }}
        axisLine={false}
        {...props}
      />
    );
  },
  { part: 'polar-radius-axis' },
);

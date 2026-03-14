"use client";

import React from "react";
import MetricTile, { type MetricTileProps } from "./MetricTile";
import type { StatsGridColumns } from "./StatsGrid";
import StatsCardGroup from "./StatsCardGroup";

export interface MetricTileGroupProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly MetricTileProps[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  getKey?: (item: MetricTileProps, index: number) => React.Key;
  headingTag?: 'h2' | 'h3' | 'h4';
}

const DEFAULT_COLUMNS: StatsGridColumns = {
  base: 1,
  md: 3,
};

export default function MetricTileGroup({
  columns = DEFAULT_COLUMNS,
  ...rest
}: MetricTileGroupProps) {
  return (
    <StatsCardGroup<MetricTileProps>
      columns={columns}
      renderItem={(item) => <MetricTile {...item} />}
      {...rest}
    />
  );
}

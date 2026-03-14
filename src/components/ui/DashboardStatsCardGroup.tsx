"use client";

import React from "react";
import DashboardStatsCard, { type DashboardStatsCardProps } from "./DashboardStatsCard";
import type { StatsGridColumns } from "./StatsGrid";
import StatsCardGroup from "./StatsCardGroup";

export interface DashboardStatsCardGroupProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly DashboardStatsCardProps[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  getKey?: (item: DashboardStatsCardProps, index: number) => React.Key;
  headingTag?: "h2" | "h3" | "h4";
}

const DEFAULT_COLUMNS: StatsGridColumns = {
  base: 1,
  md: 2,
  lg: 4,
};

export default function DashboardStatsCardGroup({
  columns = DEFAULT_COLUMNS,
  ...rest
}: DashboardStatsCardGroupProps) {
  return (
    <StatsCardGroup<DashboardStatsCardProps>
      columns={columns}
      renderItem={(item) => <DashboardStatsCard {...item} />}
      {...rest}
    />
  );
}

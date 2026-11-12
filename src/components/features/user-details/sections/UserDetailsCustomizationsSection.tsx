'use client';

import type { ComponentType } from 'react';
import { BookIcon, CommandPaletteIcon, CopilotIcon, McpIcon } from '@primer/octicons-react';
import CompositionChartCard from '../../../charts/CompositionChartCard';
import { getSequentialColor } from '../../../charts/utils/chartColors';
import type { CompositionEntry } from '../../../charts/utils/compositionChart';
import {
  CLI_CUSTOMIZATION_CATEGORIES,
  type CliCustomizationCategory,
  type CliCustomizationDaySummary,
  type CliCustomizationItemSummary,
  type CliCustomizationSummary,
} from '../../../../types/cliCustomizations';
import DisclosureSection from '../../../ui/DisclosureSection';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';

const CATEGORY_LABELS: Record<CliCustomizationCategory, {
  title: string;
  icon: ComponentType;
  measure: string;
  unit: string;
  breakdownLabel: string;
  zeroState: string;
}> = {
  skill: {
    title: 'Skills',
    icon: BookIcon,
    measure: 'Reported invocations',
    unit: 'invocations',
    breakdownLabel: 'Invocations by skill',
    zeroState: 'No invocations reported',
  },
  custom_agent: {
    title: 'Custom agents',
    icon: CopilotIcon,
    measure: 'Reported starts',
    unit: 'starts',
    breakdownLabel: 'Starts by custom agent',
    zeroState: 'No starts reported',
  },
  mcp: {
    title: 'MCP servers',
    icon: McpIcon,
    measure: 'Connection attempts',
    unit: 'connection attempts',
    breakdownLabel: 'Connection attempts by MCP server',
    zeroState: 'No connection attempts reported',
  },
  slash_cmd: {
    title: 'Slash commands',
    icon: CommandPaletteIcon,
    measure: 'Reported invocations',
    unit: 'invocations',
    breakdownLabel: 'Invocations by slash command',
    zeroState: 'No invocations reported',
  },
};

type CustomizationSummary = CliCustomizationSummary | CliCustomizationDaySummary;

function getCustomizationItemLabel(name: string): string {
  if (name === 'other') return 'other (custom)';
  if (name === 'custom') return 'custom (names hidden)';
  return name;
}

function getInvocationEntries(summary?: CustomizationSummary): CompositionEntry[] | undefined {
  if (!summary || summary.observedInteractions === null) return undefined;

  const items = summary.items.filter(
    (item): item is CliCustomizationItemSummary & { interactionCount: number } => item.interactionCount !== null,
  );
  if (items.length !== summary.items.length) return undefined;
  if (items.reduce((total, item) => total + item.interactionCount, 0) !== summary.observedInteractions) {
    return undefined;
  }

  return items.map((item, index) => ({
    label: getCustomizationItemLabel(item.name),
    value: item.interactionCount,
    color: getSequentialColor(index),
  }));
}

function getDistinctCount(summary: CustomizationSummary): number | null {
  return 'distinctItems' in summary ? summary.distinctItems : summary.summedDailyDistinctItems;
}

function formatCount(value: number | null): string {
  return value === null ? '-' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const numericColumnStyles = {
  headerClassName: 'px-6 py-3 text-right',
  className: 'px-6 py-4 text-right text-sm text-default tabular-nums',
};

function CustomizationItemDetails({ summary }: { summary: CustomizationSummary }) {
  const columns: TableColumn<CliCustomizationItemSummary>[] = [
    {
      id: 'name',
      header: 'Name',
      className: 'px-6 py-4 text-sm text-default break-words',
      renderCell: item => (
        <>
          {item.name}
          {(item.name === 'other' || item.name === 'custom') && (
            <span className="text-muted">{item.name === 'other' ? ' (custom)' : ' (names hidden)'}</span>
          )}
        </>
      ),
    },
    { id: 'interactionCount', header: CATEGORY_LABELS[summary.category].measure, renderCell: item => formatCount(item.interactionCount), ...numericColumnStyles },
    { id: 'daysInvoked', header: summary.category === 'mcp' ? 'Days with attempts' : 'Days invoked', renderCell: item => formatCount(item.daysInvoked), ...numericColumnStyles },
    {
      id: 'averagePerDay',
      header: 'Avg. / day',
      renderCell: item => formatCount(item.averagePerDay),
      ...numericColumnStyles,
    },
  ];
  return (
    <div role="region" aria-label={`${CATEGORY_LABELS[summary.category].title} reported items`}>
      <MetricsTable
        data={summary.items}
        columns={columns}
        getRowKey={item => item.name}
        pageSize={summary.items.length > 5 ? 5 : undefined}
        itemLabel={`${CATEGORY_LABELS[summary.category].title.toLowerCase()} items`}
        paginationContainerClassName="px-6"
        tableClassName="w-full"
        tableContainerClassName="overflow-x-auto"
        theadClassName="border-b border-default bg-muted"
        tbodyClassName="divide-y divide-muted"
        rowClassName={() => 'hover:bg-muted'}
      />
    </div>
  );
}

function CustomizationsTable({ summaries }: { summaries: CustomizationSummary[] }) {
  return (
    <div className="mt-4 rounded-md border border-default bg-default">
      <div className="border-b border-default px-6 py-4">
        <h3 className="text-lg font-semibold text-default">Reported items</h3>
        <p className="mt-1 text-sm text-muted">Expand a category to see its reported items.</p>
      </div>
      <div className="space-y-3 px-6 py-4">
        {summaries.map(summary => {
          const category = CATEGORY_LABELS[summary.category];
          const Icon = category.icon;
          const label = (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-4 pr-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex-shrink-0" aria-hidden="true"><Icon /></span>
                <span className="truncate text-sm font-semibold text-default">{category.title}</span>
                <span className="flex-shrink-0 text-xs text-muted">
                  {summary.items.length} {summary.items.length === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="flex-shrink-0 text-xs tabular-nums text-muted">
                {summary.observedInteractions === null
                  ? 'Counts unavailable'
                  : `${summary.observedInteractions.toLocaleString()} reported ${category.unit}`}
              </span>
            </span>
          );

          if (summary.items.length === 0) {
            return (
              <div key={summary.category} className="flex items-center justify-between gap-4 rounded-md border border-default bg-muted px-4 py-3">
                {label}
              </div>
            );
          }

          return (
            <DisclosureSection
              key={summary.category}
              defaultExpanded={false}
              containerClassName="overflow-hidden rounded-md border border-default"
              buttonClassName="flex w-full items-center justify-between bg-muted px-4 py-3 transition-colors hover:bg-[var(--control-bgColor-hover)]"
              contentClassName="border-t border-default"
              labelClassName="flex min-w-0 flex-1"
              label={label}
            >
              <CustomizationItemDetails summary={summary} />
            </DisclosureSection>
          );
        })}
      </div>
    </div>
  );
}

function CustomizationInvocationCharts({ summaries }: { summaries: CustomizationSummary[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
      {CLI_CUSTOMIZATION_CATEGORIES.map(category => {
        const categoryLabels = CATEGORY_LABELS[category];
        const summary = summaries.find(item => item.category === category);
        const entries = getInvocationEntries(summary);
        const emptyState = summary?.observedInteractions === 0 && entries !== undefined
          ? categoryLabels.zeroState
          : 'Reported counts unavailable';

        return (
          <CompositionChartCard
            key={category}
            title={categoryLabels.title}
            description={categoryLabels.measure}
            emptyState={emptyState}
            entries={entries ?? []}
            unit={categoryLabels.unit}
            label={categoryLabels.breakdownLabel}
          />
        );
      })}
    </div>
  );
}

type UserDetailsCustomizationsSectionProps = {
  sectionId: string;
} & (
  | { summaries: CliCustomizationSummary[]; mode?: 'period' }
  | { summaries: CliCustomizationDaySummary[]; mode: 'day' }
);

export default function UserDetailsCustomizationsSection(props: UserDetailsCustomizationsSectionProps) {
  const { sectionId } = props;
  const reportedSummaries = props.summaries.filter(summary => getDistinctCount(summary) != null);
  const hasReportedDistinctCounts = reportedSummaries.length > 0;
  const hasCustomizationData = props.summaries.some(summary =>
    getDistinctCount(summary) !== null || summary.observedInteractions !== null,
  );
  if (!hasCustomizationData) return null;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="scroll-mt-28">
      <h2 id={`${sectionId}-title`} className="text-xl font-semibold text-default">Customizations</h2>
      <p className="mt-1 text-sm text-muted">
        {hasReportedDistinctCounts
          ? props.mode === 'day'
            ? 'Distinct items used on this day.'
            : 'Sum of reported daily distinct counts, not unique items across the period.'
          : 'Reported invocations, agent starts, and MCP connection attempts by item.'}
      </p>
      <CustomizationInvocationCharts summaries={props.summaries} />
      {reportedSummaries.length > 0 && <CustomizationsTable summaries={reportedSummaries} />}
    </section>
  );
}

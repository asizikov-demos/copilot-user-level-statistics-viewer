'use client';

import { useId, useState } from 'react';
import { ChevronRightIcon } from '@primer/octicons-react';
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
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';

const CATEGORY_LABELS: Record<CliCustomizationCategory, {
  title: string;
  measure: string;
  unit: string;
  breakdownLabel: string;
  zeroState: string;
}> = {
  skill: {
    title: 'Skills',
    measure: 'Reported invocations',
    unit: 'invocations',
    breakdownLabel: 'Invocations by skill',
    zeroState: 'No invocations reported',
  },
  custom_agent: {
    title: 'Custom agents',
    measure: 'Reported starts',
    unit: 'starts',
    breakdownLabel: 'Starts by custom agent',
    zeroState: 'No starts reported',
  },
  mcp: {
    title: 'MCP servers',
    measure: 'Connection attempts',
    unit: 'connection attempts',
    breakdownLabel: 'Connection attempts by MCP server',
    zeroState: 'No connection attempts reported',
  },
  slash_cmd: {
    title: 'Slash commands',
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

function CustomizationItemDetails({ summary, id }: { summary: CustomizationSummary; id: string }) {
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
    <div id={id} role="region" aria-label={`${CATEGORY_LABELS[summary.category].title} reported items`} className="space-y-3">
      <p className="text-xs text-muted">
        {'distinctItems' in summary
          ? 'Reported top items for this day.'
          : 'Reported top items only. Averages use days with reported activity.'}
        {summary.category === 'mcp' && ' Connections include failed attempts, not tool calls.'}
        {summary.items.some(item => item.interactionCount === null) && ' Missing interaction counts and derived values are shown as a dash.'}
      </p>
      <MetricsTable
        data={summary.items}
        columns={columns}
        getRowKey={item => item.name}
        pageSize={5}
        itemLabel={`${CATEGORY_LABELS[summary.category].title.toLowerCase()} items`}
        tableContainerClassName="overflow-x-auto"
      />
    </div>
  );
}

function CustomizationsTable({ summaries }: { summaries: CustomizationSummary[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<CliCustomizationCategory>>(new Set());
  const id = useId();
  const columns: TableColumn<CustomizationSummary>[] = [
    {
      id: 'category',
      header: 'Customization',
      className: 'px-6 py-4 text-sm text-default',
      renderCell: summary => summary.items.length === 0 ? CATEGORY_LABELS[summary.category].title : (
        <button
          type="button"
          aria-expanded={expandedCategories.has(summary.category)}
          aria-controls={`${id}-${summary.category}`}
          onClick={() => setExpandedCategories(previous => {
            const next = new Set(previous);
            if (next.has(summary.category)) next.delete(summary.category);
            else next.add(summary.category);
            return next;
          })}
          className="flex w-full items-center gap-2 rounded-sm text-left hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]"
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={`shrink-0${expandedCategories.has(summary.category) ? ' rotate-90' : ''}`}
          />
          {CATEGORY_LABELS[summary.category].title}
        </button>
      ),
    },
    { id: 'distinctCount', header: 'Total', renderCell: summary => getDistinctCount(summary)?.toLocaleString(), ...numericColumnStyles },
  ];
  return (
    <MetricsTable
      data={summaries}
      columns={columns}
      getRowKey={summary => summary.category}
      renderExpandedRow={summary => expandedCategories.has(summary.category) && summary.items.length > 0
        ? <CustomizationItemDetails summary={summary} id={`${id}-${summary.category}`} />
        : null}
      tableClassName="w-full table-fixed divide-y divide-default"
      tableContainerClassName="mt-4 overflow-x-auto rounded-md border border-default"
    />
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
            description="Totals and shares cover reported per-record top-five items only, not all activity."
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

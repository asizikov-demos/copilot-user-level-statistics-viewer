'use client';

import { useId, useState } from 'react';
import type { CliCustomizationCategory, CliCustomizationDaySummary, CliCustomizationItemSummary, CliCustomizationSummary } from '../../../../types/cliCustomizations';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';

const CATEGORY_LABELS: Record<CliCustomizationCategory, { title: string; measure: string }> = {
  skill: { title: 'Skills', measure: 'Reported invocations' },
  custom_agent: { title: 'Custom agents', measure: 'Reported starts' },
  mcp: { title: 'MCP servers', measure: 'Connection attempts' },
  slash_cmd: { title: 'Slash commands', measure: 'Reported invocations' },
};

type CustomizationSummary = CliCustomizationSummary | CliCustomizationDaySummary;

function getDistinctCount(summary: CustomizationSummary): number | null {
  return 'distinctItems' in summary ? summary.distinctItems : summary.summedDailyDistinctItems;
}

function formatCount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const numericColumnStyles = {
  headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
  className: 'px-6 py-4 text-right text-sm text-gray-900 tabular-nums',
};

function CustomizationItemDetails({ summary, id }: { summary: CustomizationSummary; id: string }) {
  const columns: TableColumn<CliCustomizationItemSummary>[] = [
    {
      id: 'name',
      header: 'Name',
      className: 'px-6 py-4 text-sm text-gray-900 break-words',
      renderCell: item => (
        <>
          {item.name}
          {(item.name === 'other' || item.name === 'custom') && (
            <span className="text-gray-500">{item.name === 'other' ? ' (custom)' : ' (names hidden)'}</span>
          )}
        </>
      ),
    },
    { id: 'interactionCount', header: CATEGORY_LABELS[summary.category].measure, accessor: 'interactionCount', ...numericColumnStyles },
    { id: 'daysInvoked', header: summary.category === 'mcp' ? 'Days with attempts' : 'Days invoked', accessor: 'daysInvoked', ...numericColumnStyles },
    {
      id: 'averagePerDay',
      header: 'Avg. / day',
      renderCell: item => item.averagePerDay === null ? '-' : formatCount(item.averagePerDay),
      ...numericColumnStyles,
    },
  ];
  return (
    <div id={id} role="region" aria-label={`${CATEGORY_LABELS[summary.category].title} reported items`} className="space-y-3">
      <p className="text-xs text-gray-500">
        {'distinctItems' in summary
          ? 'Reported top items for this day.'
          : 'Reported top items only. Averages use days with reported activity.'}
        {summary.category === 'mcp' && ' Connections include failed attempts, not tool calls.'}
      </p>
      <MetricsTable
        data={summary.items}
        columns={columns}
        getRowKey={item => item.name}
        initialCount={5}
        tableContainerClassName="overflow-x-auto"
        buttonCollapsedLabel={total => `Show all ${total.toLocaleString()} reported items`}
        buttonExpandedLabel="Show fewer items"
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
      className: 'px-6 py-4 text-sm text-gray-900',
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
          className="flex w-full items-center gap-2 rounded-sm text-left hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 shrink-0${expandedCategories.has(summary.category) ? ' rotate-90' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
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
      tableClassName="w-full table-fixed divide-y divide-gray-200"
      tableContainerClassName="mt-4 overflow-x-auto rounded-md border border-[#d1d9e0]"
    />
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
  if (reportedSummaries.length === 0) return null;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="scroll-mt-28">
      <h2 id={`${sectionId}-title`} className="text-xl font-semibold text-gray-900">Customizations</h2>
      <p className="mt-1 text-sm text-gray-600">
        {props.mode === 'day'
          ? 'Distinct items used on this day.'
          : 'Sum of reported daily distinct counts, not unique items across the period.'}
      </p>
      <CustomizationsTable summaries={reportedSummaries} />
    </section>
  );
}

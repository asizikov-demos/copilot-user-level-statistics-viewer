"use client";
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { getIDEIcon, formatIDEName } from '../../../icons/IDEIcons';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { createBaseChartOptions } from '../../../charts/utils/chartOptions';
import { getIdeColor, hasIdeColor, ideColors } from '../../../charts/utils/chartColors';
import { computeCliDayTotals, type CliDayTotals } from '../../../../domain/calculators/cliUsageCalculator';
import {
  createCliClientActivityRow,
  mapIdeClientActivityRows,
  type ClientActivityMetricsRow,
} from '../../../../domain/calculators/clientActivityRows';
import { formatShortDate } from '../../../../utils/formatters';
import { padReportRangeWithDefaults } from '../../../../utils/timeSeries';
import ChartContainer from '../../../ui/ChartContainer';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import type { UserDayData } from '../../../../types/metrics';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { isCliFeature } from '../../../../domain/featureCategories';

registerChartJS();

interface IDEAggregateItem {
  ide: string;
  user_initiated_interaction_count: number;
  assumed_user_initiated_interaction_count?: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface ClientActivityChartProps {
  ideAggregates: IDEAggregateItem[];
  days: UserDayData[];
  title?: string;
  reportStartDay: string;
  reportEndDay: string;
  pluginVersions?: {
    plugin: string;
    plugin_version: string;
    sampled_at: string;
  }[];
  cliVersions?: {
    cli_version: string;
    sampled_at: string;
  }[];
}

type VersionEntry = { name: string; version: string; sampled_at: string };
type ClientChartDay = Pick<UserDayData, 'day' | 'totals_by_ide'>;

const headerLeftClass = 'px-6 py-3 text-left';
const headerRightClass = 'px-6 py-3 text-right';
const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

const versionColumns: TableColumn<VersionEntry>[] = [
  { id: 'name', header: 'Client', headerClassName: headerLeftClass, className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-default', renderCell: (r) => r.name },
  { id: 'version', header: 'Version', headerClassName: headerRightClass, className: valueCellClass, renderCell: (r) => r.version },
  { id: 'sampled_at', header: 'Last Seen', headerClassName: headerRightClass, className: valueCellClass, renderCell: (r) => formatShortDate(r.sampled_at) },
];

function ClientName({ ide }: { ide: string }) {
  const Icon = getIDEIcon(ide);

  return (
    <div className="flex items-center gap-2">
      <Icon />
      <span>{formatIDEName(ide)}</span>
    </div>
  );
}

const clientColumns: TableColumn<ClientActivityMetricsRow>[] = [
  { id: 'ide', header: 'Client', headerClassName: headerLeftClass, className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-default', renderCell: (client) => <ClientName ide={client.ide} /> },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.loc_deleted_sum.toLocaleString() },
  { id: 'suggestedAdd', header: 'Suggested Add', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.loc_suggested_to_add_sum.toLocaleString() },
  { id: 'suggestedDelete', header: 'Suggested Delete', headerClassName: headerRightClass, className: valueCellClass, renderCell: (client) => client.loc_suggested_to_delete_sum.toLocaleString() },
];

/**
 * ClientActivityChart
 * Reusable section displaying a daily interactions stacked bar chart (by IDE/CLI) plus
 * a table summarizing aggregate metrics per client.
 */
export default function ClientActivityChart({
  ideAggregates,
  days,
  title = 'Activity by Client',
  reportStartDay,
  reportEndDay,
  pluginVersions,
  cliVersions,
}: ClientActivityChartProps) {
  const { cliTotals, cliTotalsByDay } = useMemo(() => {
    const totals = {
      promptCount: 0,
      interactions: 0,
      generations: 0,
      acceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    };
    const byDay = new Map<string, CliDayTotals>();

    for (const day of days) {
      const dayTotals = computeCliDayTotals(day);
      byDay.set(day.day, dayTotals);

      totals.promptCount += dayTotals.promptCount;
      totals.interactions += dayTotals.interactions;
      totals.generations += dayTotals.generations;
      totals.acceptances += dayTotals.acceptances;
      totals.locAdded += dayTotals.locAdded;
      totals.locDeleted += dayTotals.locDeleted;
      totals.locSuggestedToAdd += dayTotals.locSuggestedToAdd;
      totals.locSuggestedToDelete += dayTotals.locSuggestedToDelete;
    }

    return { cliTotals: totals, cliTotalsByDay: byDay };
  }, [days]);

  const barChartData = useMemo(() => {
    const allIDEs = Array.from(
      new Set(days.flatMap(day => day.totals_by_ide.map(ide => ide.ide)))
    ).sort();

    const chartDays: ClientChartDay[] = days;
    const paddedDays = padReportRangeWithDefaults<ClientChartDay>(
      chartDays,
      reportStartDay,
      reportEndDay,
      day => day.day,
      day => ({ day, totals_by_ide: [] }),
    );

    let fallbackIndex = 0;
    const datasets = allIDEs.map((ide) => {
      const data = paddedDays.map(dayData => {
        const ideData = dayData.totals_by_ide.find(i => i.ide === ide);
        return ideData ? getTotalUserInitiatedInteractionCount(ideData) : 0;
      });

      const color = getIdeColor(ide, fallbackIndex);
      if (!hasIdeColor(ide)) {
        fallbackIndex += 1;
      }
      return createBarDataset(color, formatIDEName(ide), data);
    }).filter(dataset => dataset.data.some(value => value > 0));

    // Add CLI dataset if any day has CLI data
    const hasCliData = Array.from(cliTotalsByDay.values()).some(dayTotals => dayTotals.interactionCount > 0);
    if (hasCliData) {
      const cliData = paddedDays.map(dayData => {
        return cliTotalsByDay.get(dayData.day)?.interactionCount ?? 0;
      });
      datasets.push(createBarDataset(ideColors['copilot_cli'], 'Copilot CLI', cliData));
    }

    return {
      labels: paddedDays.map(day => formatShortDate(day.day)),
      datasets: datasets,
    };
  }, [cliTotalsByDay, days, reportStartDay, reportEndDay]);

  const barChartOptions = useMemo(() => createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'bar'>) => {
      const label = context.dataset.label || '';
      const value = context.parsed.y || 0;
      return `${label}: ${value.toLocaleString()} interactions`;
    },
  }), []);

  const ideClientRows = useMemo(
    () => mapIdeClientActivityRows(ideAggregates),
    [ideAggregates],
  );
  const cliClientRow = useMemo(
    () => createCliClientActivityRow(cliTotals, days.some(day =>
      day.totals_by_cli != null || day.totals_by_feature.some(feature => isCliFeature(feature.feature))
    )),
    [cliTotals, days],
  );
  const clientRows = useMemo(
    () => [...ideClientRows, ...(cliClientRow ? [cliClientRow] : [])].sort(
      (a, b) => b.user_initiated_interaction_count - a.user_initiated_interaction_count,
    ),
    [ideClientRows, cliClientRow],
  );
  const hasCliVersions = cliVersions && cliVersions.length > 0;
  const allVersions = [
    ...(pluginVersions || []).map(p => ({
      name: p.plugin,
      version: p.plugin_version,
      sampled_at: p.sampled_at,
    })),
    ...(cliVersions || []).map(c => ({
      name: 'Copilot CLI',
      version: c.cli_version,
      sampled_at: c.sampled_at,
    })),
  ].sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime());
  const isEmpty = ideAggregates.length === 0 && !cliClientRow && !hasCliVersions;

  const footer = (
    <>
      {clientRows.length > 0 && (
        <MetricsTable
          data={clientRows}
          columns={clientColumns}
          tableContainerClassName="overflow-x-auto"
          getRowKey={(client) => client.ide}
        />
      )}

      {allVersions.length > 0 && (
        <div className="mt-8">
          <h4 className="text-md font-semibold text-default mb-4">Client Versions</h4>
          <MetricsTable
            data={allVersions}
            columns={versionColumns}
            tableContainerClassName="overflow-x-auto border border-default"
            getRowKey={(_, i) => i}
            initialCount={1}
            buttonCollapsedLabel={(total) => `Show All ${total} Client Versions`}
            buttonExpandedLabel="Show Less"
          />
        </div>
      )}
    </>
  );

  return (
    <ChartContainer
      title={title}
      footer={!isEmpty ? footer : undefined}
      isEmpty={isEmpty}
      emptyState="No client activity data available."
      chartHeight={barChartData.datasets.length > 0 ? 'h-auto' : 'hidden'}
    >
      {barChartData.datasets && barChartData.datasets.length > 0 && (
        <div className="mb-6">
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium text-default mb-4 text-center">Daily Client Interactions</h4>
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}

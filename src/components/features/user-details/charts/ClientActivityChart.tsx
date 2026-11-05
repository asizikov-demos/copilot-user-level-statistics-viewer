"use client";
import { useMemo, useState } from 'react';
import { Button, FormControl, Select } from '@primer/react';
import { Bar } from 'react-chartjs-2';
import type { ScriptableContext, TooltipItem } from 'chart.js';
import { ClientChartLegend, ClientPatternControl, useClientPatterns } from '../../../charts/ClientChartLegend';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { getIDEIcon, formatIDEName } from '../../../icons/IDEIcons';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { createBaseChartOptions, yAxisFormatters } from '../../../charts/utils/chartOptions';
import { createDailyReportRangeChartConfig } from '../../../charts/utils/dailyBarChart';
import type { ClientTrafficMetrics, ClientTrafficSummary } from '../../../../types/clientTraffic';
import { getIdeColor } from '../../../charts/utils/chartColors';
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
  traffic?: ClientTrafficMetrics;
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
type ClientActivityMeasure = 'interactions' | 'sessions' | 'requests';

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

interface ClientRow {
  ide: string;
  activity?: ClientActivityMetricsRow;
  traffic?: Pick<ClientTrafficSummary, 'reportedSessionCount' | 'requestCount' | 'promptTokens' | 'outputTokens'>;
}

function getClientRowKey(client: string): string {
  return client === 'github_app' ? 'copilot_app' : client;
}

const activityValue = (row: ClientRow, key: Exclude<keyof ClientActivityMetricsRow, 'ide'>) =>
  row.activity?.[key].toLocaleString() ?? 'Not reported';

const clientColumns: TableColumn<ClientRow>[] = [
  { id: 'ide', header: 'Client', headerClassName: headerLeftClass, className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-default', renderCell: (client) => <ClientName ide={client.ide} /> },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'user_initiated_interaction_count') },
  { id: 'generation', header: 'Generation', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'code_generation_activity_count') },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'code_acceptance_activity_count') },
];

const sessionColumn: TableColumn<ClientRow> = {
  id: 'sessions', header: 'Reported sessions', headerClassName: headerRightClass, className: valueCellClass,
  renderCell: client => client.traffic?.reportedSessionCount.toLocaleString() ?? 'Not reported',
};

const detailColumns: TableColumn<ClientRow>[] = [
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'loc_added_sum') },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'loc_deleted_sum') },
  { id: 'suggestedAdd', header: 'Suggested Add', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'loc_suggested_to_add_sum') },
  { id: 'suggestedDelete', header: 'Suggested Delete', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => activityValue(client, 'loc_suggested_to_delete_sum') },
];

const trafficDetailColumns: TableColumn<ClientRow>[] = [
  { id: 'requests', header: 'Model requests', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => client.traffic?.requestCount.toLocaleString() ?? 'Not reported' },
  { id: 'promptTokens', header: 'Prompt tokens', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => client.traffic?.promptTokens.toLocaleString() ?? 'Not reported' },
  { id: 'outputTokens', header: 'Output tokens', headerClassName: headerRightClass, className: valueCellClass, renderCell: client => client.traffic?.outputTokens.toLocaleString() ?? 'Not reported' },
];

export default function ClientActivityChart({
  traffic,
  ideAggregates,
  days,
  title = 'Activity by Client',
  reportStartDay,
  reportEndDay,
  pluginVersions,
  cliVersions,
}: ClientActivityChartProps) {
  const [selectedMeasure, setSelectedMeasure] = useState<ClientActivityMeasure | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { patterned, setPatterned, getFill } = useClientPatterns();
  const [hiddenClients, setHiddenClients] = useState<ReadonlySet<string>>(new Set());
  const hasTraffic = (traffic?.summary.reportedRecords ?? 0) > 0;
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

    const datasets = allIDEs.map((ide) => {
      const data = paddedDays.map(dayData => {
        const ideData = dayData.totals_by_ide.find(i => i.ide === ide);
        return ideData ? getTotalUserInitiatedInteractionCount(ideData) : 0;
      });

      return { ...createBarDataset(getIdeColor(ide), formatIDEName(ide), data), clientKey: ide };
    }).filter(dataset => dataset.data.some(value => value > 0));

    // Add CLI dataset if any day has CLI data
    const hasCliData = Array.from(cliTotalsByDay.values()).some(dayTotals => dayTotals.interactionCount > 0);
    if (hasCliData) {
      const cliData = paddedDays.map(dayData => {
        return cliTotalsByDay.get(dayData.day)?.interactionCount ?? 0;
      });
      datasets.push({ ...createBarDataset(getIdeColor('copilot_cli'), 'Copilot CLI', cliData), clientKey: 'copilot_cli' });
    }

    return {
      labels: paddedDays.map(day => formatShortDate(day.day)),
      datasets: datasets,
    };
  }, [cliTotalsByDay, days, reportStartDay, reportEndDay]);

  const barChartOptions = useMemo(() => createBaseChartOptions({
    showLegend: false,
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'bar'>) => {
      const label = context.dataset.label || '';
      const value = context.parsed.y || 0;
      return `${label}: ${value.toLocaleString()} interactions`;
    },
  }), []);

  const hasInteractions = barChartData.datasets.some(dataset => dataset.data.some(value => value > 0));
  const defaultMeasure: ClientActivityMeasure = hasInteractions
    ? 'interactions'
    : traffic?.summary.clients.some(client => client.reportedSessionCount > 0)
      ? 'sessions'
      : traffic?.summary.clients.some(client => client.requestCount > 0)
        ? 'requests'
        : 'interactions';
  const measure = hasTraffic ? selectedMeasure ?? defaultMeasure : 'interactions';
  const measureLabel = measure === 'requests' ? 'Model requests' : 'Reported sessions';

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
    () => {
      const rows = new Map<string, ClientRow>();
      for (const activity of [...ideClientRows, ...(cliClientRow ? [cliClientRow] : [])]) {
        const key = getClientRowKey(activity.ide);
        const existing = rows.get(key)?.activity;
        rows.set(key, { ide: key, activity: existing && key === 'copilot_app' ? {
          ide: key,
          user_initiated_interaction_count: existing.user_initiated_interaction_count + activity.user_initiated_interaction_count,
          code_generation_activity_count: existing.code_generation_activity_count + activity.code_generation_activity_count,
          code_acceptance_activity_count: existing.code_acceptance_activity_count + activity.code_acceptance_activity_count,
          loc_added_sum: existing.loc_added_sum + activity.loc_added_sum,
          loc_deleted_sum: existing.loc_deleted_sum + activity.loc_deleted_sum,
          loc_suggested_to_add_sum: existing.loc_suggested_to_add_sum + activity.loc_suggested_to_add_sum,
          loc_suggested_to_delete_sum: existing.loc_suggested_to_delete_sum + activity.loc_suggested_to_delete_sum,
        } : activity });
      }
      if (hasTraffic) {
        for (const client of traffic?.summary.clients ?? []) {
          const key = getClientRowKey(client.client);
          const existing = rows.get(key);
          rows.set(key, { ...existing, ide: key, traffic: {
            reportedSessionCount: (existing?.traffic?.reportedSessionCount ?? 0) + client.reportedSessionCount,
            requestCount: (existing?.traffic?.requestCount ?? 0) + client.requestCount,
            promptTokens: (existing?.traffic?.promptTokens ?? 0) + client.promptTokens,
            outputTokens: (existing?.traffic?.outputTokens ?? 0) + client.outputTokens,
          } });
        }
      }
      return [...rows.values()].sort((a, b) =>
        (b.activity?.user_initiated_interaction_count ?? 0) - (a.activity?.user_initiated_interaction_count ?? 0)
        || (b.traffic?.reportedSessionCount ?? 0) - (a.traffic?.reportedSessionCount ?? 0)
        || a.ide.localeCompare(b.ide));
    },
    [ideClientRows, cliClientRow, traffic, hasTraffic],
  );
  const trafficChart = createDailyReportRangeChartConfig({
    data: (traffic?.daily ?? []).map(day => ({ ...day, date: day.day })),
    reportStartDay,
    reportEndDay,
    type: 'bar',
    series: (hasTraffic ? traffic?.summary.clients ?? [] : []).map(client => ({
      label: formatIDEName(client.client),
      color: getIdeColor(client.client),
      getValue: (entry: (ClientTrafficMetrics['daily'][number] & { date: string }) | undefined) =>
        entry && entry.reportedRecords > 0
          ? entry.clients.find(row => row.client === client.client)?.[
            measure === 'requests' ? 'requestCount' : 'reportedSessionCount'
          ] ?? 0
          : null,
    })),
    createDataset: (series, values) => createBarDataset(series.color, series.label, values),
    options: {
      showLegend: false,
      xAxisLabel: 'Date',
      yAxisLabel: measureLabel,
      yTicksCallback: yAxisFormatters.integer,
      xAutoSkip: true,
      tooltipLabelCallback: context => `${context.dataset.label}: ${context.parsed.y?.toLocaleString()} ${measureLabel.toLowerCase()}`,
    },
  });
  const chartData = measure === 'interactions' ? barChartData : trafficChart.chartData;
  const clientKeys = measure === 'interactions'
    ? barChartData.datasets.map(dataset => dataset.clientKey)
    : (traffic?.summary.clients ?? []).map(client => client.client);
  const displayData = {
    ...chartData,
    datasets: chartData.datasets.map((dataset, index) => {
      const clientKey = clientKeys[index];
      const color = getIdeColor(clientKey);
      return {
        ...dataset,
        clientKey,
        hidden: hiddenClients.has(clientKey),
        backgroundColor: patterned
          ? (context: ScriptableContext<'bar'>) => getFill(context.chart.ctx, color, clientKey)
          : color,
      };
    }),
  };
  const chartOptions = measure === 'interactions' ? barChartOptions : trafficChart.options;
  const chartTitle = measure === 'interactions'
    ? 'Daily Client Interactions'
    : measure === 'sessions' ? 'Daily Reported Client Sessions' : 'Daily Client Model Requests';
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
  const isEmpty = clientRows.length === 0 && !hasCliVersions && allVersions.length === 0 && !hasTraffic;

  const footer = (
    <>
      {clientRows.length > 0 && (
        <>
          <div className="mb-4">
            <Button aria-expanded={showDetails} onClick={() => setShowDetails(value => !value)}>
              {showDetails ? 'Hide metric details' : 'Show metric details'}
            </Button>
          </div>
          <MetricsTable
          data={clientRows}
          columns={[...clientColumns, ...(hasTraffic ? [sessionColumn] : []),
            ...(showDetails ? [...detailColumns, ...(hasTraffic ? trafficDetailColumns : [])] : [])]}
          tableContainerClassName="overflow-x-auto"
          getRowKey={(client) => client.ide}
          initialCount={10}
          buttonCollapsedLabel={total => `Show all ${total} clients`}
          buttonExpandedLabel="Show fewer clients"
        />
        </>
      )}
      {hasTraffic && (
        <p className="mt-4 text-xs text-muted">
          Client sessions reported in {traffic?.summary.reportedRecords.toLocaleString()} of {traffic?.summary.recordCount.toLocaleString()} uploaded records.
          {' '}Missing session records are gaps, not zero usage. Reported zeros can accompany model requests.
          {' '}Model requests are model calls, not user interactions or prompts.
          {' '}Sessions, model requests, and legacy interactions are separate measures; sessions are not deduplicated across clients or days.
          {' '}Table session totals cover only reported records.
        </p>
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
      description="Daily interactions, reported sessions, and model requests by client. Select a measure to compare clients without combining unlike counts."
      footer={!isEmpty ? footer : undefined}
      isEmpty={isEmpty}
      emptyState="No client activity data available."
      chartHeight="h-auto"
    >
      {hasTraffic && (
        <div className="mb-4">
          <FormControl>
            <FormControl.Label>Client activity measure</FormControl.Label>
            <Select value={measure} onChange={event => {
              const value = event.target.value;
              if (value === 'interactions' || value === 'sessions' || value === 'requests') {
                setSelectedMeasure(value);
              }
            }}>
              <Select.Option value="interactions">Interactions</Select.Option>
              <Select.Option value="sessions">Reported sessions</Select.Option>
              <Select.Option value="requests">Model requests</Select.Option>
            </Select>
          </FormControl>
        </div>
      )}
      {chartData.datasets.length > 0 ? (
        <div className="mb-6">
            <ClientPatternControl checked={patterned} onChange={setPatterned} />
            <h4 className="text-sm font-medium text-default mb-4 text-center">
              {chartTitle}
            </h4>
            <div className="h-64">
              <Bar data={displayData} datasetIdKey="clientKey" options={chartOptions} role="img" aria-label={chartTitle} />
            </div>
            <ClientChartLegend
              entries={clientKeys.map(clientKey => ({ clientKey, label: formatIDEName(clientKey), color: getIdeColor(clientKey) }))}
              patterned={patterned}
              hiddenKeys={hiddenClients}
              onToggle={key => setHiddenClients(previous => {
                const next = new Set(previous);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })}
            />
        </div>
      ) : !isEmpty && (
        <p className="mb-4 text-sm text-muted">
          {measure === 'interactions'
            ? 'No client interactions were reported in the available records.'
            : measure === 'sessions'
              ? 'No client sessions were reported in the available records.'
              : 'No client model requests were reported in the available records.'}
        </p>
      )}
    </ChartContainer>
  );
}

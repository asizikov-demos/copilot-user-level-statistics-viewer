"use client";
import { useMemo, useState } from 'react';
import { FormControl } from '@primer/react';
import SimpleSelect from '../../../ui/SimpleSelect';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { ClientChartLegend } from '../../../charts/ClientChartLegend';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { getIDEIcon, formatIDEName } from '../../../icons/IDEIcons';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { createBaseChartOptions, yAxisFormatters } from '../../../charts/utils/chartOptions';
import { createDailyReportRangeChartConfig } from '../../../charts/utils/dailyBarChart';
import type { ClientTrafficMetrics } from '../../../../types/clientTraffic';
import { getIdeColor } from '../../../charts/utils/chartColors';
import type { ClientActivityMetricsRow } from '../../../../domain/calculators/clientActivityRows';
import type { UserClientActivitySummary, UserClientRow as ClientRow } from '../../../../domain/calculators/userPresentationCalculator';
import { formatShortDate } from '../../../../utils/formatters';
import ChartContainer from '../../../ui/ChartContainer';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';

registerChartJS();

interface ClientActivityChartProps {
  traffic?: ClientTrafficMetrics;
  activity: UserClientActivitySummary;
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
  activity,
  title = 'Activity by Client',
  reportStartDay,
  reportEndDay,
  pluginVersions,
  cliVersions,
}: ClientActivityChartProps) {
  const [selectedMeasure, setSelectedMeasure] = useState<ClientActivityMeasure | null>(null);
  const [hiddenClients, setHiddenClients] = useState<ReadonlySet<string>>(new Set());
  const hasTraffic = (traffic?.summary.reportedRecords ?? 0) > 0;
  const barChartData = useMemo(() => ({
    labels: activity.dates.map(formatShortDate),
    datasets: activity.interactions.map(({ client, values }) => ({
      ...createBarDataset(getIdeColor(client), formatIDEName(client), values),
      clientKey: client,
    })),
  }), [activity]);

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

  const clientRows = activity.rows;
  const trafficChart = useMemo(() => measure === 'interactions' ? null : createDailyReportRangeChartConfig({
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
  }), [measure, measureLabel, traffic, hasTraffic, reportStartDay, reportEndDay]);
  const chartData = trafficChart?.chartData ?? barChartData;
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
        backgroundColor: color,
      };
    }),
  };
  const chartOptions = trafficChart?.options ?? barChartOptions;
  const chartTitle = measure === 'interactions'
    ? 'Daily Client Interactions'
    : measure === 'sessions' ? 'Daily Reported Client Sessions' : 'Daily Client Model Requests';
  const hasCliVersions = cliVersions && cliVersions.length > 0;
  const allVersions = useMemo(() => [
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
  ].sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime()), [pluginVersions, cliVersions]);
  const isEmpty = clientRows.length === 0 && !hasCliVersions && allVersions.length === 0 && !hasTraffic;

  const footer = (
    <>
      {clientRows.length > 0 && (
        <MetricsTable
          data={clientRows}
          columns={[...clientColumns, ...(hasTraffic ? [sessionColumn] : []),
            ...detailColumns, ...(hasTraffic ? trafficDetailColumns : [])]}
          tableContainerClassName="overflow-x-auto"
          getRowKey={(client) => client.ide}
          pageSize={10}
          itemLabel="clients"
        />
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
            pageSize={5}
            itemLabel="client versions"
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
            <SimpleSelect
              label="Client activity measure"
              value={measure}
              onChange={setSelectedMeasure}
              options={[
                { value: 'interactions', label: 'Interactions' },
                { value: 'sessions', label: 'Reported sessions' },
                { value: 'requests', label: 'Model requests' },
              ]}
            />
          </FormControl>
        </div>
      )}
      {chartData.datasets.length > 0 ? (
        <div className="mb-6">
            <h4 className="text-sm font-medium text-default mb-4 text-center">
              {chartTitle}
            </h4>
            <div className="h-64">
              <Bar data={displayData} datasetIdKey="clientKey" options={chartOptions} role="img" aria-label={chartTitle} />
            </div>
            <ClientChartLegend
              entries={clientKeys.map(clientKey => ({ clientKey, label: formatIDEName(clientKey), color: getIdeColor(clientKey) }))}
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

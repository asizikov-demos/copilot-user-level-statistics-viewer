import { describe, expect, it } from 'vitest';
import type { DailyChatRequestsData, DailyChatUsersData } from '../../../domain/calculators/metricCalculators';
import { formatShortDate } from '../../../utils/formatters';
import {
  chatModeChartModes,
  createChatModeLineChartData,
  createChatModeMetricSummaries,
  createChatModeStats,
} from './chatModeChart';

const usersData: DailyChatUsersData[] = [
  {
    date: '2024-01-01',
    askModeUsers: 2,
    agentModeUsers: 1,
    editModeUsers: 0,
    inlineModeUsers: 3,
    planModeUsers: 1,
    cliUsers: 4,
  },
  {
    date: '2024-01-02',
    askModeUsers: 4,
    agentModeUsers: 2,
    editModeUsers: 1,
    inlineModeUsers: 1,
    planModeUsers: 0,
    cliUsers: 2,
  },
];

const requestsData: DailyChatRequestsData[] = [
  {
    date: '2024-01-01',
    askModeRequests: 5,
    agentModeRequests: 2,
    editModeRequests: 0,
    inlineModeRequests: 4,
    planModeRequests: 1,
    cliSessions: 3,
  },
  {
    date: '2024-01-02',
    askModeRequests: 1,
    agentModeRequests: 6,
    editModeRequests: 2,
    inlineModeRequests: 0,
    planModeRequests: 3,
    cliSessions: 1,
  },
];

describe('chatModeChart', () => {
  it('builds shared summaries, stats, and datasets from chat mode metadata', () => {
    const summaries = createChatModeMetricSummaries(usersData, (day, mode) => mode.getUsersValue(day));

    expect(summaries.map(summary => ({
      key: summary.mode.key,
      total: summary.total,
      average: summary.average,
      max: summary.max,
    }))).toEqual([
      { key: 'ask', total: 6, average: 3, max: 4 },
      { key: 'agent', total: 3, average: 1.5, max: 2 },
      { key: 'edit', total: 1, average: 0.5, max: 1 },
      { key: 'inline', total: 4, average: 2, max: 3 },
      { key: 'plan', total: 1, average: 0.5, max: 1 },
      { key: 'cli', total: 6, average: 3, max: 4 },
    ]);

    expect(createChatModeStats(summaries)).toEqual([
      { label: 'Avg Ask', value: 3 },
      { label: 'Avg Agent', value: 1.5 },
      { label: 'Avg Edit', value: 0.5 },
      { label: 'Avg Inline', value: 2 },
      { label: 'Avg Plan', value: 0.5 },
      { label: 'Avg CLI', value: 3 },
    ]);

    const chartData = createChatModeLineChartData(
      requestsData,
      (day, mode) => mode.getRequestsValue(day),
      mode => mode.requestDatasetLabel
    );

    expect(chartData.labels).toEqual(requestsData.map(day => formatShortDate(day.date)));
    expect(chartData.datasets).toHaveLength(chatModeChartModes.length);
    expect(chartData.datasets.map(dataset => dataset.label)).toEqual(
      chatModeChartModes.map(mode => mode.requestDatasetLabel)
    );
    expect(chartData.datasets[5]).toMatchObject({
      label: 'CLI Sessions',
      data: [3, 1],
      borderColor: chatModeChartModes[5].color,
    });
  });

  it('keeps request accessors and display metadata aligned for every mode', () => {
    const summaries = createChatModeMetricSummaries(requestsData, (day, mode) => mode.getRequestsValue(day));

    expect(summaries.map(({ mode, total, max }) => ({
      key: mode.key,
      footerLabel: mode.footerLabel,
      colorClass: mode.colorClass,
      total,
      max,
    }))).toEqual([
      { key: 'ask', footerLabel: 'Ask Mode', colorClass: 'text-green-600', total: 6, max: 5 },
      { key: 'agent', footerLabel: 'Agent Mode', colorClass: 'text-blue-600', total: 8, max: 6 },
      { key: 'edit', footerLabel: 'Edit Mode', colorClass: 'text-gray-900', total: 2, max: 2 },
      { key: 'inline', footerLabel: 'Inline Mode', colorClass: 'text-amber-600', total: 4, max: 4 },
      { key: 'plan', footerLabel: 'Plan Mode', colorClass: 'text-purple-600', total: 4, max: 3 },
      { key: 'cli', footerLabel: 'CLI', colorClass: 'text-rose-600', total: 4, max: 3 },
    ]);
  });
});

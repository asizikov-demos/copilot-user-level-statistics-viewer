import { calculateAverage, calculateTotal, findMaxValue } from '../../../domain/calculators/statsCalculators';
import type { DailyChatRequestsData, DailyChatUsersData } from '../../../domain/calculators/metricCalculators';
import { formatShortDate } from '../../../utils/formatters';
import { chatModeColors } from './chartColors';
import { createLineDataset } from './chartStyles';

type ChatModeKey = 'ask' | 'agent' | 'edit' | 'inline' | 'plan' | 'cli';

export interface ChatModeChartMode {
  key: ChatModeKey;
  shortLabel: string;
  footerLabel: string;
  color: string;
  colorClass: string;
  userDatasetLabel: string;
  requestDatasetLabel: string;
  getUsersValue: (day: DailyChatUsersData) => number;
  getRequestsValue: (day: DailyChatRequestsData) => number;
}

export interface ChatModeMetricSummary {
  mode: ChatModeChartMode;
  total: number;
  average: number;
  max: number;
}

export const chatModeChartModes: readonly ChatModeChartMode[] = [
  {
    key: 'ask',
    shortLabel: 'Ask',
    footerLabel: 'Ask Mode',
    color: chatModeColors.ask.solid,
    colorClass: 'text-green-600',
    userDatasetLabel: 'Chat: Ask Mode',
    requestDatasetLabel: 'Ask Mode Requests',
    getUsersValue: day => day.askModeUsers,
    getRequestsValue: day => day.askModeRequests,
  },
  {
    key: 'agent',
    shortLabel: 'Agent',
    footerLabel: 'Agent Mode',
    color: chatModeColors.agent.solid,
    colorClass: 'text-blue-600',
    userDatasetLabel: 'Chat: Agent Mode',
    requestDatasetLabel: 'Agent Mode Requests',
    getUsersValue: day => day.agentModeUsers,
    getRequestsValue: day => day.agentModeRequests,
  },
  {
    key: 'edit',
    shortLabel: 'Edit',
    footerLabel: 'Edit Mode',
    color: chatModeColors.edit.solid,
    colorClass: 'text-gray-900',
    userDatasetLabel: 'Chat: Edit Mode',
    requestDatasetLabel: 'Edit Mode Requests',
    getUsersValue: day => day.editModeUsers,
    getRequestsValue: day => day.editModeRequests,
  },
  {
    key: 'inline',
    shortLabel: 'Inline',
    footerLabel: 'Inline Mode',
    color: chatModeColors.inline.solid,
    colorClass: 'text-amber-600',
    userDatasetLabel: 'Chat: Inline Mode',
    requestDatasetLabel: 'Inline Mode Requests',
    getUsersValue: day => day.inlineModeUsers,
    getRequestsValue: day => day.inlineModeRequests,
  },
  {
    key: 'plan',
    shortLabel: 'Plan',
    footerLabel: 'Plan Mode',
    color: chatModeColors.plan.solid,
    colorClass: 'text-purple-600',
    userDatasetLabel: 'Chat: Plan Mode',
    requestDatasetLabel: 'Plan Mode Requests',
    getUsersValue: day => day.planModeUsers,
    getRequestsValue: day => day.planModeRequests,
  },
  {
    key: 'cli',
    shortLabel: 'CLI',
    footerLabel: 'CLI',
    color: chatModeColors.cli.solid,
    colorClass: 'text-rose-600',
    userDatasetLabel: 'Copilot CLI',
    requestDatasetLabel: 'CLI Sessions',
    getUsersValue: day => day.cliUsers,
    getRequestsValue: day => day.cliSessions,
  },
] as const;

export function createChatModeMetricSummaries<T>(
  data: T[],
  getValue: (day: T, mode: ChatModeChartMode) => number
): ChatModeMetricSummary[] {
  return chatModeChartModes.map(mode => ({
    mode,
    total: calculateTotal(data, day => getValue(day, mode)),
    average: calculateAverage(data, day => getValue(day, mode)),
    max: findMaxValue(data, day => getValue(day, mode)),
  }));
}

export function createChatModeLineChartData<T extends { date: string }>(
  data: T[],
  getValue: (day: T, mode: ChatModeChartMode) => number,
  getDatasetLabel: (mode: ChatModeChartMode) => string
) {
  return {
    labels: data.map(day => formatShortDate(day.date)),
    datasets: chatModeChartModes.map(mode => (
      createLineDataset(mode.color, getDatasetLabel(mode), data.map(day => getValue(day, mode)))
    )),
  };
}

export function createChatModeStats(
  summaries: ChatModeMetricSummary[]
) {
  return summaries.map(({ mode, average }) => ({
    label: `Avg ${mode.shortLabel}`,
    value: average,
  }));
}

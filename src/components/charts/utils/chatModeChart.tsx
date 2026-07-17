import { calculateAverage, calculateTotal, findMaxValue } from '../../../domain/calculators/statsCalculators';
import type { DailyChatRequestsData, DailyChatUsersData } from '../../../domain/calculators/metricCalculators';
import { formatShortDate } from '../../../utils/formatters';
import { chatModeColors } from './chartColors';
import { createLineDataset } from './chartStyles';

type ChatModeKey = 'ask' | 'agent' | 'edit' | 'inline' | 'plan' | 'cli';

export interface ChatModeChartMode {
  key: ChatModeKey;
  shortLabel: string;
  displayLabel: string;
  footerLabel: string;
  color: string;
  colorClass: string;
  includeInPeakChatUsers: boolean;
  requestUnit: 'requests' | 'sessions';
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

export interface ChatModeFooterEntry {
  key: ChatModeKey | 'all-modes';
  label: string;
  colorClass: string;
  content: string;
}

export const chatModeChartModes: readonly ChatModeChartMode[] = [
  {
    key: 'ask',
    shortLabel: 'Ask',
    displayLabel: 'Ask Mode',
    footerLabel: 'Ask Mode',
    color: chatModeColors.ask.solid,
    colorClass: 'text-green-600',
    includeInPeakChatUsers: true,
    requestUnit: 'requests',
    userDatasetLabel: 'Chat: Ask Mode',
    requestDatasetLabel: 'Ask Mode Requests',
    getUsersValue: day => day.askModeUsers,
    getRequestsValue: day => day.askModeRequests,
  },
  {
    key: 'agent',
    shortLabel: 'Agent',
    displayLabel: 'Agent Mode',
    footerLabel: 'Agent Mode',
    color: chatModeColors.agent.solid,
    colorClass: 'text-blue-600',
    includeInPeakChatUsers: true,
    requestUnit: 'requests',
    userDatasetLabel: 'Chat: Agent Mode',
    requestDatasetLabel: 'Agent Mode Requests',
    getUsersValue: day => day.agentModeUsers,
    getRequestsValue: day => day.agentModeRequests,
  },
  {
    key: 'edit',
    shortLabel: 'Edit',
    displayLabel: 'Edit Mode',
    footerLabel: 'Edit Mode',
    color: chatModeColors.edit.solid,
    colorClass: 'text-gray-900',
    includeInPeakChatUsers: true,
    requestUnit: 'requests',
    userDatasetLabel: 'Chat: Edit Mode',
    requestDatasetLabel: 'Edit Mode Requests',
    getUsersValue: day => day.editModeUsers,
    getRequestsValue: day => day.editModeRequests,
  },
  {
    key: 'inline',
    shortLabel: 'Inline',
    displayLabel: 'Inline Mode',
    footerLabel: 'Inline Mode',
    color: chatModeColors.inline.solid,
    colorClass: 'text-amber-600',
    includeInPeakChatUsers: true,
    requestUnit: 'requests',
    userDatasetLabel: 'Chat: Inline Mode',
    requestDatasetLabel: 'Inline Mode Requests',
    getUsersValue: day => day.inlineModeUsers,
    getRequestsValue: day => day.inlineModeRequests,
  },
  {
    key: 'plan',
    shortLabel: 'Plan',
    displayLabel: 'Plan Mode',
    footerLabel: 'Plan Mode',
    color: chatModeColors.plan.solid,
    colorClass: 'text-purple-600',
    includeInPeakChatUsers: true,
    requestUnit: 'requests',
    userDatasetLabel: 'Chat: Plan Mode',
    requestDatasetLabel: 'Plan Mode Requests',
    getUsersValue: day => day.planModeUsers,
    getRequestsValue: day => day.planModeRequests,
  },
  {
    key: 'cli',
    shortLabel: 'CLI',
    displayLabel: 'CLI',
    footerLabel: 'CLI',
    color: chatModeColors.cli.solid,
    colorClass: 'text-rose-600',
    includeInPeakChatUsers: false,
    requestUnit: 'sessions',
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
  summaries: ChatModeMetricSummary[],
  labelPrefix: string = 'Avg'
) {
  return summaries.map(({ mode, average }) => ({
    label: `${labelPrefix} ${mode.shortLabel}`,
    value: average,
  }));
}

export function createChatModeFooterEntries(
  summaries: ChatModeMetricSummary[],
  formatContent: (summary: ChatModeMetricSummary) => string
): ChatModeFooterEntry[] {
  return summaries.map(summary => ({
    key: summary.mode.key,
    label: summary.mode.footerLabel,
    colorClass: summary.mode.colorClass,
    content: formatContent(summary),
  }));
}

export function renderChatModeFooter(
  entries: ChatModeFooterEntry[],
  extraEntries: ChatModeFooterEntry[] = []
) {
  const allEntries = [...entries, ...extraEntries];
  const gridClass = allEntries.length > chatModeChartModes.length ? 'grid-cols-7' : 'grid-cols-6';

  return (
    <div className={`grid ${gridClass} gap-4 text-xs text-gray-500`}>
      {allEntries.map(entry => (
        <div key={entry.key}>
          <span className={`font-medium ${entry.colorClass}`}>{entry.label}:</span> {entry.content}
        </div>
      ))}
    </div>
  );
}

export function sumChatModeDayValues<T>(
  day: T,
  getValue: (day: T, mode: ChatModeChartMode) => number
): number {
  return chatModeChartModes.reduce((sum, mode) => sum + getValue(day, mode), 0);
}

export function maxChatModeDayValue<T>(
  day: T,
  getValue: (day: T, mode: ChatModeChartMode) => number,
  includeMode: (mode: ChatModeChartMode) => boolean = () => true
): number {
  return chatModeChartModes.reduce((max, mode) => (
    includeMode(mode) ? Math.max(max, getValue(day, mode)) : max
  ), 0);
}

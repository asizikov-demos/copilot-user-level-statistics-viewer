import {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  MetricsStats,
  UserSummary,
} from './types';
import { formatDateRangeForFilename, downloadFile } from './helpers';

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function arrayToCsv<T extends object>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  const headerRow = headers.map((h) => escapeCsvValue(h.label)).join(',');
  const dataRows = data.map((row) =>
    headers.map((h) => escapeCsvValue(row[h.key] as string | number | boolean)).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

export function exportSummaryStatsCsv(
  stats: MetricsStats,
  enterpriseName: string | null
): void {
  const data = [
    { metric: 'Enterprise', value: enterpriseName || 'N/A' },
    { metric: 'Report Start Date', value: stats.reportStartDay },
    { metric: 'Report End Date', value: stats.reportEndDay },
    { metric: 'Total Records', value: stats.totalRecords },
    { metric: 'Unique Users', value: stats.uniqueUsers },
    { metric: 'Chat Users', value: stats.chatUsers },
    { metric: 'Agent Users', value: stats.agentUsers },
    { metric: 'Completion Only Users', value: stats.completionOnlyUsers },
    { metric: 'Top Language', value: stats.topLanguage?.name || 'N/A' },
    { metric: 'Top Language Engagements', value: stats.topLanguage?.engagements || 0 },
    { metric: 'Top IDE', value: stats.topIde?.name || 'N/A' },
    { metric: 'Top IDE Users', value: stats.topIde?.entries || 0 },
    { metric: 'Top Model', value: stats.topModel?.name || 'N/A' },
    { metric: 'Top Model Engagements', value: stats.topModel?.engagements || 0 },
  ];

  const csv = arrayToCsv(data, [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-summary-stats_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportUserSummariesCsv(userSummaries: UserSummary[], stats: MetricsStats): void {
  const csv = arrayToCsv(userSummaries, [
    { key: 'user_login', label: 'Username' },
    { key: 'user_id', label: 'User ID' },
    { key: 'days_active', label: 'Days Active' },
    { key: 'total_user_initiated_interactions', label: 'Total Interactions' },
    { key: 'total_code_generation_activities', label: 'Code Generations' },
    { key: 'total_code_acceptance_activities', label: 'Code Acceptances' },
    { key: 'total_loc_added', label: 'LOC Added' },
    { key: 'total_loc_deleted', label: 'LOC Deleted' },
    { key: 'total_loc_suggested_to_add', label: 'LOC Suggested to Add' },
    { key: 'total_loc_suggested_to_delete', label: 'LOC Suggested to Delete' },
    { key: 'used_chat', label: 'Used Chat' },
    { key: 'used_agent', label: 'Used Agent' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-user-summaries_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportEngagementDataCsv(engagementData: DailyEngagementData[], stats: MetricsStats): void {
  const csv = arrayToCsv(engagementData, [
    { key: 'date', label: 'Date' },
    { key: 'activeUsers', label: 'Active Users' },
    { key: 'totalUsers', label: 'Total Users' },
    { key: 'engagementPercentage', label: 'Engagement %' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-daily-engagement_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportLanguageStatsCsv(languageStats: LanguageStats[], stats: MetricsStats): void {
  const csv = arrayToCsv(languageStats, [
    { key: 'language', label: 'Language' },
    { key: 'totalGenerations', label: 'Total Generations' },
    { key: 'totalAcceptances', label: 'Total Acceptances' },
    { key: 'locAdded', label: 'LOC Added' },
    { key: 'locDeleted', label: 'LOC Deleted' },
    { key: 'locSuggestedToAdd', label: 'LOC Suggested to Add' },
    { key: 'locSuggestedToDelete', label: 'LOC Suggested to Delete' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-language-stats_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportChatUsersDataCsv(chatUsersData: DailyChatUsersData[], stats: MetricsStats): void {
  const csv = arrayToCsv(chatUsersData, [
    { key: 'date', label: 'Date' },
    { key: 'askModeUsers', label: 'Ask Mode Users' },
    { key: 'agentModeUsers', label: 'Agent Mode Users' },
    { key: 'editModeUsers', label: 'Edit Mode Users' },
    { key: 'inlineModeUsers', label: 'Inline Mode Users' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-daily-chat-users_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportChatRequestsDataCsv(chatRequestsData: DailyChatRequestsData[], stats: MetricsStats): void {
  const csv = arrayToCsv(chatRequestsData, [
    { key: 'date', label: 'Date' },
    { key: 'askModeRequests', label: 'Ask Mode Requests' },
    { key: 'agentModeRequests', label: 'Agent Mode Requests' },
    { key: 'editModeRequests', label: 'Edit Mode Requests' },
    { key: 'inlineModeRequests', label: 'Inline Mode Requests' },
  ]);

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(csv, `copilot-daily-chat-requests_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

export function exportFullReportCsv(
  stats: MetricsStats,
  enterpriseName: string | null,
  userSummaries: UserSummary[],
  languageStats: LanguageStats[],
  engagementData: DailyEngagementData[],
  chatUsersData: DailyChatUsersData[],
  chatRequestsData: DailyChatRequestsData[]
): void {
  const sections: string[] = [];
  
  // Summary section
  sections.push('=== SUMMARY STATISTICS ===');
  sections.push(`Enterprise,${escapeCsvValue(enterpriseName || 'N/A')}`);
  sections.push(`Report Period,${stats.reportStartDay} to ${stats.reportEndDay}`);
  sections.push(`Total Records,${stats.totalRecords}`);
  sections.push(`Unique Users,${stats.uniqueUsers}`);
  sections.push(`Chat Users,${stats.chatUsers}`);
  sections.push(`Agent Users,${stats.agentUsers}`);
  sections.push(`Completion Only Users,${stats.completionOnlyUsers}`);
  sections.push(`Top Language,${stats.topLanguage?.name || 'N/A'}`);
  sections.push(`Top IDE,${stats.topIde?.name || 'N/A'}`);
  sections.push(`Top Model,${stats.topModel?.name || 'N/A'}`);
  sections.push('');

  // User summaries section
  sections.push('=== USER SUMMARIES ===');
  sections.push(arrayToCsv(userSummaries, [
    { key: 'user_login', label: 'Username' },
    { key: 'user_id', label: 'User ID' },
    { key: 'days_active', label: 'Days Active' },
    { key: 'total_user_initiated_interactions', label: 'Total Interactions' },
    { key: 'total_code_generation_activities', label: 'Code Generations' },
    { key: 'total_code_acceptance_activities', label: 'Code Acceptances' },
    { key: 'total_loc_added', label: 'LOC Added' },
    { key: 'total_loc_deleted', label: 'LOC Deleted' },
    { key: 'used_chat', label: 'Used Chat' },
    { key: 'used_agent', label: 'Used Agent' },
  ]));
  sections.push('');

  // Language stats section
  sections.push('=== LANGUAGE STATISTICS ===');
  sections.push(arrayToCsv(languageStats, [
    { key: 'language', label: 'Language' },
    { key: 'totalGenerations', label: 'Total Generations' },
    { key: 'totalAcceptances', label: 'Total Acceptances' },
    { key: 'locAdded', label: 'LOC Added' },
    { key: 'locDeleted', label: 'LOC Deleted' },
  ]));
  sections.push('');

  // Daily engagement section
  sections.push('=== DAILY ENGAGEMENT ===');
  sections.push(arrayToCsv(engagementData, [
    { key: 'date', label: 'Date' },
    { key: 'activeUsers', label: 'Active Users' },
    { key: 'totalUsers', label: 'Total Users' },
    { key: 'engagementPercentage', label: 'Engagement %' },
  ]));
  sections.push('');

  // Chat users section
  if (chatUsersData.length > 0) {
    sections.push('=== DAILY CHAT USERS ===');
    sections.push(arrayToCsv(chatUsersData, [
      { key: 'date', label: 'Date' },
      { key: 'askModeUsers', label: 'Ask Mode Users' },
      { key: 'agentModeUsers', label: 'Agent Mode Users' },
      { key: 'editModeUsers', label: 'Edit Mode Users' },
      { key: 'inlineModeUsers', label: 'Inline Mode Users' },
    ]));
    sections.push('');
  }

  // Chat requests section
  if (chatRequestsData.length > 0) {
    sections.push('=== DAILY CHAT REQUESTS ===');
    sections.push(arrayToCsv(chatRequestsData, [
      { key: 'date', label: 'Date' },
      { key: 'askModeRequests', label: 'Ask Mode Requests' },
      { key: 'agentModeRequests', label: 'Agent Mode Requests' },
      { key: 'editModeRequests', label: 'Edit Mode Requests' },
      { key: 'inlineModeRequests', label: 'Inline Mode Requests' },
    ]));
  }

  const dateRange = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);
  downloadFile(sections.join('\n'), `copilot-full-report_${dateRange}.csv`, 'text/csv;charset=utf-8;');
}

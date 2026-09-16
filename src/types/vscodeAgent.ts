export interface VSCodeAgentTotals {
  session_count?: number | null;
  total_user_messages?: number | null;
}

export interface VSCodeAgentUsageSummary {
  activeUsers: number | null;
  sessionCount: number | null;
  userMessages: number | null;
  recordCount: number;
  usageReportedRecords: number;
  sessionsReportedRecords: number;
  messagesReportedRecords: number;
}

export interface DailyVSCodeAgentUsage extends VSCodeAgentUsageSummary {
  date: string;
}

export interface VSCodeAgentUsage {
  summary: VSCodeAgentUsageSummary;
  daily: DailyVSCodeAgentUsage[];
}

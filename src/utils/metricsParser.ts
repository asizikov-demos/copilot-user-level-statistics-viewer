import { CopilotMetrics, MetricsStats, UserSummary } from '../types/metrics';

export function parseMetricsFile(fileContent: string): CopilotMetrics[] {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const metrics: CopilotMetrics[] = [];
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as CopilotMetrics;
      metrics.push(parsed);
    } catch (error) {
      console.warn('Failed to parse line:', line, error);
    }
  }
  
  return metrics;
}

export function calculateStats(metrics: CopilotMetrics[]): MetricsStats {
  if (metrics.length === 0) {
    return {
      uniqueUsers: 0,
      chatUsers: 0,
      agentUsers: 0,
      completionOnlyUsers: 0,
      reportStartDay: '',
      reportEndDay: '',
      totalRecords: 0,
    };
  }

  // Get unique users by user_id and their usage patterns
  const userUsageMap = new Map<number, { used_chat: boolean; used_agent: boolean }>();
  
  for (const metric of metrics) {
    const existingUsage = userUsageMap.get(metric.user_id) || { used_chat: false, used_agent: false };
    userUsageMap.set(metric.user_id, {
      used_chat: existingUsage.used_chat || metric.used_chat,
      used_agent: existingUsage.used_agent || metric.used_agent,
    });
  }

  // Count different user types
  let chatUsers = 0;
  let agentUsers = 0;
  let completionOnlyUsers = 0;

  for (const usage of userUsageMap.values()) {
    if (usage.used_chat) chatUsers++;
    if (usage.used_agent) agentUsers++;
    if (!usage.used_chat && !usage.used_agent) completionOnlyUsers++;
  }
  
  // Get report period from first record (assuming all records have the same period)
  const firstRecord = metrics[0];
  
  return {
    uniqueUsers: userUsageMap.size,
    chatUsers,
    agentUsers,
    completionOnlyUsers,
    reportStartDay: firstRecord.report_start_day,
    reportEndDay: firstRecord.report_end_day,
    totalRecords: metrics.length,
  };
}

export function calculateUserSummaries(metrics: CopilotMetrics[]): UserSummary[] {
  const userMap = new Map<number, UserSummary>();

  for (const metric of metrics) {
    if (!userMap.has(metric.user_id)) {
      userMap.set(metric.user_id, {
        user_login: metric.user_login,
        user_id: metric.user_id,
        total_user_initiated_interactions: 0,
        total_code_generation_activities: 0,
        total_code_acceptance_activities: 0,
        total_generated_loc: 0,
        total_accepted_loc: 0,
        days_active: 0,
        used_agent: false,
        used_chat: false,
      });
    }

    const userSummary = userMap.get(metric.user_id)!;
    
    // Aggregate the totals
    userSummary.total_user_initiated_interactions += metric.user_initiated_interaction_count;
    userSummary.total_code_generation_activities += metric.code_generation_activity_count;
    userSummary.total_code_acceptance_activities += metric.code_acceptance_activity_count;
    userSummary.total_generated_loc += metric.generated_loc_sum;
    userSummary.total_accepted_loc += metric.accepted_loc_sum;
    userSummary.days_active += 1;
    userSummary.used_agent = userSummary.used_agent || metric.used_agent;
    userSummary.used_chat = userSummary.used_chat || metric.used_chat;
  }

  // Convert to array and sort by total activity
  return Array.from(userMap.values()).sort((a, b) => 
    b.total_user_initiated_interactions - a.total_user_initiated_interactions
  );
}

export interface DailyEngagementData {
  date: string;
  activeUsers: number;
  totalUsers: number;
  engagementPercentage: number;
}

export function calculateDailyEngagement(metrics: CopilotMetrics[]): DailyEngagementData[] {
  if (metrics.length === 0) return [];

  // Get all unique users
  const allUsers = new Set(metrics.map(m => m.user_id));
  const totalUsers = allUsers.size;

  // Group metrics by day - if there's an entry for a user, they're engaged
  const dailyMetrics = new Map<string, Set<number>>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, new Set());
    }
    
    // If there's a metrics entry for this user on this day, they're engaged
    dailyMetrics.get(date)!.add(metric.user_id);
  }

  // Convert to array and calculate engagement percentages
  const engagementData: DailyEngagementData[] = Array.from(dailyMetrics.entries())
    .map(([date, activeUsersSet]) => {
      const activeUsers = activeUsersSet.size;
      const engagementPercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      
      return {
        date,
        activeUsers,
        totalUsers,
        engagementPercentage: Math.round(engagementPercentage * 100) / 100 // Round to 2 decimal places
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return engagementData;
}

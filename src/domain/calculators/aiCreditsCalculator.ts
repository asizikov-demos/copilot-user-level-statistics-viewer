import type { CopilotMetrics, UserSummary } from '../../types/metrics';
import { compareByDateAsc } from './statsCalculators';

export interface DailyAiCreditsData {
  date: string;
  aiCreditsUsed: number;
  users: number;
}

export interface AiCreditsConcentration {
  userCount: number;
  creditsShare: number;
}

export interface TopAiCreditsUser extends UserSummary {
  creditsShare: number;
}

export interface AiCreditsSummary {
  activeUsers: number;
  usersInPhase: number;
  activeUserDays: number;
  avgDaysPerUser: number;
  totalAiCreditsUsed: number;
  creditsPerUserDay: number;
  monthlyCredits: Array<{ key: string; aiCreditsUsed: number }>;
  creditsPerActiveUser: number;
  topDecile: AiCreditsConcentration | null;
  topUsers: TopAiCreditsUser[];
}

export function computeAiCreditsSummary(
  userSummaries: UserSummary[],
  dailyCredits: DailyAiCreditsData[],
): AiCreditsSummary {
  let activeUserDays = 0;
  let totalAiCreditsUsed = 0;
  let usersInPhase = 0;
  for (const user of userSummaries) {
    activeUserDays += user.days_active;
    totalAiCreditsUsed += user.total_ai_credits_used;
    if ((user.ai_adoption_phase?.phase_number ?? 0) >= 1) usersInPhase += 1;
  }
  const rankedUsers = [...userSummaries].sort(
    (a, b) => b.total_ai_credits_used - a.total_ai_credits_used,
  );
  const activeUsers = userSummaries.length;
  const topDecileCount = Math.max(1, Math.ceil(activeUsers * 0.1));
  const topDecile = activeUsers === 0 || totalAiCreditsUsed <= 0
    ? null
    : {
        userCount: topDecileCount,
        creditsShare: rankedUsers.slice(0, topDecileCount).reduce(
          (sum, user) => sum + user.total_ai_credits_used, 0,
        ) / totalAiCreditsUsed * 100,
      };
  const monthlyCredits = new Map<string, number>();
  for (const entry of dailyCredits) {
    const key = entry.date.slice(0, 7);
    monthlyCredits.set(key, (monthlyCredits.get(key) ?? 0) + entry.aiCreditsUsed);
  }
  return {
    activeUsers,
    usersInPhase,
    activeUserDays,
    avgDaysPerUser: activeUsers > 0 ? activeUserDays / activeUsers : 0,
    totalAiCreditsUsed,
    creditsPerUserDay: activeUserDays > 0 ? totalAiCreditsUsed / activeUserDays : 0,
    monthlyCredits: Array.from(monthlyCredits, ([key, aiCreditsUsed]) => ({
      key, aiCreditsUsed,
    })).sort((a, b) => a.key.localeCompare(b.key)),
    creditsPerActiveUser: activeUsers > 0 ? totalAiCreditsUsed / activeUsers : 0,
    topDecile,
    topUsers: rankedUsers.slice(0, 5).filter(user => user.total_ai_credits_used > 0).map(user => ({
      ...user,
      creditsShare: totalAiCreditsUsed > 0
        ? user.total_ai_credits_used / totalAiCreditsUsed * 100
        : 0,
    })),
  };
}

export function computeCreditConcentration(
  userCredits: number[],
  totalCredits: number
): AiCreditsConcentration | null {
  if (userCredits.length === 0 || totalCredits <= 0) return null;
  const userCount = Math.max(1, Math.ceil(userCredits.length * 0.1));
  const topCredits = [...userCredits]
    .sort((a, b) => b - a)
    .slice(0, userCount)
    .reduce((total, credits) => total + credits, 0);
  return { userCount, creditsShare: (topCredits / totalCredits) * 100 };
}

export interface AiCreditsAccumulator {
  dailyCredits: Map<string, {
    aiCreditsUsed: number;
    users: Set<number>;
  }>;
}

export function createAiCreditsAccumulator(): AiCreditsAccumulator {
  return {
    dailyCredits: new Map(),
  };
}

export function accumulateAiCredits(
  accumulator: AiCreditsAccumulator,
  metric: CopilotMetrics
): void {
  if (!accumulator.dailyCredits.has(metric.day)) {
    accumulator.dailyCredits.set(metric.day, {
      aiCreditsUsed: 0,
      users: new Set(),
    });
  }

  const dailyCredits = accumulator.dailyCredits.get(metric.day)!;
  dailyCredits.aiCreditsUsed += metric.ai_credits_used;
  if (metric.ai_credits_used > 0) {
    dailyCredits.users.add(metric.user_id);
  }
}

export function computeDailyAiCreditsData(
  accumulator: AiCreditsAccumulator
): DailyAiCreditsData[] {
  return Array.from(accumulator.dailyCredits.entries())
    .map(([date, data]) => ({
      date,
      aiCreditsUsed: data.aiCreditsUsed,
      users: data.users.size,
    }))
    .sort(compareByDateAsc);
}

import type { DailyAiCreditsData } from '../domain/calculators';
import type { UserSummary } from '../types/metrics';
import {
  computeCreditConcentration,
  type AiCreditsConcentration,
} from '../domain/calculators/aiCreditsCalculator';

export type { AiCreditsConcentration } from '../domain/calculators/aiCreditsCalculator';

export interface AiCreditsMonthTotal {
  key: string;
  shortLabel: string;
  aiCreditsUsed: number;
}

export interface AiCreditsStatement {
  activeUsers: number;
  usersInPhase: number;
  activeUserDays: number;
  avgDaysPerUser: number;
  totalAiCreditsUsed: number;
  creditsPerUserDay: number;
  monthlyCredits: AiCreditsMonthTotal[];
  creditsPerActiveUser: number;
  topDecile: AiCreditsConcentration | null;
}

function ratio(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function monthlyTotals(dailyAiCreditsData: DailyAiCreditsData[]): AiCreditsMonthTotal[] {
  const totals = new Map<string, number>();
  for (const entry of dailyAiCreditsData) {
    const key = entry.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + entry.aiCreditsUsed);
  }
  return Array.from(totals, ([key, aiCreditsUsed]) => ({
    key,
    shortLabel: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    aiCreditsUsed,
  })).sort((a, b) => a.key.localeCompare(b.key));
}

export function buildAiCreditsStatement(
  userSummaries: UserSummary[],
  dailyAiCreditsData: DailyAiCreditsData[]
): AiCreditsStatement {
  const activeUsers = userSummaries.length;
  const activeUserDays = userSummaries.reduce((sum, user) => sum + user.days_active, 0);
  const totalAiCreditsUsed = userSummaries.reduce((sum, user) => sum + user.total_ai_credits_used, 0);
  const usersInPhase = userSummaries.filter(user => (user.ai_adoption_phase?.phase_number ?? 0) >= 1).length;

  const topDecile = computeCreditConcentration(
    userSummaries.map(user => user.total_ai_credits_used),
    totalAiCreditsUsed
  );

  return {
    activeUsers,
    usersInPhase,
    activeUserDays,
    avgDaysPerUser: ratio(activeUserDays, activeUsers),
    totalAiCreditsUsed,
    creditsPerUserDay: ratio(totalAiCreditsUsed, activeUserDays),
    monthlyCredits: monthlyTotals(dailyAiCreditsData),
    creditsPerActiveUser: ratio(totalAiCreditsUsed, activeUsers),
    topDecile,
  };
}

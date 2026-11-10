import type { AiCreditsSummary } from '../domain/calculators/aiCreditsCalculator';

export type { AiCreditsConcentration } from '../domain/calculators/aiCreditsCalculator';

export interface AiCreditsMonthTotal {
  key: string;
  shortLabel: string;
  aiCreditsUsed: number;
}

export interface AiCreditsStatement extends Omit<AiCreditsSummary, 'monthlyCredits' | 'topUsers'> {
  monthlyCredits: AiCreditsMonthTotal[];
}

export function buildAiCreditsStatement(summary: AiCreditsSummary): AiCreditsStatement {
  return {
    activeUsers: summary.activeUsers,
    usersInPhase: summary.usersInPhase,
    activeUserDays: summary.activeUserDays,
    avgDaysPerUser: summary.avgDaysPerUser,
    totalAiCreditsUsed: summary.totalAiCreditsUsed,
    creditsPerUserDay: summary.creditsPerUserDay,
    creditsPerActiveUser: summary.creditsPerActiveUser,
    topDecile: summary.topDecile,
    monthlyCredits: summary.monthlyCredits.map(month => ({
      ...month,
      shortLabel: new Date(`${month.key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    })),
  };
}

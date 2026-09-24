import type { CopilotMetrics } from '../../types/metrics';
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

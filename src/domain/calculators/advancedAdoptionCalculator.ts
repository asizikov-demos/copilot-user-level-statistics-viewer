import { compareByDateAsc } from './statsCalculators';

export interface DailyCloudAgentAdoptionData {
  date: string;
  uniqueUsers: number;
}

export interface DailyCodeReviewAdoptionData {
  date: string;
  activeUsers: number;
  passiveUsers: number;
  totalUsers: number;
}

interface AdvancedAdoptionDay {
  cloudAgentUsers: Set<number>;
  codeReviewActiveUsers: Set<number>;
  codeReviewPassiveUsers: Set<number>;
}

export interface AdvancedAdoptionAccumulator {
  dailyAdoption: Map<string, AdvancedAdoptionDay>;
}

export function createAdvancedAdoptionAccumulator(): AdvancedAdoptionAccumulator {
  return {
    dailyAdoption: new Map(),
  };
}

function ensureAdvancedAdoptionDate(
  accumulator: AdvancedAdoptionAccumulator,
  date: string
): AdvancedAdoptionDay {
  if (!accumulator.dailyAdoption.has(date)) {
    accumulator.dailyAdoption.set(date, {
      cloudAgentUsers: new Set(),
      codeReviewActiveUsers: new Set(),
      codeReviewPassiveUsers: new Set(),
    });
  }

  return accumulator.dailyAdoption.get(date)!;
}

export function accumulateCloudAgentAdoption(
  accumulator: AdvancedAdoptionAccumulator,
  date: string,
  userId: number,
  usedCloudAgent: boolean
): void {
  if (!usedCloudAgent) return;

  ensureAdvancedAdoptionDate(accumulator, date).cloudAgentUsers.add(userId);
}

export function accumulateCodeReviewAdoptionSignal(
  accumulator: AdvancedAdoptionAccumulator,
  date: string,
  userId: number,
  usedActiveCodeReview: boolean,
  usedPassiveCodeReview: boolean
): void {
  if (!usedActiveCodeReview && !usedPassiveCodeReview) return;

  const day = ensureAdvancedAdoptionDate(accumulator, date);
  if (usedActiveCodeReview) {
    day.codeReviewActiveUsers.add(userId);
  }
  if (usedPassiveCodeReview) {
    day.codeReviewPassiveUsers.add(userId);
  }
}

export function computeDailyCloudAgentAdoptionData(
  accumulator: AdvancedAdoptionAccumulator
): DailyCloudAgentAdoptionData[] {
  return Array.from(accumulator.dailyAdoption.entries())
    .map(([date, day]) => ({
      date,
      uniqueUsers: day.cloudAgentUsers.size,
    }))
    .filter(day => day.uniqueUsers > 0)
    .sort(compareByDateAsc);
}

export function computeDailyCodeReviewAdoptionData(
  accumulator: AdvancedAdoptionAccumulator
): DailyCodeReviewAdoptionData[] {
  return Array.from(accumulator.dailyAdoption.entries())
    .map(([date, day]) => {
      const totalUsers = new Set([
        ...day.codeReviewActiveUsers,
        ...day.codeReviewPassiveUsers,
      ]).size;

      return {
        date,
        activeUsers: day.codeReviewActiveUsers.size,
        passiveUsers: day.codeReviewPassiveUsers.size,
        totalUsers,
      };
    })
    .filter(day => day.activeUsers > 0 || day.passiveUsers > 0)
    .sort(compareByDateAsc);
}

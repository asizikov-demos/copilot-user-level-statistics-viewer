import { CliUsageAccumulator } from './cliUsageCalculator';
import { compareDatesAsc, compareByDateAsc } from './statsCalculators';
import { type AdoptionTrendEntry, computeAdoptionTrendFromUserSets } from './adoptionTrendHelpers';

export interface DailyEngagementData {
  date: string;
  activeUsers: number;
  totalUsers: number;
  engagementPercentage: number;
}

export interface EngagementAccumulator {
  dailyEngagement: Map<string, Set<number>>;
  allUniqueUsers: Set<number>;
}

export function createEngagementAccumulator(): EngagementAccumulator {
  return {
    dailyEngagement: new Map(),
    allUniqueUsers: new Set(),
  };
}

export function accumulateEngagement(
  accumulator: EngagementAccumulator,
  date: string,
  userId: number
): void {
  accumulator.allUniqueUsers.add(userId);

  if (!accumulator.dailyEngagement.has(date)) {
    accumulator.dailyEngagement.set(date, new Set());
  }
  accumulator.dailyEngagement.get(date)!.add(userId);
}

export function computeEngagementData(
  accumulator: EngagementAccumulator,
  cliAccumulator?: CliUsageAccumulator
): DailyEngagementData[] {
  const cliAllUsers = new Set<number>();
  if (cliAccumulator) {
    for (const data of cliAccumulator.dailySessions.values()) {
      for (const userId of data.users) {
        cliAllUsers.add(userId);
      }
    }
  }

  const allUniqueUsers = new Set(accumulator.allUniqueUsers);
  for (const userId of cliAllUsers) {
    allUniqueUsers.add(userId);
  }
  const totalUsers = allUniqueUsers.size;

  const allDates = new Set(accumulator.dailyEngagement.keys());
  if (cliAccumulator) {
    for (const date of cliAccumulator.dailySessions.keys()) {
      allDates.add(date);
    }
  }

  return Array.from(allDates)
    .map(date => {
      const activeUsersSet = new Set(accumulator.dailyEngagement.get(date) ?? []);
      const cliData = cliAccumulator?.dailySessions.get(date);
      if (cliData) {
        for (const userId of cliData.users) {
          activeUsersSet.add(userId);
        }
      }
      return {
        date,
        activeUsers: activeUsersSet.size,
        totalUsers,
        engagementPercentage: totalUsers > 0
          ? Math.round((activeUsersSet.size / totalUsers) * 100 * 100) / 100
          : 0,
      };
    })
    .sort(compareByDateAsc);
}

export type DailyAdoptionTrend = AdoptionTrendEntry;

export function computeAdoptionTrend(
  accumulator: EngagementAccumulator,
  cliAccumulator?: CliUsageAccumulator
): DailyAdoptionTrend[] {
  const allDates = new Set(accumulator.dailyEngagement.keys());
  if (cliAccumulator) {
    for (const date of cliAccumulator.dailySessions.keys()) {
      allDates.add(date);
    }
  }

  const sortedDates = Array.from(allDates)
    .sort(compareDatesAsc);

  const dateUserSets = sortedDates.map(date => {
    const users = new Set(accumulator.dailyEngagement.get(date) ?? []);
    const cliData = cliAccumulator?.dailySessions.get(date);
    if (cliData) {
      for (const userId of cliData.users) {
        users.add(userId);
      }
    }
    return { date, users };
  });

  return computeAdoptionTrendFromUserSets(dateUserSets);
}

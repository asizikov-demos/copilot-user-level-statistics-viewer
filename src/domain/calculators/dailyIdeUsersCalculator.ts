import type { CopilotMetrics } from '../../types/metrics';

export const CLI_CLIENT_KEY = 'copilot_cli';

export interface DailyIdeUsersDay {
  date: string;
  uniqueUsers: number;
}

export interface DailyIdeUsersEntry {
  ide: string;
  totalUniqueUsers: number;
  daily: DailyIdeUsersDay[];
}

export type DailyIdeUsersData = DailyIdeUsersEntry[];

export interface DailyIdeUsersAccumulator {
  ideDayUsers: Map<string, Map<string, Set<number>>>;
  ideUsers: Map<string, Set<number>>;
}

export function createDailyIdeUsersAccumulator(): DailyIdeUsersAccumulator {
  return {
    ideDayUsers: new Map(),
    ideUsers: new Map(),
  };
}

function trackIdeDayUser(
  accumulator: DailyIdeUsersAccumulator,
  ide: string,
  day: string,
  userId: number
): void {
  let dayUsers = accumulator.ideDayUsers.get(ide);
  if (!dayUsers) {
    dayUsers = new Map();
    accumulator.ideDayUsers.set(ide, dayUsers);
  }

  let users = dayUsers.get(day);
  if (!users) {
    users = new Set();
    dayUsers.set(day, users);
  }
  users.add(userId);

  let totalUsers = accumulator.ideUsers.get(ide);
  if (!totalUsers) {
    totalUsers = new Set();
    accumulator.ideUsers.set(ide, totalUsers);
  }
  totalUsers.add(userId);
}

export function accumulateDailyIdeUsers(
  accumulator: DailyIdeUsersAccumulator,
  metric: CopilotMetrics
): void {
  for (const ideTotal of metric.totals_by_ide) {
    trackIdeDayUser(accumulator, ideTotal.ide, metric.day, metric.user_id);
  }

  if (metric.used_cli) {
    trackIdeDayUser(accumulator, CLI_CLIENT_KEY, metric.day, metric.user_id);
  }
}

export function computeDailyIdeUsersData(
  accumulator: DailyIdeUsersAccumulator
): DailyIdeUsersData {
  const entries: DailyIdeUsersData = Array.from(
    accumulator.ideDayUsers.entries()
  ).map(([ide, dayUsers]) => ({
    ide,
    totalUniqueUsers: accumulator.ideUsers.get(ide)?.size ?? 0,
    daily: Array.from(dayUsers.entries())
      .map(([date, users]) => ({ date, uniqueUsers: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }));

  return entries.sort(
    (a, b) =>
      b.totalUniqueUsers - a.totalUniqueUsers || a.ide.localeCompare(b.ide)
  );
}

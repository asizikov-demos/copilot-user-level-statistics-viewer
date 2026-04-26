import { CopilotMetrics } from '../../types/metrics';

export interface DailyCliSessionData {
  date: string;
  sessionCount: number;
  requestCount: number;
  promptCount: number;
  uniqueUsers: number;
}

export interface DailyCliTokenData {
  date: string;
  outputTokens: number;
  promptTokens: number;
  requestCount: number;
}

export interface CliUsageAccumulator {
  dailySessions: Map<string, {
    sessionCount: number;
    requestCount: number;
    promptCount: number;
    users: Set<number>;
  }>;
  dailyTokens: Map<string, {
    outputTokens: number;
    promptTokens: number;
    requestCount: number;
  }>;
}

export function createCliUsageAccumulator(): CliUsageAccumulator {
  return {
    dailySessions: new Map(),
    dailyTokens: new Map(),
  };
}

export function ensureCliDates(accumulator: CliUsageAccumulator, date: string): void {
  if (!accumulator.dailySessions.has(date)) {
    accumulator.dailySessions.set(date, {
      sessionCount: 0,
      requestCount: 0,
      promptCount: 0,
      users: new Set(),
    });
  }
  if (!accumulator.dailyTokens.has(date)) {
    accumulator.dailyTokens.set(date, { outputTokens: 0, promptTokens: 0, requestCount: 0 });
  }
}

export function accumulateCliUsage(
  accumulator: CliUsageAccumulator,
  date: string,
  userId: number,
  metric: CopilotMetrics
): void {
  const cli = metric.totals_by_cli;
  if (!cli) return;

  ensureCliDates(accumulator, date);

  const ds = accumulator.dailySessions.get(date)!;
  ds.sessionCount += cli.session_count;
  ds.requestCount += cli.request_count;
  ds.promptCount += cli.prompt_count;
  ds.users.add(userId);

  const dt = accumulator.dailyTokens.get(date)!;
  dt.outputTokens += cli.token_usage.output_tokens_sum;
  dt.promptTokens += cli.token_usage.prompt_tokens_sum;
  dt.requestCount += cli.request_count;
}

export function computeDailyCliSessionData(
  accumulator: CliUsageAccumulator
): DailyCliSessionData[] {
  return Array.from(accumulator.dailySessions.entries())
    .map(([date, data]) => ({
      date,
      sessionCount: data.sessionCount,
      requestCount: data.requestCount,
      promptCount: data.promptCount,
      uniqueUsers: data.users.size,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeDailyCliTokenData(
  accumulator: CliUsageAccumulator
): DailyCliTokenData[] {
  return Array.from(accumulator.dailyTokens.entries())
    .map(([date, data]) => ({
      date,
      outputTokens: data.outputTokens,
      promptTokens: data.promptTokens,
      requestCount: data.requestCount,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface DailyCliAdoptionTrend {
  date: string;
  newUsers: number;
  returningUsers: number;
  totalActiveUsers: number;
  cumulativeUsers: number;
}

export function computeCliAdoptionTrend(
  accumulator: CliUsageAccumulator
): DailyCliAdoptionTrend[] {
  const sortedDates = Array.from(accumulator.dailySessions.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

  const seenBefore = new Set<number>();
  return sortedDates.map(([date, data]) => {
    let newUsers = 0;
    let returningUsers = 0;
    for (const userId of data.users) {
      if (seenBefore.has(userId)) {
        returningUsers++;
      } else {
        newUsers++;
        seenBefore.add(userId);
      }
    }
    return {
      date,
      newUsers,
      returningUsers,
      totalActiveUsers: newUsers + returningUsers,
      cumulativeUsers: seenBefore.size,
    };
  });
}

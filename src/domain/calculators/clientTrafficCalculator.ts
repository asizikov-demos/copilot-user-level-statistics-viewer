import type { ClientUsageTotals } from '../../types/metrics';
import type { ClientTrafficMetrics, ClientTrafficPeriod, TrafficCounts } from '../../types/clientTraffic';

interface TrafficAccumulator {
  requests: number;
  promptTokens: number;
  outputTokens: number;
  users: Set<number>;
}

interface ModelAccumulator extends TrafficAccumulator {
  model: string;
  modelSelectionMode: string;
}

interface ClientAccumulator extends TrafficAccumulator {
  sessions: number;
  models: Map<string, Map<string, ModelAccumulator>>;
}

interface PeriodAccumulator {
  recordCount: number;
  reportedRecords: number;
  users: Set<number>;
  clients: Map<string, ClientAccumulator>;
}

export interface ClientTrafficAccumulator {
  summary: PeriodAccumulator;
  daily: Map<string, PeriodAccumulator>;
}

function createPeriod(): PeriodAccumulator {
  return { recordCount: 0, reportedRecords: 0, users: new Set(), clients: new Map() };
}

export function createClientTrafficAccumulator(): ClientTrafficAccumulator {
  return { summary: createPeriod(), daily: new Map() };
}

function createTraffic(): TrafficAccumulator {
  return { requests: 0, promptTokens: 0, outputTokens: 0, users: new Set() };
}

function addTraffic(target: TrafficAccumulator, source: Pick<ClientUsageTotals, 'request_count' | 'token_usage'>, userId: number): void {
  target.requests += source.request_count;
  target.promptTokens += source.token_usage.prompt_tokens_sum;
  target.outputTokens += source.token_usage.output_tokens_sum;
  if (source.request_count > 0) target.users.add(userId);
}

function accumulatePeriod(period: PeriodAccumulator, userId: number, totals: ClientUsageTotals[] | null | undefined): void {
  period.recordCount++;
  if (totals == null) return;
  period.reportedRecords++;
  for (const total of totals) {
    let client = period.clients.get(total.client);
    if (!client) {
      client = { ...createTraffic(), sessions: 0, models: new Map() };
      period.clients.set(total.client, client);
    }
    addTraffic(client, total, userId);
    client.sessions += total.session_count;
    if (total.request_count > 0) period.users.add(userId);
    for (const row of total.totals_by_model) {
      let modes = client.models.get(row.model);
      if (!modes) {
        modes = new Map();
        client.models.set(row.model, modes);
      }
      let model = modes.get(row.model_selection_mode);
      if (!model) {
        model = { ...createTraffic(), model: row.model, modelSelectionMode: row.model_selection_mode };
        modes.set(row.model_selection_mode, model);
      }
      addTraffic(model, row, userId);
    }
  }
}

export function accumulateClientTraffic(
  accumulator: ClientTrafficAccumulator,
  metric: { day: string; user_id: number; totals_by_client?: ClientUsageTotals[] | null },
): void {
  let daily = accumulator.daily.get(metric.day);
  if (!daily) {
    daily = createPeriod();
    accumulator.daily.set(metric.day, daily);
  }
  accumulatePeriod(accumulator.summary, metric.user_id, metric.totals_by_client);
  accumulatePeriod(daily, metric.user_id, metric.totals_by_client);
}

function counts(source: TrafficAccumulator): TrafficCounts {
  return {
    requestCount: source.requests,
    promptTokens: source.promptTokens,
    outputTokens: source.outputTokens,
    avgTokensPerRequest: source.requests > 0
      ? (source.promptTokens + source.outputTokens) / source.requests
      : null,
  };
}

function finalizePeriod(period: PeriodAccumulator): ClientTrafficPeriod {
  return {
    recordCount: period.recordCount,
    reportedRecords: period.reportedRecords,
    activeUsers: period.users.size,
    clients: Array.from(period.clients, ([client, value]) => ({
      client,
      ...counts(value),
      activeUsers: value.users.size,
      reportedSessionCount: value.sessions,
      models: Array.from(value.models.values()).flatMap(modes =>
        Array.from(modes.values(), model => ({
          model: model.model,
          modelSelectionMode: model.modelSelectionMode,
          ...counts(model),
          activeUsers: model.users.size,
        }))
      ).sort((a, b) => b.requestCount - a.requestCount
        || a.model.localeCompare(b.model)
        || a.modelSelectionMode.localeCompare(b.modelSelectionMode)),
    })).sort((a, b) => b.requestCount - a.requestCount || a.client.localeCompare(b.client)),
  };
}

export function computeClientTraffic(accumulator: ClientTrafficAccumulator): ClientTrafficMetrics {
  return {
    summary: finalizePeriod(accumulator.summary),
    daily: Array.from(accumulator.daily, ([day, period]) => ({ day, ...finalizePeriod(period) }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}

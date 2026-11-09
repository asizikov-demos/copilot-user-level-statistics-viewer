import { describe, expect, it } from 'vitest';
import type { ClientUsageTotals } from '../../../types/metrics';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import { accumulateClientTraffic, computeClientTraffic, createClientTrafficAccumulator } from '../clientTrafficCalculator';

function client(requests = 2, tokens = 20, mode = 'fusion_high', name = 'opencode'): ClientUsageTotals {
  return {
    client: name,
    request_count: requests,
    session_count: 0,
    token_usage: { prompt_tokens_sum: tokens, output_tokens_sum: tokens / 2, avg_tokens_per_request: 999 },
    totals_by_model: [{
      model: 'unknown',
      model_selection_mode: mode,
      request_count: requests,
      token_usage: { prompt_tokens_sum: tokens, output_tokens_sum: tokens / 2, avg_tokens_per_request: 999 },
    }],
  };
}

describe('client traffic aggregation', () => {
  it('distinguishes unavailable records, reported empty arrays, and positive traffic with zero sessions', () => {
    const accumulator = createClientTrafficAccumulator();
    const rows: Array<[string, ClientUsageTotals[] | null | undefined]> = [
      ['2026-10-21', undefined],
      ['2026-10-21', null],
      ['2026-10-22', []],
      ['2026-10-23', [client()]],
    ];
    for (const [day, totals] of rows) {
      accumulateClientTraffic(accumulator, { day, user_id: 1, totals_by_client: totals });
    }
    const result = computeClientTraffic(accumulator);
    expect(result.summary).toMatchObject({ recordCount: 4, reportedRecords: 2, activeUsers: 1 });
    expect(result.daily.map(day => [day.day, day.recordCount, day.reportedRecords, day.activeUsers]))
      .toEqual([['2026-10-21', 2, 0, 0], ['2026-10-22', 1, 1, 0], ['2026-10-23', 1, 1, 1]]);
    expect(result.summary.clients[0]).toMatchObject({ requestCount: 2, reportedSessionCount: 0, activeUsers: 1 });
  });

  it('deduplicates users across days/clients and computes weighted token averages', () => {
    const accumulator = createClientTrafficAccumulator();
    const rows = [
      { day: '2026-10-23', user_id: 1, totals_by_client: [client(2, 20), client(2, 20, 'auto', 'codex')] },
      { day: '2026-10-22', user_id: 1, totals_by_client: [client(8, 160)] },
      { day: '2026-10-23', user_id: 2, totals_by_client: [{ ...client(2, 20, 'future_mode'), session_count: 3 }] },
    ];
    rows.forEach(row => accumulateClientTraffic(accumulator, row));
    const result = computeClientTraffic(accumulator);
    expect(result.summary.activeUsers).toBe(2);
    expect(result.summary.clients.map(row => row.client)).toEqual(['opencode', 'codex']);
    expect(result.summary.clients[0]).toMatchObject({
      activeUsers: 2, requestCount: 12, reportedSessionCount: 3,
      promptTokens: 200, outputTokens: 100, avgTokensPerRequest: 25,
    });
    expect(result.summary.clients[0].models).toEqual([
      { model: 'unknown', modelSelectionMode: 'fusion_high', requestCount: 10, promptTokens: 180,
        outputTokens: 90, avgTokensPerRequest: 27, activeUsers: 1 },
      { model: 'unknown', modelSelectionMode: 'future_mode', requestCount: 2, promptTokens: 20,
        outputTokens: 10, avgTokensPerRequest: 15, activeUsers: 1 },
    ]);
    const reversed = createClientTrafficAccumulator();
    rows.toReversed().forEach(row => accumulateClientTraffic(reversed, row));
    expect(computeClientTraffic(reversed)).toEqual(result);
  });

  it('retains zero rows without classifying session-only or zero-request users as request-active', () => {
    const accumulator = createClientTrafficAccumulator();
    accumulateClientTraffic(accumulator, {
      day: '2026-10-22', user_id: 1,
      totals_by_client: [{ ...client(0, 0), session_count: 3 }],
    });
    expect(computeClientTraffic(accumulator).summary).toMatchObject({
      activeUsers: 0,
      clients: [{ requestCount: 0, activeUsers: 0, reportedSessionCount: 3, avgTokensPerRequest: null,
        models: [{ activeUsers: 0, avgTokensPerRequest: null }] }],
    });
    expect(computeClientTraffic(createClientTrafficAccumulator())).toEqual({
      summary: { recordCount: 0, reportedRecords: 0, activeUsers: 0, clients: [] }, daily: [],
    });
  });

  it('keeps traffic in worker results and on-demand details without changing legacy totals', () => {
    const traffic = client();
    const base = makeMetric({ user_id: 1, day: '2026-10-22' });
    const legacy = aggregateMetrics([base]).aggregated;
    const { aggregated, userDetailAccumulator } = aggregateMetrics([{ ...base, totals_by_client: [traffic] }]);
    expect({ ...aggregated.clients, traffic: legacy.clients.traffic }).toEqual(legacy.clients);
    expect({
      ...aggregated.overview,
      clientReachData: legacy.overview.clientReachData,
      workingPatterns: legacy.overview.workingPatterns,
    }).toEqual(legacy.overview);
    expect(aggregated.overview.clientReachData).toEqual([{ client: 'opencode', users: 1 }]);
    expect(aggregated.users.userSummaries).toEqual(
      legacy.users.userSummaries.map(user => ({ ...user, clients_used: ['opencode'], top_client: 'opencode' })),
    );
    expect({ ...aggregated.models, selectionModeRequests: legacy.models.selectionModeRequests }).toEqual(legacy.models);
    expect(aggregated.models.selectionModeRequests).toMatchObject({
      recordCount: 1, reportedRecords: 1, excludedRequestCount: 2,
    });
    expect(aggregated.cli).toEqual(legacy.cli);
    expect(aggregated.impact).toEqual(legacy.impact);
    expect(aggregated.clients.traffic.summary.clients[0].requestCount).toBe(2);
    traffic.token_usage.prompt_tokens_sum = 1000;
    traffic.totals_by_model[0].model_selection_mode = 'mutated';
    const detail = computeSingleUserDetailedMetrics(userDetailAccumulator, 1);
    expect(detail?.clientTraffic).toEqual(aggregated.clients.traffic);
    expect(detail?.days[0].totals_by_client?.[0].token_usage.prompt_tokens_sum).toBe(20);
    expect(detail?.totalModelRequests).toBe(0);
  });
});

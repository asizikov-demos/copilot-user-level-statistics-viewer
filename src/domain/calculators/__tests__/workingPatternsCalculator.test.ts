import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { makeCliTotals, makeFeatureTotal, makeIdeTotal } from '../../../__tests__/factories/metricTotals';
import type { ClientUsageTotals } from '../../../types/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { parseMetricsLines } from '../../metricsParser';

function traffic(client: string, overrides: Partial<ClientUsageTotals> = {}): ClientUsageTotals {
  return {
    client, request_count: 1, session_count: 0,
    token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
    totals_by_model: [],
    ...overrides,
  };
}

describe('working-pattern reach', () => {
  it('deduplicates overlapping groups and local surfaces across dates, not events, IDEs or models', () => {
    const records = [
      makeMetric({
        user_id: 1, day: '2026-11-01', report_start_day: '2026-11-01', report_end_day: '2026-11-28',
        used_agent: true,
        totals_by_feature: [makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 2 })],
      }),
      makeMetric({
        user_id: 1, day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-28',
        used_agent: true, used_cli: true,
        totals_by_client: [traffic('agentic_workflows'), traffic('agentic_workflows'), traffic('copilot_cli')],
      }),
      makeMetric({
        user_id: 2, day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-28',
        used_copilot_app: true, used_copilot_code_review_passive: true,
        totals_by_client: [traffic('github_app'), traffic('copilot_app')],
      }),
      makeMetric({
        user_id: 3, day: '2026-11-03', report_start_day: '2026-11-01', report_end_day: '2026-11-28',
        used_chat: true, code_generation_activity_count: 10, used_copilot_coding_agent: true,
        totals_by_feature: [makeFeatureTotal('chat_panel_unknown_mode', 4)],
        totals_by_client: [traffic('vscode'), traffic('future_client')],
      }),
    ];
    const original = structuredClone(records);
    const profile = aggregateMetrics(records).aggregated.overview.workingPatterns;
    expect(profile).toMatchObject({
      reportStartDay: '2026-11-01', reportEndDay: '2026-11-28', recordCount: 4,
      totalUsers: 3, assistanceUsers: 1, localAgentUsers: 2, delegatedUsers: 2,
      multipleLocalSurfaceUsers: 1, localAndDelegatedUsers: 2, usersWithoutPatternEvidence: 1,
      coverage: { clientTrafficReportedRecords: 3, cloudAgentReportedRecords: 0, codeReviewReportedRecords: 1 },
    });
    expect(profile.assistanceUsers + profile.localAgentUsers + profile.delegatedUsers!).toBeGreaterThan(profile.totalUsers);
    expect(aggregateMetrics(records.toReversed()).aggregated.overview.workingPatterns).toEqual(profile);
    expect(records).toEqual(original);
  });

  it('preserves unavailable delegated signals separately from reported zero, including null and empty traffic', () => {
    const unavailable = aggregateMetrics(parseMetricsLines([{
      line: JSON.stringify(makeMetric({
        used_copilot_app: undefined, used_vscode_agent: null,
        used_copilot_code_review_active: null, used_copilot_code_review_passive: null,
        totals_by_client: null,
        totals_by_feature: [makeFeatureTotal('chat_panel_ask_mode', 1)],
      })),
    }])).aggregated.overview.workingPatterns;
    expect(unavailable).toMatchObject({
      totalUsers: 1, assistanceUsers: 1, delegatedUsers: null, localAndDelegatedUsers: null,
      coverage: {
        clientTrafficReportedRecords: 0, cloudAgentReportedRecords: 0, codeReviewReportedRecords: 0,
        appReportedRecords: 0, vscodeAgentsReportedRecords: 0,
      },
    });
    const reportedZero = aggregateMetrics(parseMetricsLines([{
      line: JSON.stringify(makeMetric({ totals_by_client: [], used_copilot_cloud_agent: false })),
    }])).aggregated.overview.workingPatterns;
    expect(reportedZero).toMatchObject({
      assistanceUsers: 0, localAgentUsers: 0, delegatedUsers: 0, localAndDelegatedUsers: 0,
      usersWithoutPatternEvidence: 1,
      coverage: { clientTrafficReportedRecords: 1, cloudAgentReportedRecords: 1 },
    });

    expect(aggregateMetrics([]).aggregated.overview.workingPatterns).toMatchObject({
      totalUsers: 0, delegatedUsers: null, localAndDelegatedUsers: null, usersWithoutPatternEvidence: 0,
    });
  });

  it('does not mistake parser-inferred App presence for positive App usage', () => {
    const parsed = parseMetricsLines([{
      line: JSON.stringify(makeMetric({
        used_copilot_app: undefined,
        totals_by_copilot_app: makeCliTotals(),
        totals_by_feature: [makeFeatureTotal('copilot_app', 0)],
      })),
    }]);
    expect(parsed[0].used_copilot_app).toBe(true);
    expect(aggregateMetrics(parsed).aggregated.overview.workingPatterns).toMatchObject({
      localAgentUsers: 0, delegatedUsers: null, usersWithoutPatternEvidence: 1,
      coverage: { appReportedRecords: 1, cloudAgentReportedRecords: 0, codeReviewReportedRecords: 0 },
    });
  });

  it('classifies active historical GitHub App IDE rows as the Copilot App surface', () => {
    const parsed = parseMetricsLines([{
      line: JSON.stringify(makeMetric({
        used_copilot_app: undefined,
        totals_by_ide: [makeIdeTotal('github_app', 1)],
      })),
    }]);
    const aggregated = aggregateMetrics(parsed).aggregated;

    expect(aggregated.overview.clientReachData).toEqual([{ client: 'github_app', users: 1 }]);
    expect(aggregated.overview.workingPatterns).toMatchObject({
      localAgentUsers: 1,
      multipleLocalSurfaceUsers: 0,
      usersWithoutPatternEvidence: 0,
    });
  });

  it('recognizes positive native totals, non-Agent chat, and delegated flags while excluding zero-only entries', () => {
    const profile = aggregateMetrics([
      makeMetric({
        user_id: 1, used_vscode_agent: null,
        totals_by_vscode_agent: { session_count: 1 },
        totals_by_cli: makeCliTotals({ token_usage: { prompt_tokens_sum: 2 } }),
        used_copilot_cloud_agent: true,
        totals_by_feature: [makeFeatureTotal('chat_panel_plan_mode', 1)],
      }),
      makeMetric({
        user_id: 2, totals_by_copilot_app: makeCliTotals({ session_count: 1 }),
        totals_by_client: [traffic('code_review', {
          request_count: 0,
          token_usage: { prompt_tokens_sum: 2, output_tokens_sum: 0, avg_tokens_per_request: 0 },
        })],
        totals_by_feature: [makeFeatureTotal('chat_panel_agent_mode', 1), makeFeatureTotal('code_completion', 0)],
      }),
      makeMetric({
        user_id: 3, totals_by_cli: makeCliTotals(), totals_by_copilot_app: makeCliTotals(),
        totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 },
        totals_by_client: [traffic('cloud_agent', { request_count: 0 }), traffic('agentic_workflows', { request_count: 0 })],
        totals_by_feature: [makeFeatureTotal('chat_panel_agent_mode', 0)],
      }),
    ]).aggregated.overview.workingPatterns;
    expect(profile).toMatchObject({
      totalUsers: 3, assistanceUsers: 1, localAgentUsers: 2, delegatedUsers: 2,
      multipleLocalSurfaceUsers: 2, localAndDelegatedUsers: 2, usersWithoutPatternEvidence: 1,
    });
  });

  it('spans every uploaded report window and observed date instead of labeling a larger snapshot as 28 days', () => {
    const profile = aggregateMetrics([
      makeMetric({ day: '2026-11-03', report_start_day: '2026-11-01', report_end_day: '2026-11-28' }),
      makeMetric({ day: '2026-10-30', report_start_day: '2026-11-02', report_end_day: '2026-12-01' }),
    ]).aggregated.overview.workingPatterns;
    expect(profile.reportStartDay).toBe('2026-10-30');
    expect(profile.reportEndDay).toBe('2026-12-01');
  });
});

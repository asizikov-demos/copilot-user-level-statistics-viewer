import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  makeCliTotals,
  makeIdeTotal,
  makeModelFeatureTotal,
} from '../../../__tests__/factories/metricTotals';
import type { CopilotMetrics, UserSummary } from '../../../types/metrics';
import {
  accumulateUserSummaryAggregation,
  createUserSummaryAggregationAccumulator,
  finalizeUserSummaryAggregation,
} from '../userSummaryAggregation';

type SummaryRecord = { metric: Partial<CopilotMetrics>; usedCloudAgent?: boolean };

function summarize(records: SummaryRecord[]): UserSummary[] {
  const accumulator = createUserSummaryAggregationAccumulator();
  for (const { metric, usedCloudAgent = false } of records) {
    accumulateUserSummaryAggregation(
      accumulator,
      makeMetric({ user_id: 1, ...metric }),
      usedCloudAgent
    );
  }
  return finalizeUserSummaryAggregation(accumulator).userSummaries;
}

function summarizeOne(records: SummaryRecord[]): UserSummary {
  const [summary] = summarize(records);
  return summary;
}

describe('user summary aggregation', () => {
  it('sums signed counters and AI credits across a user\'s records', () => {
    const summary = summarizeOne([
      {
        metric: {
          day: '2024-01-15',
          user_initiated_interaction_count: 3,
          code_acceptance_activity_count: 2,
          loc_added_sum: 10,
          loc_deleted_sum: 12,
          loc_suggested_to_add_sum: 14,
          loc_suggested_to_delete_sum: 16,
          ai_credits_used: 55.053015,
        },
      },
      {
        metric: {
          day: '2024-01-16',
          user_initiated_interaction_count: 7,
          code_acceptance_activity_count: 5,
          loc_added_sum: -2,
          loc_deleted_sum: -3,
          loc_suggested_to_add_sum: -4,
          loc_suggested_to_delete_sum: -5,
          ai_credits_used: 4.946985,
        },
      },
    ]);

    expect(summary).toMatchObject({
      total_user_initiated_interactions: 10,
      total_code_acceptance_activities: 7,
      total_loc_added: 8,
      total_loc_deleted: 9,
      total_loc_suggested_to_add: 10,
      total_loc_suggested_to_delete: 11,
      net_loc_contribution: -1,
    });
    expect(summary.total_ai_credits_used).toBeCloseTo(60);
  });

  it('OR-merges usage flags across days', () => {
    const summary = summarizeOne([
      {
        metric: {
          day: '2024-01-15',
          used_chat: true,
          used_copilot_code_review_active: true,
          code_generation_activity_count: 1,
        },
        usedCloudAgent: true,
      },
      {
        metric: {
          day: '2024-01-16',
          used_agent: true,
          used_cli: true,
          used_copilot_app: true,
          used_copilot_code_review_passive: true,
          totals_by_model_feature: [
            makeModelFeatureTotal(' Auto ', 'agent_edit', 0, {
              code_generation_activity_count: 1,
            }),
          ],
        },
      },
    ]);

    expect(summary).toMatchObject({
      used_code_completion: true,
      used_agent: true,
      used_chat: true,
      used_cli: true,
      used_copilot_app: true,
      used_copilot_coding_agent: true,
      used_copilot_code_review_active: true,
      used_copilot_code_review_passive: true,
      used_auto_mode: true,
    });
  });

  it('leaves flags false when no record reports them', () => {
    expect(summarizeOne([{ metric: {} }])).toMatchObject({
      used_code_completion: false,
      used_agent: false,
      used_chat: false,
      used_cli: false,
      used_copilot_app: false,
      used_copilot_coding_agent: false,
      used_copilot_code_review_active: false,
      used_copilot_code_review_passive: false,
      used_auto_mode: false,
    });
  });

  it.each<{ name: string; flags: (boolean | null | undefined)[]; expected: boolean | undefined }>([
    { name: 'never reported', flags: [undefined, null], expected: undefined },
    { name: 'explicitly false', flags: [false, null], expected: false },
    { name: 'true on any day', flags: [false, true, null], expected: true },
  ])('reflects used_vscode_agent when $name', ({ flags, expected }) => {
    const summary = summarizeOne(flags.map((flag, index) => ({
      metric: { day: `2024-01-1${index + 5}`, used_vscode_agent: flag },
    })));

    expect(summary.used_vscode_agent).toBe(expected);
  });

  it('counts distinct active, cloud-agent, and code-review days', () => {
    const summary = summarizeOne([
      {
        metric: { day: '2024-01-15', used_copilot_code_review_active: true },
        usedCloudAgent: true,
      },
      {
        metric: { day: '2024-01-15', used_copilot_code_review_passive: true },
        usedCloudAgent: true,
      },
      {
        metric: { day: '2024-01-16', used_copilot_code_review_passive: true },
        usedCloudAgent: true,
      },
      { metric: { day: '2024-01-17' } },
    ]);

    expect(summary).toMatchObject({
      days_active: 3,
      cloud_agent_days: 2,
      code_review_days: 2,
    });
  });

  it('keeps a copy of the latest-day AI adoption phase regardless of record order', () => {
    const latestPhase = { phase_number: 2, phase: 'Accelerating', version: 'v2' };
    const summary = summarizeOne([
      { metric: { day: '2024-01-16', ai_adoption_phase: latestPhase } },
      {
        metric: {
          day: '2024-01-15',
          ai_adoption_phase: { phase_number: 1, phase: 'Exploring', version: 'v1' },
        },
      },
      { metric: { day: '2024-01-17' } },
    ]);

    expect(summary.ai_adoption_phase).toEqual(latestPhase);
    expect(summary.ai_adoption_phase).not.toBe(latestPhase);
  });

  it.each<{ name: string; records: Partial<CopilotMetrics>[]; expected: string | null }>([
    {
      name: 'sums interactions per client across days',
      records: [
        { day: '2024-01-15', totals_by_ide: [makeIdeTotal('vscode', 3), makeIdeTotal('intellij', 8)] },
        { day: '2024-01-16', totals_by_ide: [makeIdeTotal('vscode', 7), makeIdeTotal('intellij', 1)] },
      ],
      expected: 'vscode',
    },
    {
      name: 'trims client names before merging',
      records: [
        { totals_by_ide: [makeIdeTotal(' vscode ', 3), makeIdeTotal('alpha', 3), makeIdeTotal('vscode', 1)] },
      ],
      expected: 'vscode',
    },
    {
      name: 'breaks ties lexically and ignores blank or non-positive clients',
      records: [
        {
          totals_by_ide: [
            makeIdeTotal(' zebra ', 1),
            makeIdeTotal('alpha', 1),
            makeIdeTotal('ignored', -1),
            makeIdeTotal('   ', 10),
          ],
        },
      ],
      expected: 'alpha',
    },
    {
      name: 'counts CLI prompts as copilot_cli interactions',
      records: [
        {
          used_cli: true,
          totals_by_ide: [makeIdeTotal('vscode', 4)],
          totals_by_cli: makeCliTotals({ session_count: 3, request_count: 12, prompt_count: 9 }),
        },
      ],
      expected: 'copilot_cli',
    },
    {
      name: 'falls back to one CLI interaction when used_cli has no totals',
      records: [{ used_cli: true, totals_by_ide: [makeIdeTotal('zebra', 1)] }],
      expected: 'copilot_cli',
    },
    {
      name: 'returns null without positive client interactions',
      records: [{ totals_by_ide: [makeIdeTotal('vscode', 0)] }],
      expected: null,
    },
  ])('selects the top client: $name', ({ records, expected }) => {
    const summary = summarizeOne(records.map(metric => ({ metric })));

    expect(summary.top_client).toBe(expected);
  });

  it('lists every client with any activity, sorted', () => {
    const summary = summarizeOne([
      {
        metric: {
          used_cli: true,
          used_copilot_app: true,
          totals_by_ide: [
            makeIdeTotal(' beta ', 1),
            makeIdeTotal('completion-only', 0, { code_generation_activity_count: 1 }),
            makeIdeTotal('alpha', 1),
            makeIdeTotal('idle', 0),
          ],
        },
      },
    ]);

    expect(summary.clients_used).toEqual([
      'alpha',
      'beta',
      'completion-only',
      'copilot_app',
      'copilot_cli',
    ]);
  });

  it('orders users by total interactions, highest first', () => {
    const summaries = summarize([
      { metric: { user_id: 1, user_initiated_interaction_count: 5 } },
      { metric: { user_id: 2, user_initiated_interaction_count: 20 } },
      { metric: { user_id: 3, user_initiated_interaction_count: 9 } },
    ]);

    expect(summaries.map(user => user.user_id)).toEqual([2, 3, 1]);
  });
});

import { describe, it, expect } from 'vitest';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import {
  accumulateUserDays,
  cliTotals,
  cliVersion,
  featureTotals,
  userDetails,
} from './helpers/userDetailFixtures';

describe('userDetailCalculator CLI and Copilot App data', () => {
  it('stores Copilot App totals on the day entry', () => {
    const totals = {
      session_count: 1,
      request_count: 90,
      prompt_count: 0,
      token_usage: { avg_tokens_per_request: 138654.93, output_tokens_sum: 49838, prompt_tokens_sum: 12429106 },
    };
    expect(userDetails([{ totals_by_copilot_app: totals }]).days[0].totals_by_copilot_app).toEqual(totals);
  });

  it.each([
    {
      name: 'populated',
      totals: cliTotals({
        session_count: 5,
        request_count: 20,
        prompt_count: 15,
        token_usage: { output_tokens_sum: 1000, prompt_tokens_sum: 500, avg_tokens_per_request: 75 },
      }),
    },
    {
      name: 'zero-valued',
      totals: cliTotals({
        session_count: 0,
        request_count: 0,
        prompt_count: 0,
        token_usage: { output_tokens_sum: 0, prompt_tokens_sum: 0, avg_tokens_per_request: 0 },
      }),
    },
  ])('stores $name CLI totals on the day entry', ({ totals }) => {
    expect(userDetails([{ totals_by_cli: totals }]).days[0].totals_by_cli).toEqual(totals);
  });

  it('leaves CLI totals undefined when the metric has none', () => {
    expect(userDetails([{}]).days[0].totals_by_cli).toBeUndefined();
  });

  describe('CLI version history', () => {
    it.each([
      { name: 'no CLI totals', metric: {} },
      { name: 'CLI totals without a version', metric: { totals_by_cli: cliTotals() } },
    ])('is empty with $name', ({ metric }) => {
      expect(userDetails([metric]).cliVersions).toEqual([]);
    });

    it('records the last known CLI version', () => {
      const details = userDetails([{
        totals_by_cli: cliTotals({ last_known_cli_version: cliVersion('1.2.3', '2024-01-15T10:00:00Z') }),
      }]);
      expect(details.cliVersions).toEqual([{ cli_version: '1.2.3', sampled_at: '2024-01-15T10:00:00Z' }]);
    });

    it('deduplicates a repeated version, keeping the latest sample', () => {
      const details = userDetails([
        { day: '2024-01-10', totals_by_cli: cliTotals({ last_known_cli_version: cliVersion('1.0.0', '2024-01-10T08:00:00Z') }) },
        { day: '2024-01-15', totals_by_cli: cliTotals({ last_known_cli_version: cliVersion('1.0.0', '2024-01-15T12:00:00Z') }) },
      ]);
      expect(details.cliVersions).toEqual([{ cli_version: '1.0.0', sampled_at: '2024-01-15T12:00:00Z' }]);
    });

    it('keeps distinct versions sorted by most recent sample first', () => {
      const details = userDetails([
        { day: '2024-01-10', totals_by_cli: cliTotals({ last_known_cli_version: cliVersion('1.0.0', '2024-01-10T08:00:00Z') }) },
        { day: '2024-01-20', totals_by_cli: cliTotals({ last_known_cli_version: cliVersion('2.0.0', '2024-01-20T14:00:00Z') }) },
      ]);
      expect(details.cliVersions.map(v => v.cli_version)).toEqual(['2.0.0', '1.0.0']);
    });
  });

  describe('dailyCliImpact', () => {
    it('reports LOC from the copilot_cli feature', () => {
      const details = userDetails([{
        totals_by_cli: cliTotals(),
        totals_by_feature: [featureTotals('copilot_cli', { loc_added_sum: 100, loc_deleted_sum: 20 })],
      }]);
      expect(details.dailyCliImpact[0]).toMatchObject({ locAdded: 100, locDeleted: 20 });
    });

    it('reports no CLI LOC when only non-CLI features are present', () => {
      const details = userDetails([{
        totals_by_feature: [featureTotals('code_completion', { loc_added_sum: 200, loc_deleted_sum: 50 })],
      }]);
      expect(details.dailyCliImpact.filter(d => d.locAdded > 0 || d.locDeleted > 0)).toEqual([]);
    });
  });

  it('retains customization summaries independently of CLI flags, sessions, and other users', () => {
    const acc = accumulateUserDays([
      {
        used_cli: false,
        totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 5 }],
        distinct_skill_use_count: 3,
      },
      {
        user_id: 2,
        totals_by_skill: [{ skill: 'other', interaction_count: 100 }],
        distinct_skill_use_count: 4,
      },
    ]);

    const details = computeSingleUserDetailedMetrics(acc, 1)!;
    expect(details.cliCustomizations[0]).toMatchObject({
      observedInteractions: 5,
      averageDistinctItems: 3,
      legacyEntryCount: 1,
    });
    expect(details.days[0].totals_by_cli).toBeUndefined();
    expect(details.days[0]).not.toHaveProperty('totals_by_skill');
    expect(details.days[0].cliCustomizations?.[0]).toEqual({
      category: 'skill',
      observedInteractions: 5,
      distinctItems: 3,
      legacyEntryCount: 1,
      items: [{ name: 'other', interactionCount: 5, daysInvoked: 1, averagePerDay: 5 }],
    });
    expect(details.totalModelRequests).toBe(0);
    expect(computeSingleUserDetailedMetrics(acc, 2)!.cliCustomizations[0].observedInteractions).toBe(100);
  });
});

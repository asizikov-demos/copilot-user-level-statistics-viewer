import { describe, it, expect } from 'vitest';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import {
  accumulateUserDays,
  cliTotals,
  featureTotals,
  ideTotals,
  userDetails,
} from './helpers/userDetailFixtures';

const clientTotals = (sessions: number, prompts: number, requests: number) =>
  cliTotals({ session_count: sessions, prompt_count: prompts, request_count: requests });

describe('userDetailCalculator IDE and client aggregates', () => {
  it('builds IDE aggregates from a single metric', () => {
    const details = userDetails([{
      totals_by_ide: [ideTotals('vscode', { user_initiated_interaction_count: 50, loc_added_sum: 300 })],
    }]);
    expect(details.ideAggregates).toEqual([
      expect.objectContaining({ ide: 'vscode', user_initiated_interaction_count: 50, loc_added_sum: 300 }),
    ]);
    expect(details.days[0].totals_by_ide).toHaveLength(1);
  });

  it('records plugin versions reported on IDE totals', () => {
    const details = userDetails([{
      totals_by_ide: [ideTotals('vscode', {
        last_known_plugin_version: { plugin: 'copilot', plugin_version: '1.5.0', sampled_at: '2024-01-15T09:00:00Z' },
      })],
    }]);
    expect(details.pluginVersions).toEqual([
      expect.objectContaining({ plugin: 'copilot', plugin_version: '1.5.0' }),
    ]);
  });

  it('sums the same IDE across multiple days while keeping each day', () => {
    const details = userDetails([
      { day: '2024-01-10', totals_by_ide: [ideTotals('vscode', { user_initiated_interaction_count: 10, loc_added_sum: 50 })] },
      { day: '2024-01-20', totals_by_ide: [ideTotals('vscode', { user_initiated_interaction_count: 20, loc_added_sum: 100 })] },
    ]);
    expect(details.ideAggregates).toEqual([
      expect.objectContaining({ ide: 'vscode', user_initiated_interaction_count: 30, loc_added_sum: 150 }),
    ]);
    expect(details.days).toHaveLength(2);
  });

  it('allocates assumed completion interactions to IDE client aggregates', () => {
    const details = userDetails([{
      totals_by_feature: [featureTotals('code_completion', { code_generation_activity_count: 44 })],
      totals_by_ide: [
        ideTotals('vscode', { code_generation_activity_count: 30 }),
        ideTotals('jetbrains', { code_generation_activity_count: 14 }),
      ],
    }]);
    const assumed = (ide: string) =>
      details.ideAggregates.find(aggregate => aggregate.ide === ide)!.assumed_user_initiated_interaction_count;
    expect(assumed('vscode')).toBe(30);
    expect(assumed('jetbrains')).toBe(14);
    expect(details.days[0].totals_by_ide.reduce((sum, ide) => sum + (ide.assumed_user_initiated_interaction_count ?? 0), 0)).toBe(44);
  });

  it('computes client telemetry warnings per user, keeping historical risk after an upgrade', () => {
    const ideVersion = (ide_version: string) => ({ ide_version, sampled_at: '2026-10-07T00:00:00Z' });
    const acc = accumulateUserDays([
      { user_id: 1, totals_by_ide: [ideTotals('vscode', { last_known_ide_version: ideVersion('1.138.0') })] },
      { user_id: 1, totals_by_ide: [ideTotals('vscode', { last_known_ide_version: ideVersion('1.139.0') })] },
      { user_id: 2, totals_by_ide: [ideTotals('vscode', { last_known_ide_version: ideVersion('1.138.0') })] },
      { user_id: 3, totals_by_ide: [ideTotals('vscode', { last_known_ide_version: ideVersion('1.139.0') })] },
    ]);
    const details = computeSingleUserDetailedMetrics(acc, 1)!;
    expect(details.telemetryWarnings).toEqual([
      expect.objectContaining({ ide: 'vscode', version: '1.138.0', userCount: 1 }),
    ]);
    expect(details.days[0].totals_by_ide[0].last_known_ide_version).toEqual(ideVersion('1.138.0'));
    expect(computeSingleUserDetailedMetrics(acc, 3)!.telemetryWarnings).toEqual([]);
  });

  it('computes agent activity from the selected user\'s client totals only, ignoring flags and feature counts', () => {
    const acc = accumulateUserDays([
      { day: '2024-01-15', totals_by_cli: clientTotals(76, 76, 134) },
      {
        day: '2024-01-16',
        totals_by_cli: clientTotals(3, 7, 13),
        totals_by_vscode_agent: { session_count: 1, total_user_messages: 1 },
        totals_by_feature: [featureTotals('vscode_agent', { user_initiated_interaction_count: 500 })],
      },
      { day: '2024-01-17', totals_by_cli: clientTotals(2, 3, 12), used_copilot_app: true, used_agent: true },
      { user_id: 2, totals_by_copilot_app: clientTotals(100, 200, 300) },
    ]);
    expect(computeSingleUserDetailedMetrics(acc, 1)!.agentActivity.summary).toEqual({
      cli: { sessions: 81, userInputs: 86, requests: 159 },
      app: { sessions: null, userInputs: null, requests: null },
      vscodeAgents: { sessions: 1, userInputs: 1, requests: null },
    });
    expect(computeSingleUserDetailedMetrics(acc, 2)!.agentActivity.summary.app.sessions).toBe(100);
  });

  describe('VS Code Agents window', () => {
    it('keeps absent and explicit null source fields unavailable on day entries', () => {
      const acc = accumulateUserDays([
        {},
        { user_id: 2, used_vscode_agent: null, totals_by_vscode_agent: null },
      ]);
      expect(computeSingleUserDetailedMetrics(acc, 1)!.days[0].used_vscode_agent).toBeUndefined();
      expect(computeSingleUserDetailedMetrics(acc, 2)!.days[0].totals_by_vscode_agent).toBeNull();
    });

    it('computes per-user usage across days and logins', () => {
      const details = userDetails([
        { day: '2024-01-16', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 8 } },
        { day: '2024-01-15', user_login: 'renamed', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 3 } },
        { day: '2024-01-15', user_id: 2, used_vscode_agent: true, totals_by_vscode_agent: { session_count: 9 } },
      ]);
      expect(details.vscodeAgentUsage.summary).toMatchObject({
        activeUsers: 1, sessionCount: 5, userMessages: 8, recordCount: 2,
      });
      expect(details.vscodeAgentUsage.daily).toHaveLength(2);
    });

    it('copies Agents-window totals without mixing them into feature or IDE aggregates', () => {
      const totals = { session_count: 4, total_user_messages: 20 };
      const details = userDetails([{ totals_by_vscode_agent: totals }]);
      expect(details.featureAggregates).toEqual([]);
      expect(details.ideAggregates).toEqual([]);
      expect(details.days[0].totals_by_vscode_agent).toEqual(totals);
      expect(details.days[0].totals_by_vscode_agent).not.toBe(totals);
    });
  });
});

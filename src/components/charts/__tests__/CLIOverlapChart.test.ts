import { describe, expect, it } from 'vitest';
import type { IDEStatsData } from '../../../types/metrics';
import { getCliOverlapIdeRows } from '../CLIOverlapChart';

function makeIdeStats(overrides: Partial<IDEStatsData>): IDEStatsData {
  return {
    ide: 'vscode',
    uniqueUsers: 1,
    cliOverlapUsers: 0,
    totalEngagements: 0,
    totalGenerations: 0,
    totalAcceptances: 0,
    locAdded: 0,
    locDeleted: 0,
    locSuggestedToAdd: 0,
    locSuggestedToDelete: 0,
    ...overrides,
  };
}

describe('CLIOverlapChart', () => {
  it('omits the synthetic Copilot App client while retaining normal IDE rows', () => {
    const rows = getCliOverlapIdeRows([
      makeIdeStats({ ide: 'copilot_app', uniqueUsers: 8, cliOverlapUsers: 0 }),
      makeIdeStats({ ide: 'vscode', uniqueUsers: 10, cliOverlapUsers: 5 }),
      makeIdeStats({ ide: 'jetbrains', uniqueUsers: 4, cliOverlapUsers: 1 }),
      makeIdeStats({ ide: 'unused', uniqueUsers: 0, cliOverlapUsers: 0 }),
    ]);

    expect(rows.map(row => row.ide)).toEqual(['vscode', 'jetbrains']);
  });
});

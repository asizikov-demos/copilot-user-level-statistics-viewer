import type { IDEStatsData, UserDayData } from '../../types/metrics';
import { getTotalUserInitiatedInteractionCount } from '../assumedInteractions';
import type { CliDayTotals } from './cliUsageCalculator';

type IdeClientActivityLike = Pick<
  UserDayData['totals_by_ide'][number],
  | 'ide'
  | 'user_initiated_interaction_count'
  | 'assumed_user_initiated_interaction_count'
  | 'code_generation_activity_count'
  | 'code_acceptance_activity_count'
  | 'loc_added_sum'
  | 'loc_deleted_sum'
  | 'loc_suggested_to_add_sum'
  | 'loc_suggested_to_delete_sum'
>;

type CliClientActivityLike = Pick<
  CliDayTotals,
  | 'promptCount'
  | 'interactions'
  | 'generations'
  | 'acceptances'
  | 'locAdded'
  | 'locDeleted'
  | 'locSuggestedToAdd'
  | 'locSuggestedToDelete'
>;

export interface ClientActivityMetricsRow {
  ide: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

export function mapIdeClientActivityRows(ideRows: IdeClientActivityLike[]): ClientActivityMetricsRow[] {
  return ideRows.map((ide) => ({
    ide: ide.ide,
    user_initiated_interaction_count: getTotalUserInitiatedInteractionCount(ide),
    code_generation_activity_count: ide.code_generation_activity_count,
    code_acceptance_activity_count: ide.code_acceptance_activity_count,
    loc_added_sum: ide.loc_added_sum,
    loc_deleted_sum: ide.loc_deleted_sum,
    loc_suggested_to_add_sum: ide.loc_suggested_to_add_sum,
    loc_suggested_to_delete_sum: ide.loc_suggested_to_delete_sum,
  }));
}

export function createCliClientActivityRow(cliTotals: CliClientActivityLike): ClientActivityMetricsRow | null {
  const hasCliActivity = cliTotals.promptCount > 0 || cliTotals.interactions > 0;
  if (!hasCliActivity) {
    return null;
  }

  return {
    ide: 'copilot_cli',
    user_initiated_interaction_count: cliTotals.interactions > 0
      ? cliTotals.interactions
      : cliTotals.promptCount,
    code_generation_activity_count: cliTotals.generations,
    code_acceptance_activity_count: cliTotals.acceptances,
    loc_added_sum: cliTotals.locAdded,
    loc_deleted_sum: cliTotals.locDeleted,
    loc_suggested_to_add_sum: cliTotals.locSuggestedToAdd,
    loc_suggested_to_delete_sum: cliTotals.locSuggestedToDelete,
  };
}

export function appendCliClientStatsRow(
  ideStats: IDEStatsData[],
  cliSummary: {
    users: number;
    sessions: number;
    locAdded: number;
    locDeleted: number;
  },
): IDEStatsData[] {
  if (cliSummary.users <= 0) {
    return ideStats;
  }

  return [
    ...ideStats,
    {
      ide: 'copilot_cli',
      uniqueUsers: cliSummary.users,
      cliOverlapUsers: 0,
      totalEngagements: cliSummary.sessions,
      totalGenerations: 0,
      totalAcceptances: 0,
      locAdded: cliSummary.locAdded,
      locDeleted: cliSummary.locDeleted,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    },
  ];
}

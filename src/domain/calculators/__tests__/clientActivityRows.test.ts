import { describe, expect, it } from 'vitest';
import {
  appendCliClientStatsRow,
  createCliClientActivityRow,
  mapIdeClientActivityRows,
} from '../clientActivityRows';

describe('clientActivityRows', () => {
  describe('mapIdeClientActivityRows', () => {
    it('maps IDE metrics and includes assumed interaction fallback in interaction count', () => {
      const rows = mapIdeClientActivityRows([
        {
          ide: 'vscode',
          user_initiated_interaction_count: 2,
          assumed_user_initiated_interaction_count: 3,
          code_generation_activity_count: 4,
          code_acceptance_activity_count: 5,
          loc_added_sum: 6,
          loc_deleted_sum: 7,
          loc_suggested_to_add_sum: 8,
          loc_suggested_to_delete_sum: 9,
        },
      ]);

      expect(rows).toEqual([
        {
          ide: 'vscode',
          user_initiated_interaction_count: 5,
          code_generation_activity_count: 4,
          code_acceptance_activity_count: 5,
          loc_added_sum: 6,
          loc_deleted_sum: 7,
          loc_suggested_to_add_sum: 8,
          loc_suggested_to_delete_sum: 9,
        },
      ]);
    });
  });

  describe('createCliClientActivityRow', () => {
    it('uses prompt count fallback when CLI feature interactions are zero', () => {
      const row = createCliClientActivityRow({
        promptCount: 11,
        interactions: 0,
        generations: 1,
        acceptances: 2,
        locAdded: 3,
        locDeleted: 4,
        locSuggestedToAdd: 5,
        locSuggestedToDelete: 6,
      });

      expect(row).toEqual({
        ide: 'copilot_cli',
        user_initiated_interaction_count: 11,
        code_generation_activity_count: 1,
        code_acceptance_activity_count: 2,
        loc_added_sum: 3,
        loc_deleted_sum: 4,
        loc_suggested_to_add_sum: 5,
        loc_suggested_to_delete_sum: 6,
      });
    });

    it('uses CLI feature interactions when both interactions and prompt count exist', () => {
      const row = createCliClientActivityRow({
        promptCount: 11,
        interactions: 7,
        generations: 1,
        acceptances: 2,
        locAdded: 3,
        locDeleted: 4,
        locSuggestedToAdd: 5,
        locSuggestedToDelete: 6,
      });

      expect(row).toEqual({
        ide: 'copilot_cli',
        user_initiated_interaction_count: 7,
        code_generation_activity_count: 1,
        code_acceptance_activity_count: 2,
        loc_added_sum: 3,
        loc_deleted_sum: 4,
        loc_suggested_to_add_sum: 5,
        loc_suggested_to_delete_sum: 6,
      });
    });

    it('returns null when CLI has no prompt or feature interaction activity', () => {
      const row = createCliClientActivityRow({
        promptCount: 0,
        interactions: 0,
        generations: 0,
        acceptances: 0,
        locAdded: 0,
        locDeleted: 0,
        locSuggestedToAdd: 0,
        locSuggestedToDelete: 0,
      });

      expect(row).toBeNull();
    });
  });

  describe('appendCliClientStatsRow', () => {
    it('appends a synthetic CLI stats row when CLI users exist', () => {
      const rows = appendCliClientStatsRow(
        [{
          ide: 'vscode',
          uniqueUsers: 2,
          cliOverlapUsers: 1,
          totalEngagements: 3,
          totalGenerations: 4,
          totalAcceptances: 5,
          locAdded: 6,
          locDeleted: 7,
          locSuggestedToAdd: 8,
          locSuggestedToDelete: 9,
        }],
        { users: 10, sessions: 11, locAdded: 12, locDeleted: 13 },
      );

      expect(rows[1]).toEqual({
        ide: 'copilot_cli',
        uniqueUsers: 10,
        cliOverlapUsers: 0,
        totalEngagements: 11,
        totalGenerations: 0,
        totalAcceptances: 0,
        locAdded: 12,
        locDeleted: 13,
        locSuggestedToAdd: 0,
        locSuggestedToDelete: 0,
      });
    });

    it('does not append CLI row when there are no CLI users', () => {
      const input = [{
        ide: 'vscode',
        uniqueUsers: 2,
        cliOverlapUsers: 1,
        totalEngagements: 3,
        totalGenerations: 4,
        totalAcceptances: 5,
        locAdded: 6,
        locDeleted: 7,
        locSuggestedToAdd: 8,
        locSuggestedToDelete: 9,
      }];

      const rows = appendCliClientStatsRow(
        input,
        { users: 0, sessions: 11, locAdded: 12, locDeleted: 13 },
      );

      expect(rows).toBe(input);
    });
  });
});

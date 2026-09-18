import { describe, expect, it } from 'vitest';
import {
  accumulateCliCustomizations,
  computeCliCustomizations,
  computeDailyCliCustomizations,
  createCliCustomizationAccumulator,
} from '../cliCustomizationCalculator';
import type { CliCustomizationFields } from '../../../types/cliCustomizations';

function summarize(...records: (CliCustomizationFields & { day?: string })[]) {
  const accumulator = createCliCustomizationAccumulator();
  records.forEach((record, index) => accumulateCliCustomizations(accumulator, {
    day: `2024-01-${String(index + 1).padStart(2, '0')}`,
    ...record,
  }));
  return computeCliCustomizations(accumulator);
}

describe('CLI customization summaries', () => {
  it('produces independent daily counts without treating hidden names as single distinct items', () => {
    const firstDay = computeDailyCliCustomizations({
      day: '2024-01-01',
      totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 9 }],
      distinct_skill_use_count: 65,
      totals_by_mcp: [{ mcp: 'other', interaction_count: 0, user_initiated_interaction_count: 12 }],
      distinct_mcp_use_count: 0,
    });
    expect(firstDay[0]).toEqual({
      category: 'skill',
      observedInteractions: 9,
      distinctItems: 65,
      legacyEntryCount: 1,
      items: [{ name: 'other', interactionCount: 9, daysInvoked: 1, averagePerDay: 9 }],
    });
    expect(firstDay[2]).toMatchObject({ observedInteractions: 0, distinctItems: 0, legacyEntryCount: 0 });
    expect(firstDay[2].items).toEqual([{ name: 'other', interactionCount: 0, daysInvoked: 0, averagePerDay: null }]);
    expect(firstDay[1]).toMatchObject({ observedInteractions: null, distinctItems: null, items: [] });

    const nextDay = computeDailyCliCustomizations({ day: '2024-01-02', totals_by_skill: [], distinct_skill_use_count: 0 });
    expect(nextDay[0]).toMatchObject({ observedInteractions: 0, distinctItems: 0, items: [] });
    expect(firstDay[0].items).toEqual([{ name: 'other', interactionCount: 9, daysInvoked: 1, averagePerDay: 9 }]);
  });

  it('keeps absent and null fields unavailable rather than reporting zero', () => {
    const summaries = summarize({}, { totals_by_skill: null, distinct_skill_use_count: null });
    for (const summary of summaries) {
      expect(summary).toMatchObject({
        recordCount: 2,
        entriesReportedRecords: 0,
        distinctReportedRecords: 0,
        observedInteractions: null,
        averageDistinctItems: null,
        summedDailyDistinctItems: null,
        activeRecords: null,
        items: [],
      });
    }
  });

  it('preserves explicit zero and independent list/count coverage', () => {
    const summaries = summarize(
      { totals_by_skill: [], distinct_custom_agent_use_count: 0 },
      { distinct_skill_use_count: 0, totals_by_custom_agent: [] },
      {},
    );
    for (const category of ['skill', 'custom_agent']) {
      expect(summaries.find(summary => summary.category === category)).toMatchObject({
        recordCount: 3,
        entriesReportedRecords: 1,
        distinctReportedRecords: 1,
        observedInteractions: 0,
        averageDistinctItems: 0,
        summedDailyDistinctItems: 0,
        activeRecords: 0,
      });
    }
  });

  it('combines count aliases without double counting and preserves a modern zero', () => {
    const [skills] = summarize(
      { totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 10 }], distinct_skill_use_count: 65 },
      { totals_by_skill: [{ skill: 'other', interaction_count: 0, user_initiated_interaction_count: 20 }], distinct_skill_use_count: 0 },
      { totals_by_skill: [{ skill: 'other', interaction_count: 4, user_initiated_interaction_count: 30 }], distinct_skill_use_count: 1 },
      {},
    );
    expect(skills).toEqual({
      category: 'skill',
      recordCount: 4,
      entriesReportedRecords: 3,
      distinctReportedRecords: 3,
      observedInteractions: 14,
      activeRecords: 2,
      averageDistinctItems: 22,
      summedDailyDistinctItems: 66,
      legacyEntryCount: 1,
      items: [{ name: 'other', interactionCount: 14, daysInvoked: 2, averagePerDay: 7 }],
    });
  });

  it('uses each category name field and never combines their event counts', () => {
    const summaries = summarize({
      totals_by_custom_agent: [{ custom_agent: 'reviewer', interaction_count: 4 }],
      totals_by_mcp: [{ mcp: 'other', user_initiated_interaction_count: 12 }],
      totals_by_slash_cmd: [{ slash_cmd: 'custom', interaction_count: 3 }],
      distinct_custom_agent_use_count: 1,
      distinct_mcp_use_count: 9,
      distinct_slash_cmd_use_count: 2,
    });

    expect(summaries.map(summary => summary.observedInteractions)).toEqual([null, 4, 12, 3]);
    expect(summaries.map(summary => summary.summedDailyDistinctItems)).toEqual([null, 1, 9, 2]);
    expect(summaries.map(summary => summary.items.map(item => item.name))).toEqual([
      [], ['reviewer'], ['other'], ['custom'],
    ]);
  });

  it('counts distinct positive-activity dates per item, excluding zero and missing days', () => {
    const summaries = summarize(
      { day: '2024-01-01', totals_by_skill: [
        { skill: 'review', interaction_count: 2 },
        { skill: 'review', user_initiated_interaction_count: 3 },
      ] },
      { day: '2024-01-01', totals_by_skill: [{ skill: 'review', interaction_count: 1 }] },
      { day: '2024-01-02', totals_by_skill: [
        { skill: 'review', interaction_count: 5 },
        { skill: 'zero', interaction_count: 0 },
      ], totals_by_custom_agent: [{ custom_agent: 'review', interaction_count: 20 }] },
      { day: '2024-01-03', totals_by_skill: [{ skill: 'review', interaction_count: 0, user_initiated_interaction_count: 99 }] },
      {},
      { totals_by_skill: null },
    );
    expect(summaries[0].items).toEqual([
      { name: 'review', interactionCount: 11, daysInvoked: 2, averagePerDay: 5.5 },
      { name: 'zero', interactionCount: 0, daysInvoked: 0, averagePerDay: null },
    ]);
    expect(summaries[1].items).toEqual([
      { name: 'review', interactionCount: 20, daysInvoked: 1, averagePerDay: 20 },
    ]);
  });

  it('retains the union of supplied entries, sorts counts, and breaks ties by name', () => {
    const summaries = summarize(
      { totals_by_custom_agent: [
        { custom_agent: 'z', interaction_count: 2 },
        { custom_agent: 'b', interaction_count: 3 },
        { custom_agent: 'a', interaction_count: 3 },
        { custom_agent: 'c', interaction_count: 1 },
        { custom_agent: 'd', interaction_count: 1 },
      ] },
      { totals_by_custom_agent: [
        { custom_agent: 'z', interaction_count: 4 },
        { custom_agent: 'e', interaction_count: 1 },
      ] },
    );
    expect(summaries[1].items.map(item => item.name)).toEqual(['z', 'a', 'b', 'c', 'd', 'e']);
    expect(summaries[1].observedInteractions).toBe(15);
    expect(summaries[1].averageDistinctItems).toBeNull();
  });

  it.each([undefined, -1, NaN, Infinity, 1.5])('surfaces invalid event counts (%s)', value => {
    expect(() => summarize({ totals_by_skill: [{ skill: 'other', interaction_count: value }] }))
      .toThrow('Invalid CLI customization count');
  });
});

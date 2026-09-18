import {
  CLI_CUSTOMIZATION_CATEGORIES,
  type CliCustomizationCategory,
  type CliCustomizationCounts,
  type CliCustomizationDaySummary,
  type CliCustomizationFields,
  type CliCustomizationSummary,
} from '../../types/cliCustomizations';

interface CategoryAccumulator {
  recordCount: number;
  entriesReportedRecords: number;
  distinctReportedRecords: number;
  activeRecords: number;
  distinctSum: number;
  observedInteractions: number;
  legacyEntryCount: number;
  items: Map<string, { interactionCount: number; activeDays: Set<string> }>;
}

export type CliCustomizationAccumulator = Record<CliCustomizationCategory, CategoryAccumulator>;

function createCategoryAccumulator(): CategoryAccumulator {
  return {
    recordCount: 0,
    entriesReportedRecords: 0,
    distinctReportedRecords: 0,
    activeRecords: 0,
    distinctSum: 0,
    observedInteractions: 0,
    legacyEntryCount: 0,
    items: new Map(),
  };
}

export function createCliCustomizationAccumulator(): CliCustomizationAccumulator {
  return {
    skill: createCategoryAccumulator(),
    custom_agent: createCategoryAccumulator(),
    mcp: createCategoryAccumulator(),
    slash_cmd: createCategoryAccumulator(),
  };
}

function requireCount(value: number | null | undefined): number {
  if (value == null || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid CLI customization count: expected a nonnegative integer.');
  }
  return value;
}

function accumulateCategory<Entry extends CliCustomizationCounts>(
  accumulator: CategoryAccumulator,
  entries: Entry[] | null | undefined,
  distinctCount: number | null | undefined,
  day: string,
  getName: (entry: Entry) => string,
): void {
  accumulator.recordCount++;
  if (distinctCount != null) {
    const count = requireCount(distinctCount);
    accumulator.distinctReportedRecords++;
    accumulator.distinctSum += count;
    if (count > 0) accumulator.activeRecords++;
  }
  if (entries == null) return;

  accumulator.entriesReportedRecords++;
  for (const entry of entries) {
    // Older exports used this alias; a reported modern zero must take precedence.
    const count = requireCount(entry.interaction_count ?? entry.user_initiated_interaction_count);
    if (entry.interaction_count == null) accumulator.legacyEntryCount++;
    const name = getName(entry);
    let item = accumulator.items.get(name);
    if (!item) {
      item = { interactionCount: 0, activeDays: new Set() };
      accumulator.items.set(name, item);
    }
    item.interactionCount += count;
    if (count > 0) item.activeDays.add(day);
    accumulator.observedInteractions += count;
  }
}

export function accumulateCliCustomizations(
  accumulator: CliCustomizationAccumulator,
  metric: CliCustomizationFields & { day: string },
): void {
  accumulateCategory(accumulator.skill, metric.totals_by_skill, metric.distinct_skill_use_count, metric.day, entry => entry.skill);
  accumulateCategory(accumulator.custom_agent, metric.totals_by_custom_agent, metric.distinct_custom_agent_use_count, metric.day, entry => entry.custom_agent);
  accumulateCategory(accumulator.mcp, metric.totals_by_mcp, metric.distinct_mcp_use_count, metric.day, entry => entry.mcp);
  accumulateCategory(accumulator.slash_cmd, metric.totals_by_slash_cmd, metric.distinct_slash_cmd_use_count, metric.day, entry => entry.slash_cmd);
}

export function computeCliCustomizations(
  accumulator: CliCustomizationAccumulator,
): CliCustomizationSummary[] {
  return CLI_CUSTOMIZATION_CATEGORIES.map(category => {
    const state = accumulator[category];
    return {
      category,
      recordCount: state.recordCount,
      entriesReportedRecords: state.entriesReportedRecords,
      distinctReportedRecords: state.distinctReportedRecords,
      activeRecords: state.distinctReportedRecords > 0 ? state.activeRecords : null,
      summedDailyDistinctItems: state.distinctReportedRecords > 0 ? state.distinctSum : null,
      averageDistinctItems: state.distinctReportedRecords > 0
        ? state.distinctSum / state.distinctReportedRecords
        : null,
      observedInteractions: state.entriesReportedRecords > 0 ? state.observedInteractions : null,
      legacyEntryCount: state.legacyEntryCount,
      items: Array.from(state.items, ([name, item]) => ({
        name,
        interactionCount: item.interactionCount,
        daysInvoked: item.activeDays.size,
        averagePerDay: item.activeDays.size > 0 ? item.interactionCount / item.activeDays.size : null,
      }))
        .sort((a, b) => b.interactionCount - a.interactionCount || a.name.localeCompare(b.name)),
    };
  });
}

export function computeDailyCliCustomizations(
  metric: CliCustomizationFields & { day: string },
): CliCustomizationDaySummary[] {
  const accumulator = createCliCustomizationAccumulator();
  accumulateCliCustomizations(accumulator, metric);
  return computeCliCustomizations(accumulator).map(summary => ({
    category: summary.category,
    observedInteractions: summary.observedInteractions,
    distinctItems: summary.averageDistinctItems,
    legacyEntryCount: summary.legacyEntryCount,
    items: summary.items,
  }));
}

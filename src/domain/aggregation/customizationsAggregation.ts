import type { CopilotMetrics } from '../../types/metrics';
import {
  CUSTOMIZATION_TYPES,
  UNNAMED_CUSTOMIZATION_NAMES,
  type CustomizationItemStats,
  type CustomizationType,
  type CustomizationsMetricsSlice,
} from '../../types/customizationsOverview';

const TOP_USERS_PER_ITEM = 10;

interface ItemAccumulator {
  total: number;
  dailyEvents: Map<string, number>;
  userEvents: Map<string, number>;
}

export interface CustomizationsAggregationAccumulator {
  dates: Set<string>;
  items: Record<CustomizationType, Map<string, ItemAccumulator>>;
  users: Record<CustomizationType, Set<string>>;
}

export type CustomizationsAggregationResult = CustomizationsMetricsSlice;

function byType<T>(create: () => T): Record<CustomizationType, T> {
  return Object.fromEntries(CUSTOMIZATION_TYPES.map((type) => [type, create()])) as Record<CustomizationType, T>;
}

export function createCustomizationsAggregationAccumulator(): CustomizationsAggregationAccumulator {
  return {
    dates: new Set(),
    items: byType(() => new Map()),
    users: byType(() => new Set()),
  };
}

export function accumulateCustomizationsAggregation(
  accumulator: CustomizationsAggregationAccumulator,
  metric: CopilotMetrics
): void {
  accumulator.dates.add(metric.day);

  for (const type of CUSTOMIZATION_TYPES) {
    const entries = metric[`totals_by_${type}`];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as Array<Record<string, unknown>>) {
      const name = entry[type];
      if (typeof name !== 'string') continue;
      const events = Number(entry.interaction_count ?? 0) || 0;

      let item = accumulator.items[type].get(name);
      if (!item) {
        item = { total: 0, dailyEvents: new Map(), userEvents: new Map() };
        accumulator.items[type].set(name, item);
      }
      item.total += events;
      item.dailyEvents.set(metric.day, (item.dailyEvents.get(metric.day) ?? 0) + events);
      item.userEvents.set(metric.user_login, (item.userEvents.get(metric.user_login) ?? 0) + events);
      accumulator.users[type].add(metric.user_login);
    }
  }
}

export function finalizeCustomizationsAggregation(
  accumulator: CustomizationsAggregationAccumulator
): CustomizationsAggregationResult {
  const dates = [...accumulator.dates].sort();

  const types = {} as CustomizationsMetricsSlice['types'];
  for (const type of CUSTOMIZATION_TYPES) {
    const items: CustomizationItemStats[] = [...accumulator.items[type].entries()]
      .map(([name, item]) => ({
        name,
        unnamed: UNNAMED_CUSTOMIZATION_NAMES.has(name),
        totalEvents: item.total,
        users: item.userEvents.size,
        activeDays: [...item.dailyEvents.values()].filter((events) => events > 0).length,
        dailyEvents: dates.map((date) => item.dailyEvents.get(date) ?? 0),
        topUsers: [...item.userEvents.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, TOP_USERS_PER_ITEM)
          .map(([login, events]) => ({ login, events })),
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents || a.name.localeCompare(b.name));

    types[type] = {
      type,
      totalEvents: items.reduce((sum, item) => sum + item.totalEvents, 0),
      unnamedEvents: items.filter((item) => item.unnamed).reduce((sum, item) => sum + item.totalEvents, 0),
      users: accumulator.users[type].size,
      items,
    };
  }

  return { dates, types };
}

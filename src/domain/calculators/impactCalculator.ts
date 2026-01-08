import { CopilotMetrics } from '../../types/metrics';

export interface ImpactData {
  date: string;
  locAdded: number;
  locDeleted: number;
  netChange: number;
  userCount: number;
  totalUniqueUsers: number;
}

export type AgentImpactData = ImpactData;
export type CodeCompletionImpactData = ImpactData;
export type ModeImpactData = ImpactData;

export interface ImpactAccumulator {
  dailyAgentImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  dailyCodeCompletionImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  dailyEditModeImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  dailyInlineModeImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  dailyAskModeImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  dailyJoinedImpact: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>;
  allUniqueUsers: Set<number>;
}

const JOINED_FEATURES = [
  'code_completion',
  'chat_panel_ask_mode',
  'chat_panel_edit_mode',
  'chat_inline',
  'chat_panel_agent_mode',
  'agent_edit',
];

export function createImpactAccumulator(): ImpactAccumulator {
  return {
    dailyAgentImpact: new Map(),
    dailyCodeCompletionImpact: new Map(),
    dailyEditModeImpact: new Map(),
    dailyInlineModeImpact: new Map(),
    dailyAskModeImpact: new Map(),
    dailyJoinedImpact: new Map(),
    allUniqueUsers: new Set(),
  };
}

function ensureImpactDate(
  map: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>,
  date: string
): void {
  if (!map.has(date)) {
    map.set(date, { locAdded: 0, locDeleted: 0, userIds: new Set() });
  }
}

function accumulateToMap(
  map: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>,
  date: string,
  userId: number,
  locAdded: number,
  locDeleted: number
): void {
  ensureImpactDate(map, date);
  const data = map.get(date)!;
  data.locAdded += locAdded;
  data.locDeleted += locDeleted;
  data.userIds.add(userId);
}

export function ensureImpactDates(accumulator: ImpactAccumulator, date: string): void {
  ensureImpactDate(accumulator.dailyAgentImpact, date);
  ensureImpactDate(accumulator.dailyCodeCompletionImpact, date);
  ensureImpactDate(accumulator.dailyEditModeImpact, date);
  ensureImpactDate(accumulator.dailyInlineModeImpact, date);
  ensureImpactDate(accumulator.dailyAskModeImpact, date);
  ensureImpactDate(accumulator.dailyJoinedImpact, date);
}

export interface FeatureImpactInput {
  feature: string;
  locAdded: number;
  locDeleted: number;
}

export function accumulateFeatureImpacts(
  accumulator: ImpactAccumulator,
  date: string,
  userId: number,
  features: FeatureImpactInput[]
): void {
  accumulator.allUniqueUsers.add(userId);

  let agentLocAdded = 0;
  let agentLocDeleted = 0;
  let hasAgentActivity = false;

  let joinedLocAdded = 0;
  let joinedLocDeleted = 0;
  let hasJoinedActivity = false;

  for (const { feature, locAdded, locDeleted } of features) {
    const hasLoc = locAdded > 0 || locDeleted > 0;

    if (feature === 'agent_edit' || feature === 'chat_panel_agent_mode') {
      if (hasLoc) {
        agentLocAdded += locAdded;
        agentLocDeleted += locDeleted;
        hasAgentActivity = true;
      }
    }

    if (feature === 'code_completion' && hasLoc) {
      accumulateToMap(
        accumulator.dailyCodeCompletionImpact,
        date,
        userId,
        locAdded,
        locDeleted
      );
    }

    if (feature === 'chat_panel_edit_mode' && hasLoc) {
      accumulateToMap(
        accumulator.dailyEditModeImpact,
        date,
        userId,
        locAdded,
        locDeleted
      );
    }

    if (feature === 'chat_inline' && hasLoc) {
      accumulateToMap(
        accumulator.dailyInlineModeImpact,
        date,
        userId,
        locAdded,
        locDeleted
      );
    }

    if (feature === 'chat_panel_ask_mode' && hasLoc) {
      accumulateToMap(
        accumulator.dailyAskModeImpact,
        date,
        userId,
        locAdded,
        locDeleted
      );
    }

    if (JOINED_FEATURES.includes(feature) && hasLoc) {
      joinedLocAdded += locAdded;
      joinedLocDeleted += locDeleted;
      hasJoinedActivity = true;
    }
  }

  if (hasAgentActivity) {
    accumulateToMap(
      accumulator.dailyAgentImpact,
      date,
      userId,
      agentLocAdded,
      agentLocDeleted
    );
  }

  if (hasJoinedActivity) {
    accumulateToMap(
      accumulator.dailyJoinedImpact,
      date,
      userId,
      joinedLocAdded,
      joinedLocDeleted
    );
  }
}

function formatImpactMap(
  map: Map<string, { locAdded: number; locDeleted: number; userIds: Set<number> }>,
  totalUniqueUsers: number
): ImpactData[] {
  return Array.from(map.entries())
    .map(([date, data]) => ({
      date,
      locAdded: data.locAdded,
      locDeleted: data.locDeleted,
      netChange: data.locAdded - data.locDeleted,
      userCount: data.userIds.size,
      totalUniqueUsers,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeAgentImpactData(accumulator: ImpactAccumulator): AgentImpactData[] {
  return formatImpactMap(accumulator.dailyAgentImpact, accumulator.allUniqueUsers.size);
}

export function computeCodeCompletionImpactData(
  accumulator: ImpactAccumulator
): CodeCompletionImpactData[] {
  return formatImpactMap(accumulator.dailyCodeCompletionImpact, accumulator.allUniqueUsers.size);
}

export function computeEditModeImpactData(accumulator: ImpactAccumulator): ModeImpactData[] {
  return formatImpactMap(accumulator.dailyEditModeImpact, accumulator.allUniqueUsers.size);
}

export function computeInlineModeImpactData(accumulator: ImpactAccumulator): ModeImpactData[] {
  return formatImpactMap(accumulator.dailyInlineModeImpact, accumulator.allUniqueUsers.size);
}

export function computeAskModeImpactData(accumulator: ImpactAccumulator): ModeImpactData[] {
  return formatImpactMap(accumulator.dailyAskModeImpact, accumulator.allUniqueUsers.size);
}

export function computeJoinedImpactData(accumulator: ImpactAccumulator): ModeImpactData[] {
  return formatImpactMap(accumulator.dailyJoinedImpact, accumulator.allUniqueUsers.size);
}

function processMetricsForImpact(metrics: CopilotMetrics[]): ImpactAccumulator {
  const accumulator = createImpactAccumulator();

  for (const metric of metrics) {
    const date = metric.day;
    const userId = metric.user_id;

    ensureImpactDates(accumulator, date);

    const featureImpacts: FeatureImpactInput[] = metric.totals_by_feature.map(f => ({
      feature: f.feature,
      locAdded: f.loc_added_sum || 0,
      locDeleted: f.loc_deleted_sum || 0,
    }));

    accumulateFeatureImpacts(accumulator, date, userId, featureImpacts);
  }

  return accumulator;
}

export function calculateJoinedImpactFromMetrics(metrics: CopilotMetrics[]): ModeImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeJoinedImpactData(accumulator);
}

export function calculateEditModeImpactFromMetrics(metrics: CopilotMetrics[]): ModeImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeEditModeImpactData(accumulator);
}

export function calculateInlineModeImpactFromMetrics(metrics: CopilotMetrics[]): ModeImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeInlineModeImpactData(accumulator);
}

export function calculateAskModeImpactFromMetrics(metrics: CopilotMetrics[]): ModeImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeAskModeImpactData(accumulator);
}

export function calculateAgentImpactFromMetrics(metrics: CopilotMetrics[]): AgentImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeAgentImpactData(accumulator);
}

export function calculateCodeCompletionImpactFromMetrics(metrics: CopilotMetrics[]): CodeCompletionImpactData[] {
  const accumulator = processMetricsForImpact(metrics);
  return computeCodeCompletionImpactData(accumulator);
}

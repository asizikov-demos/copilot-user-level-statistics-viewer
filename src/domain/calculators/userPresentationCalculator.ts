import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import type { UserDayData } from '../../types/metrics';
import type { ClientModelTraffic, ClientTrafficSummary } from '../../types/clientTraffic';
import { getTotalUserInitiatedInteractionCount } from '../assumedInteractions';
import { isCliFeature } from '../featureCategories';
import { padReportRangeWithDefaults } from '../../utils/timeSeries';
import { computeCliDayTotals } from './cliUsageCalculator';
import {
  createCliClientActivityRow,
  getClientActivityKey,
  mapIdeClientActivityRows,
  type ClientActivityMetricsRow,
} from './clientActivityRows';
import type { DailyAiCreditsData } from './aiCreditsCalculator';

type DetailsInput = Pick<UserDetailedMetrics,
  'days' | 'featureAggregates' | 'ideAggregates' | 'languageFeatureAggregates'
  | 'modelFeatureAggregates' | 'clientTraffic' | 'reportStartDay' | 'reportEndDay'>;

export interface UserClientRow {
  ide: string;
  activity?: ClientActivityMetricsRow;
  traffic?: Pick<ClientTrafficSummary, 'reportedSessionCount' | 'requestCount' | 'promptTokens' | 'outputTokens'>;
}

export interface UserClientActivitySummary {
  rows: UserClientRow[];
  dates: string[];
  interactions: Array<{ client: string; values: number[] }>;
}

export interface UserModelActivitySummary {
  rows: Array<ClientModelTraffic & { client: string }>;
  dates: string[];
  requests: Array<{ model: string; values: Array<number | null> }>;
}

export interface UserPresentationSummary {
  totalCliPrompts: number;
  featureInteractions: Record<string, number>;
  clientInteractions: Array<{ key: string; value: number }>;
  clientRequests: Array<{ key: string; value: number }>;
  languageGenerations: Array<{ key: string; value: number }>;
  modelInteractions: Array<{ key: string; value: number }>;
  modelRequests: Array<{ key: string; value: number }>;
  dailyAiCredits: DailyAiCreditsData[];
  clientActivity: UserClientActivitySummary;
  modelActivity: UserModelActivitySummary;
}

const ranked = (totals: Map<string, number>) =>
  Array.from(totals, ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

export function computeUserModelActivity(
  details: Pick<DetailsInput, 'clientTraffic' | 'reportStartDay' | 'reportEndDay'>,
): UserModelActivitySummary {
  const { clientTraffic, reportStartDay, reportEndDay } = details;
  const rows = clientTraffic.summary.clients.flatMap(client =>
    client.models.map(model => ({ ...model, client: client.client })),
  ).sort((a, b) => b.requestCount - a.requestCount
    || a.model.localeCompare(b.model)
    || a.client.localeCompare(b.client)
    || a.modelSelectionMode.localeCompare(b.modelSelectionMode));
  const models = [...new Set(rows.map(row => row.model))].sort();
  const daily = clientTraffic.daily.map(day => {
    const totals = new Map<string, number>();
    for (const client of day.clients) {
      for (const model of client.models) {
        totals.set(model.model, (totals.get(model.model) ?? 0) + model.requestCount);
      }
    }
    return { day: day.day, reported: day.reportedRecords > 0, totals };
  });
  const padded = padReportRangeWithDefaults(
    daily, reportStartDay, reportEndDay, day => day.day,
    day => ({ day, reported: false, totals: new Map<string, number>() }),
  );
  return {
    rows,
    dates: padded.map(day => day.day),
    requests: models.map(model => ({
      model,
      values: padded.map(day => day.reported ? day.totals.get(model) ?? 0 : null),
    })).filter(series => series.values.some(value => value !== null && value > 0)),
  };
}

export function computeUserClientActivity(
  details: Pick<DetailsInput, 'days' | 'clientTraffic' | 'reportStartDay' | 'reportEndDay'> & {
    ideAggregates: Parameters<typeof mapIdeClientActivityRows>[0];
  },
): UserClientActivitySummary {
  const { days, ideAggregates, clientTraffic, reportStartDay, reportEndDay } = details;
  const totals = {
    promptCount: 0, interactions: 0, generations: 0, acceptances: 0,
    locAdded: 0, locDeleted: 0, locSuggestedToAdd: 0, locSuggestedToDelete: 0,
  };
  const cliByDay = new Map<string, number>();
  const clients = new Set<string>();
  let hasCli = false;
  for (const day of days) {
    const cli = computeCliDayTotals(day);
    cliByDay.set(day.day, cli.interactionCount);
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) totals[key] += cli[key];
    hasCli ||= day.totals_by_cli != null || day.totals_by_feature.some(feature => isCliFeature(feature.feature));
    for (const ide of day.totals_by_ide) clients.add(ide.ide);
  }
  const padded = padReportRangeWithDefaults<Pick<UserDayData, 'day' | 'totals_by_ide'>>(
    days, reportStartDay, reportEndDay, day => day.day,
    day => ({ day, totals_by_ide: [] }),
  );
  const interactions = [...clients].sort().map(client => ({
    client,
    values: padded.map(day => {
      const ide = day.totals_by_ide.find(ide => ide.ide === client);
      return ide ? getTotalUserInitiatedInteractionCount(ide) : 0;
    }),
  })).filter(series => series.values.some(value => value > 0));
  if ([...cliByDay.values()].some(value => value > 0)) {
    interactions.push({ client: 'copilot_cli', values: padded.map(day => cliByDay.get(day.day) ?? 0) });
  }

  const rows = new Map<string, UserClientRow>();
  const cliRow = createCliClientActivityRow(totals, hasCli);
  for (const activity of [...mapIdeClientActivityRows(ideAggregates), ...(cliRow ? [cliRow] : [])]) {
    const key = getClientActivityKey(activity.ide);
    const existing = rows.get(key)?.activity;
    rows.set(key, { ide: key, activity: existing && key === 'copilot_app' ? {
      ide: key,
      user_initiated_interaction_count: existing.user_initiated_interaction_count + activity.user_initiated_interaction_count,
      code_generation_activity_count: existing.code_generation_activity_count + activity.code_generation_activity_count,
      code_acceptance_activity_count: existing.code_acceptance_activity_count + activity.code_acceptance_activity_count,
      loc_added_sum: existing.loc_added_sum + activity.loc_added_sum,
      loc_deleted_sum: existing.loc_deleted_sum + activity.loc_deleted_sum,
      loc_suggested_to_add_sum: existing.loc_suggested_to_add_sum + activity.loc_suggested_to_add_sum,
      loc_suggested_to_delete_sum: existing.loc_suggested_to_delete_sum + activity.loc_suggested_to_delete_sum,
    } : activity });
  }
  if (clientTraffic.summary.reportedRecords > 0) {
    for (const client of clientTraffic.summary.clients) {
      const key = getClientActivityKey(client.client);
      const existing = rows.get(key);
      rows.set(key, { ...existing, ide: key, traffic: {
        reportedSessionCount: (existing?.traffic?.reportedSessionCount ?? 0) + client.reportedSessionCount,
        requestCount: (existing?.traffic?.requestCount ?? 0) + client.requestCount,
        promptTokens: (existing?.traffic?.promptTokens ?? 0) + client.promptTokens,
        outputTokens: (existing?.traffic?.outputTokens ?? 0) + client.outputTokens,
      } });
    }
  }
  return {
    rows: [...rows.values()].sort((a, b) =>
      (b.activity?.user_initiated_interaction_count ?? 0) - (a.activity?.user_initiated_interaction_count ?? 0)
      || (b.traffic?.reportedSessionCount ?? 0) - (a.traffic?.reportedSessionCount ?? 0)
      || a.ide.localeCompare(b.ide)),
    dates: padded.map(day => day.day),
    interactions,
  };
}

export function computeUserPresentationSummary(details: DetailsInput): UserPresentationSummary {
  const featureInteractions: Record<string, number> = Object.create(null);
  for (const feature of details.featureAggregates) {
    const count = feature.feature === 'code_completion'
      ? getTotalUserInitiatedInteractionCount(feature)
      : feature.user_initiated_interaction_count;
    featureInteractions[feature.feature] = (featureInteractions[feature.feature] ?? 0) + count;
  }
  let totalCliPrompts = 0;
  const credits = new Map<string, number>();
  for (const day of details.days) {
    totalCliPrompts += day.totals_by_cli?.prompt_count ?? 0;
    credits.set(day.day, (credits.get(day.day) ?? 0) + day.ai_credits_used);
  }
  const clientInteractions = details.ideAggregates.map(ide => ({
    key: ide.ide, value: getTotalUserInitiatedInteractionCount(ide),
  }));
  if (totalCliPrompts > 0) clientInteractions.push({ key: 'copilot_cli', value: totalCliPrompts });
  const languages = new Map<string, number>();
  for (const item of details.languageFeatureAggregates) {
    if (item.language && item.language !== 'unknown') {
      languages.set(item.language, (languages.get(item.language) ?? 0) + item.code_generation_activity_count);
    }
  }
  const models = new Map<string, number>();
  for (const item of details.modelFeatureAggregates) {
    if (item.model) models.set(item.model, (models.get(item.model) ?? 0) + getTotalUserInitiatedInteractionCount(item));
  }
  const modelRequests = new Map<string, number>();
  for (const client of details.clientTraffic.summary.clients) {
    for (const model of client.models) {
      modelRequests.set(model.model, (modelRequests.get(model.model) ?? 0) + model.requestCount);
    }
  }
  return {
    totalCliPrompts,
    featureInteractions,
    clientInteractions: clientInteractions.sort((a, b) => b.value - a.value),
    clientRequests: details.clientTraffic.summary.clients.map(client => ({
      key: client.client, value: client.requestCount,
    })).sort((a, b) => b.value - a.value),
    languageGenerations: ranked(languages),
    modelInteractions: ranked(models),
    modelRequests: ranked(modelRequests),
    dailyAiCredits: Array.from(credits, ([date, aiCreditsUsed]) => ({
      date, aiCreditsUsed, users: aiCreditsUsed > 0 ? 1 : 0,
    })).sort((a, b) => a.date.localeCompare(b.date)),
    clientActivity: computeUserClientActivity(details),
    modelActivity: computeUserModelActivity(details),
  };
}

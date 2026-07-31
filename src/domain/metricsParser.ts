import { CopilotMetrics } from '../types/metrics';
import { StringPool, internMetricStrings } from '../utils/stringPool';
import type { NdjsonLine } from '../utils/ndjsonParser';
import { splitNdjsonLines } from '../utils/ndjsonParser';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import { normalizeLanguage } from './languageNormalizer';

function normalizeMetricLanguages(metric: CopilotMetrics): void {
  const featureTotals = Array.isArray(metric.totals_by_language_feature)
    ? metric.totals_by_language_feature
    : [];
  for (const entry of featureTotals) {
    if (typeof entry === 'object' && entry !== null && typeof entry.language === 'string') {
      entry.language = normalizeLanguage(entry.language);
    }
  }

  const modelTotals = Array.isArray(metric.totals_by_language_model)
    ? metric.totals_by_language_model
    : [];
  for (const entry of modelTotals) {
    if (typeof entry === 'object' && entry !== null && typeof entry.language === 'string') {
      entry.language = normalizeLanguage(entry.language);
    }
  }
}

function hasCopilotAppClientActivity(metric: CopilotMetrics): boolean {
  return metric.totals_by_ide.some((entry) =>
    entry.ide === 'copilot_app'
    && (
      entry.user_initiated_interaction_count > 0
      || entry.code_generation_activity_count > 0
      || entry.code_acceptance_activity_count > 0
      || entry.loc_added_sum > 0
      || entry.loc_deleted_sum > 0
      || entry.loc_suggested_to_add_sum > 0
      || entry.loc_suggested_to_delete_sum > 0
    )
  );
}

function addCopilotAppClientTotal(metric: CopilotMetrics): void {
  const appFeatures = metric.totals_by_feature.filter(
    (entry) => entry.feature === 'copilot_app'
  );
  const existingAppClient = metric.totals_by_ide.find(
    (entry) => entry.ide === 'copilot_app'
  );
  if (
    !metric.used_copilot_app
    && !metric.totals_by_copilot_app
    && appFeatures.length === 0
  ) {
    return;
  }

  const appFeatureTotal = appFeatures.reduce(
    (total, feature) => ({
      user_initiated_interaction_count:
        total.user_initiated_interaction_count
        + feature.user_initiated_interaction_count,
      code_generation_activity_count:
        total.code_generation_activity_count
        + feature.code_generation_activity_count,
      code_acceptance_activity_count:
        total.code_acceptance_activity_count
        + feature.code_acceptance_activity_count,
      loc_added_sum: total.loc_added_sum + feature.loc_added_sum,
      loc_deleted_sum: total.loc_deleted_sum + feature.loc_deleted_sum,
      loc_suggested_to_add_sum:
        total.loc_suggested_to_add_sum + feature.loc_suggested_to_add_sum,
      loc_suggested_to_delete_sum:
        total.loc_suggested_to_delete_sum
        + feature.loc_suggested_to_delete_sum,
    }),
    {
      user_initiated_interaction_count: 0,
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
    }
  );

  if (existingAppClient) {
    if (appFeatures.length > 0) {
      Object.assign(existingAppClient, appFeatureTotal);
    } else if (
      existingAppClient.user_initiated_interaction_count <= 0
      && metric.totals_by_copilot_app
    ) {
      existingAppClient.user_initiated_interaction_count =
        metric.totals_by_copilot_app.prompt_count;
    }
    return;
  }

  metric.totals_by_ide.push({
      ide: 'copilot_app',
      ...appFeatureTotal,
      user_initiated_interaction_count:
        appFeatures.length > 0
          ? appFeatureTotal.user_initiated_interaction_count
          : metric.totals_by_copilot_app?.prompt_count ?? 0,
    });
}

export function parseMetricsLine(line: string, pool?: StringPool): CopilotMetrics | null {
  try {
    const parsedUnknown = JSON.parse(line) as unknown;
    if (typeof parsedUnknown !== 'object' || parsedUnknown === null) {
      console.warn('Skipping non-object JSON line');
      return null;
    }
    const parsedRaw = parsedUnknown as Record<string, unknown>;

    // Validation: reject old schema lines containing deprecated fields
    const hasDeprecatedRoot = 'generated_loc_sum' in parsedRaw || 'accepted_loc_sum' in parsedRaw;
    let hasDeprecatedNested = false;
    const tf = parsedRaw['totals_by_feature'];
    if (Array.isArray(tf)) {
      hasDeprecatedNested = tf.some(item => typeof item === 'object' && item !== null && ('generated_loc_sum' in (item as Record<string, unknown>) || 'accepted_loc_sum' in (item as Record<string, unknown>)));
    }
    if (hasDeprecatedRoot || hasDeprecatedNested) {
      console.warn('Skipping line with deprecated LOC fields (old schema not supported):', line.substring(0, 200));
      return null;
    }

    // Basic presence validation for new required fields
    const requiredRootFields: Array<keyof CopilotMetrics> = [
      'loc_added_sum',
      'loc_deleted_sum',
      'loc_suggested_to_add_sum',
      'loc_suggested_to_delete_sum'
    ];
    const missing = requiredRootFields.filter(f => !(f in parsedRaw));
    if (missing.length > 0) {
      console.warn('Skipping line missing new LOC fields:', missing.join(','));
      return null;
    }

    // We rely on upstream schema conformity; at runtime we only soft-validated key fields
    const metric = parsedRaw as unknown as CopilotMetrics;
    const aiCreditsUsed = parsedRaw['ai_credits_used'];
    if (aiCreditsUsed === undefined || aiCreditsUsed === null) {
      metric.ai_credits_used = 0;
    } else if (typeof aiCreditsUsed === 'number' && Number.isFinite(aiCreditsUsed)) {
      metric.ai_credits_used = aiCreditsUsed;
    } else {
      console.warn('Skipping line with invalid ai_credits_used:', line.substring(0, 200));
      return null;
    }
    metric.used_cli = metric.used_cli ?? false;
    metric.used_copilot_app = Boolean(
      metric.used_copilot_app
      || metric.totals_by_copilot_app
      || metric.totals_by_feature.some((entry) => entry.feature === 'copilot_app')
      || hasCopilotAppClientActivity(metric)
    );
    metric.used_copilot_code_review_active = metric.used_copilot_code_review_active ?? false;
    metric.used_copilot_code_review_passive = metric.used_copilot_code_review_passive ?? false;
    const usedCopilotCloudAgent = resolveCopilotCloudAgentUsage(metric);
    metric.used_copilot_coding_agent = usedCopilotCloudAgent;
    metric.used_copilot_cloud_agent = usedCopilotCloudAgent;
    addCopilotAppClientTotal(metric);

    // Normalize language names to canonical form
    normalizeMetricLanguages(metric);

    // Apply string interning if pool is provided
    if (pool) {
      internMetricStrings(metric, pool);
    }

    return metric;
  } catch (error) {
    console.warn('Failed to parse line:', line, error);
    return null;
  }
}

export function appendParsedMetricsFromLines(
  lines: Iterable<Pick<NdjsonLine, 'line'>>,
  metrics: CopilotMetrics[],
  pool: StringPool
): number {
  let appendedCount = 0;

  for (const { line } of lines) {
    const metric = parseMetricsLine(line, pool);
    if (metric) {
      metrics.push(metric);
      appendedCount++;
    }
  }

  return appendedCount;
}

export function parseMetricsLines(lines: Iterable<Pick<NdjsonLine, 'line'>>): CopilotMetrics[] {
  const metrics: CopilotMetrics[] = [];
  const pool = new StringPool();

  try {
    appendParsedMetricsFromLines(lines, metrics, pool);
  } finally {
    // Pool can be cleared after parsing - interned strings in metrics remain valid
    pool.clear();
  }

  return metrics;
}

export function parseMetricsFile(fileContent: string): CopilotMetrics[] {
  return parseMetricsLines(splitNdjsonLines(fileContent));
}

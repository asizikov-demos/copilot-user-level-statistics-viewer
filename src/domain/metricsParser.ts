import type { ClientUsageTotals, CopilotMetrics } from '../types/metrics';
import { StringPool, internMetricStrings } from '../utils/stringPool';
import type { NdjsonLine } from '../utils/ndjsonParser';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import { normalizeLanguage } from './languageNormalizer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isUsageMetricsRequirements(value: unknown): boolean {
  return isRecord(value)
    && ['met', 'unmet', 'unknown'].every(key => {
      const components = value[key];
      return Array.isArray(components)
        && components.every(component => typeof component === 'string');
    });
}

function hasValidTrafficTotals(value: Record<string, unknown>): boolean {
  const tokens = value.token_usage;
  return isCount(value.request_count)
    && isRecord(tokens)
    && isCount(tokens.output_tokens_sum)
    && isCount(tokens.prompt_tokens_sum)
    && typeof tokens.avg_tokens_per_request === 'number'
    && Number.isFinite(tokens.avg_tokens_per_request)
    && tokens.avg_tokens_per_request >= 0;
}

function isClientUsageTotals(value: unknown): value is ClientUsageTotals {
  return isRecord(value)
    && typeof value.client === 'string'
    && value.client.trim().length > 0
    && isCount(value.session_count)
    && hasValidTrafficTotals(value)
    && Array.isArray(value.totals_by_model)
    && value.totals_by_model.every(model =>
      isRecord(model)
      && typeof model.model === 'string'
      && model.model.trim().length > 0
      && typeof model.model_selection_mode === 'string'
      && model.model_selection_mode.trim().length > 0
      && hasValidTrafficTotals(model)
    );
}

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
    const clientTelemetryPresent = parsedRaw.client_telemetry_present;
    if (clientTelemetryPresent != null && typeof clientTelemetryPresent !== 'boolean') {
      console.warn('Skipping line with invalid client_telemetry_present');
      return null;
    }
    const usageMetricsRequirements = parsedRaw.usage_metrics_requirements;
    if (usageMetricsRequirements != null && !isUsageMetricsRequirements(usageMetricsRequirements)) {
      console.warn('Skipping line with invalid usage_metrics_requirements');
      return null;
    }
    const clientTotals = parsedRaw.totals_by_client;
    if (
      clientTotals != null
      && (!Array.isArray(clientTotals) || !clientTotals.every(isClientUsageTotals))
    ) {
      console.warn('Skipping line with invalid totals_by_client');
      return null;
    }

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
    metric.workingPatternSources = {
      cloudAgent: metric.used_copilot_cloud_agent != null,
      codeReview: metric.used_copilot_code_review_active != null || metric.used_copilot_code_review_passive != null,
      app: metric.used_copilot_app != null || metric.totals_by_copilot_app != null,
      vscodeAgents: metric.used_vscode_agent != null || metric.totals_by_vscode_agent != null,
      clientTraffic: metric.totals_by_client != null,
      appUsage: metric.used_copilot_app === true || hasCopilotAppClientActivity(metric),
    };
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
  return consumeParsedMetricsFromLines(lines, metric => metrics.push(metric), pool);
}

export function consumeParsedMetricsFromLines(
  lines: Iterable<Pick<NdjsonLine, 'line'>>,
  onMetric: (metric: CopilotMetrics) => void,
  pool: StringPool
): number {
  let appendedCount = 0;

  for (const { line } of lines) {
    const metric = parseMetricsLine(line, pool);
    if (metric) {
      onMetric(metric);
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

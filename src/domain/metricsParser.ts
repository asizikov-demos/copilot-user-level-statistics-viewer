import { CopilotMetrics } from '../types/metrics';
import { StringPool, internMetricStrings } from '../utils/stringPool';
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
    metric.used_cli = metric.used_cli ?? false;
    const usedCopilotCloudAgent = resolveCopilotCloudAgentUsage(metric);
    metric.used_copilot_coding_agent = usedCopilotCloudAgent;
    metric.used_copilot_cloud_agent = usedCopilotCloudAgent;

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

export function parseMetricsFile(fileContent: string): CopilotMetrics[] {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const metrics: CopilotMetrics[] = [];
  const pool = new StringPool();

  for (const line of lines) {
    const metric = parseMetricsLine(line.trim(), pool);
    if (metric) {
      metrics.push(metric);
    }
  }

  // Pool can be cleared after parsing - interned strings in metrics remain valid
  pool.clear();

  return metrics;
}

/**
 * String interning pool for memory optimization.
 * 
 * When parsing large datasets, the same strings (IDE names, features, languages, models)
 * appear thousands of times. Each JSON.parse creates a new string instance.
 * 
 * This pool deduplicates strings so all identical values share the same memory reference.
 * Estimated memory savings: 10-15% for typical datasets.
 */
export class StringPool {
  private pool: Map<string, string> = new Map();

  /**
   * Returns an interned string reference.
   * If the string was seen before, returns the existing reference.
   * Otherwise, stores and returns the new string.
   */
  intern(value: string): string {
    const existing = this.pool.get(value);
    if (existing !== undefined) {
      return existing;
    }
    this.pool.set(value, value);
    return value;
  }

  /**
   * Returns the number of unique strings in the pool.
   */
  get size(): number {
    return this.pool.size;
  }

  /**
   * Clears the pool to free memory after parsing is complete.
   * The interned strings in the parsed data remain valid.
   */
  clear(): void {
    this.pool.clear();
  }
}

/**
 * Applies string interning to a CopilotMetrics object in-place.
 * This mutates the object to replace string values with interned references.
 */
export function internMetricStrings<T extends {
  report_start_day?: string;
  report_end_day?: string;
  day?: string;
  enterprise_id?: string;
  user_login?: string;
  totals_by_ide?: Array<{
    ide: string;
    last_known_ide_version?: { ide_version: string };
    last_known_plugin_version?: { plugin: string; plugin_version: string };
  }>;
  totals_by_feature?: Array<{ feature: string }>;
  totals_by_language_feature?: Array<{ language: string; feature: string }>;
  totals_by_language_model?: Array<{ language: string; model: string }>;
  totals_by_model_feature?: Array<{ model: string; feature: string }>;
}>(metric: T, pool: StringPool): T {
  // Intern root-level strings
  if (metric.report_start_day) {
    metric.report_start_day = pool.intern(metric.report_start_day);
  }
  if (metric.report_end_day) {
    metric.report_end_day = pool.intern(metric.report_end_day);
  }
  if (metric.day) {
    metric.day = pool.intern(metric.day);
  }
  if (metric.enterprise_id) {
    metric.enterprise_id = pool.intern(metric.enterprise_id);
  }
  if (metric.user_login) {
    metric.user_login = pool.intern(metric.user_login);
  }

  // Intern IDE names and plugin info
  if (metric.totals_by_ide) {
    for (const item of metric.totals_by_ide) {
      item.ide = pool.intern(item.ide);
      if (item.last_known_ide_version) {
        item.last_known_ide_version.ide_version = pool.intern(item.last_known_ide_version.ide_version);
      }
      if (item.last_known_plugin_version) {
        item.last_known_plugin_version.plugin = pool.intern(item.last_known_plugin_version.plugin);
        item.last_known_plugin_version.plugin_version = pool.intern(item.last_known_plugin_version.plugin_version);
      }
    }
  }

  // Intern feature names
  if (metric.totals_by_feature) {
    for (const item of metric.totals_by_feature) {
      item.feature = pool.intern(item.feature);
    }
  }

  // Intern language and feature combinations
  if (metric.totals_by_language_feature) {
    for (const item of metric.totals_by_language_feature) {
      item.language = pool.intern(item.language);
      item.feature = pool.intern(item.feature);
    }
  }

  // Intern language and model combinations
  if (metric.totals_by_language_model) {
    for (const item of metric.totals_by_language_model) {
      item.language = pool.intern(item.language);
      item.model = pool.intern(item.model);
    }
  }

  // Intern model and feature combinations
  if (metric.totals_by_model_feature) {
    for (const item of metric.totals_by_model_feature) {
      item.model = pool.intern(item.model);
      item.feature = pool.intern(item.feature);
    }
  }

  return metric;
}

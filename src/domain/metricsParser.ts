import { CopilotMetrics } from '../types/metrics';
import { StringPool, internMetricStrings } from '../utils/stringPool';

function validateAndParseLine(line: string, pool?: StringPool): CopilotMetrics | null {
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
    const metric = validateAndParseLine(line, pool);
    if (metric) {
      metrics.push(metric);
    }
  }

  // Pool can be cleared after parsing - interned strings in metrics remain valid
  pool.clear();

  return metrics;
}

interface StreamProcessingResult {
  count: number;
}

async function processFileStream(
  file: File,
  metrics: CopilotMetrics[],
  pool: StringPool,
  onChunkProcessed?: (count: number) => void,
  initialCount: number = 0
): Promise<StreamProcessingResult> {
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let processedCount = initialCount;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const metric = validateAndParseLine(line, pool);
        if (metric) {
          metrics.push(metric);
          processedCount++;
        }
      }

      if (onChunkProcessed) {
        onChunkProcessed(processedCount);
      }
    }

    if (buffer.trim()) {
      const metric = validateAndParseLine(buffer, pool);
      if (metric) {
        metrics.push(metric);
        processedCount++;
        if (onChunkProcessed) {
          onChunkProcessed(processedCount);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { count: processedCount };
}

export async function parseMetricsStream(file: File, onProgress?: (count: number) => void): Promise<CopilotMetrics[]> {
  const metrics: CopilotMetrics[] = [];
  const pool = new StringPool();

  try {
    await processFileStream(file, metrics, pool, onProgress);
  } finally {
    pool.clear();
  }

  return metrics;
}

export interface MultiFileProgress {
  currentFile: number;
  totalFiles: number;
  fileName: string;
  recordsProcessed: number;
}

export interface MultiFileResult {
  metrics: CopilotMetrics[];
  errors: Array<{ fileIndex: number; fileName: string; error: string }>;
}

export async function parseMultipleMetricsStreams(
  files: File[],
  onProgress?: (progress: MultiFileProgress) => void
): Promise<MultiFileResult> {
  const allMetrics: CopilotMetrics[] = [];
  const errors: Array<{ fileIndex: number; fileName: string; error: string }> = [];
  const pool = new StringPool();
  let totalRecordsProcessed = 0;

  try {
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];

      try {
        const result = await processFileStream(
          file,
          allMetrics,
          pool,
          onProgress
            ? (count) => {
                onProgress({
                  currentFile: fileIndex + 1,
                  totalFiles: files.length,
                  fileName: file.name,
                  recordsProcessed: count,
                });
              }
            : undefined,
          totalRecordsProcessed
        );

        totalRecordsProcessed = result.count;
      } catch (err) {
        errors.push({
          fileIndex: fileIndex + 1,
          fileName: file.name,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  } finally {
    pool.clear();
  }

  return { metrics: allMetrics, errors };
}

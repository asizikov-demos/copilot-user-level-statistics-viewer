import { CopilotMetrics } from '../types/metrics';

function validateAndParseLine(line: string): CopilotMetrics | null {
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
    return parsedRaw as unknown as CopilotMetrics;
  } catch (error) {
    console.warn('Failed to parse line:', line, error);
    return null;
  }
}

export function parseMetricsFile(fileContent: string): CopilotMetrics[] {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const metrics: CopilotMetrics[] = [];

  for (const line of lines) {
    const metric = validateAndParseLine(line);
    if (metric) {
      metrics.push(metric);
    }
  }

  return metrics;
}

export async function parseMetricsStream(file: File, onProgress?: (count: number) => void): Promise<CopilotMetrics[]> {
  const metrics: CopilotMetrics[] = [];
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let processedCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last part as it might be incomplete
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const metric = validateAndParseLine(line);
        if (metric) {
          metrics.push(metric);
          processedCount++;
        }
      }
      
      if (onProgress) {
        onProgress(processedCount);
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const metric = validateAndParseLine(buffer);
      if (metric) {
        metrics.push(metric);
        processedCount++;
        if (onProgress) {
          onProgress(processedCount);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return metrics;
}

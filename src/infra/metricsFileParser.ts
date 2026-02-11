import { CopilotMetrics } from '../types/metrics';
import { StringPool } from '../utils/stringPool';
import { parseMetricsLine } from '../domain/metricsParser';

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
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        const metric = parseMetricsLine(trimmedLine, pool);
        if (metric) {
          metrics.push(metric);
          processedCount++;
        }
      }

      if (onChunkProcessed) {
        onChunkProcessed(processedCount);
      }
    }

    // Flush the decoder to handle any remaining multi-byte UTF-8 sequences
    buffer += decoder.decode();

    const trimmedBuffer = buffer.trim();
    if (trimmedBuffer) {
      const metric = parseMetricsLine(trimmedBuffer, pool);
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

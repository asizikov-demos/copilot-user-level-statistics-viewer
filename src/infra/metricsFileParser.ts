import { CopilotMetrics } from '../types/metrics';
import { StringPool } from '../utils/stringPool';
import { consumeParsedMetricsFromLines } from '../domain/metricsParser';
import { flushNdjsonRemainder, splitNdjsonChunk } from '../utils/ndjsonParser';

interface StreamProcessingResult {
  count: number;
}

async function processFileStream(
  file: File,
  onMetric: (metric: CopilotMetrics) => void,
  pool: StringPool,
  onChunkProcessed?: (count: number) => void,
  initialCount: number = 0
): Promise<StreamProcessingResult> {
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let remainder = '';
  let nextLineNumber = 1;
  let processedCount = initialCount;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkResult = splitNdjsonChunk(decoder.decode(value, { stream: true }), remainder, nextLineNumber);
      remainder = chunkResult.remainder;
      nextLineNumber = chunkResult.nextLineNumber;

      processedCount += consumeParsedMetricsFromLines(chunkResult.lines, onMetric, pool);

      if (onChunkProcessed) {
        onChunkProcessed(processedCount);
      }
    }

    // Flush the decoder to handle any remaining multi-byte UTF-8 sequences
    const finalChunkResult = splitNdjsonChunk(decoder.decode(), remainder, nextLineNumber);
    const countBeforeFlush = processedCount;

    processedCount += consumeParsedMetricsFromLines(finalChunkResult.lines, onMetric, pool);

    processedCount += consumeParsedMetricsFromLines(
      flushNdjsonRemainder(finalChunkResult.remainder, finalChunkResult.nextLineNumber),
      onMetric,
      pool
    );

    if (processedCount > countBeforeFlush && onChunkProcessed) {
      onChunkProcessed(processedCount);
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
    await processFileStream(file, metric => metrics.push(metric), pool, onProgress);
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
  const { errors } = await consumeMultipleMetricsStreams(files, metric => allMetrics.push(metric), onProgress);
  return { metrics: allMetrics, errors };
}

class MetricConsumerError extends Error {
  constructor(readonly consumerError: unknown) {
    super('Metric consumer failed');
  }
}

export async function consumeMultipleMetricsStreams(
  files: File[],
  onMetric: (metric: CopilotMetrics) => void,
  onProgress?: (progress: MultiFileProgress) => void
): Promise<{ recordCount: number; errors: MultiFileResult['errors'] }> {
  const errors: Array<{ fileIndex: number; fileName: string; error: string }> = [];
  const pool = new StringPool();
  let totalRecordsProcessed = 0;

  try {
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];

      try {
        await processFileStream(
          file,
          metric => {
            try {
              onMetric(metric);
            } catch (error) {
              // Consumer failures are fatal, not recoverable file read errors.
              throw new MetricConsumerError(error);
            }
            totalRecordsProcessed++;
          },
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
      } catch (err) {
        if (err instanceof MetricConsumerError) throw err.consumerError;
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

  return { recordCount: totalRecordsProcessed, errors };
}

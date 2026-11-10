import { describe, expect, it, vi } from 'vitest';
import { createChunkedFile, createFailingFile } from '../../__tests__/factories/files';
import { makeMetric } from '../../__tests__/factories/metrics';
import { parseMetricsLines } from '../../domain/metricsParser';
import { splitNdjsonLines } from '../../utils/ndjsonParser';
import type { MultiFileProgress } from '../metricsFileParser';
import { consumeMultipleMetricsStreams, parseMultipleMetricsStreams } from '../metricsFileParser';
import { accumulateMetrics, aggregateMetrics, createMetricsAggregationAccumulator, finalizeMetricsAggregation } from '../../domain/metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../../domain/calculators/userDetailCalculator';

describe('parseMultipleMetricsStreams', () => {
  it('streams records into aggregation before reading the rest of the file', async () => {
    const records = [
      makeMetric({ user_id: 1, user_login: 'plain', ai_credits_used: 0.125 }),
      makeMetric({ user_id: 1, user_login: 'user_acme', ai_credits_used: -0.025 }),
    ];
    const accumulator = createMetricsAggregationAccumulator();
    let reads = 0;
    const file = new File([], 'streamed.ndjson');
    Object.defineProperty(file, 'stream', {
      value: () => new ReadableStream<Uint8Array>({
        pull(controller) {
          expect(accumulator.recordCount).toBe(reads);
          if (reads === records.length) {
            controller.close();
          } else {
            controller.enqueue(new TextEncoder().encode(`${JSON.stringify(records[reads++])}\n`));
          }
        },
      }, { highWaterMark: 0 }),
    });

    const result = await consumeMultipleMetricsStreams([file], metric => accumulateMetrics(accumulator, metric));
    const streamed = finalizeMetricsAggregation(accumulator);
    const batch = aggregateMetrics(parseMetricsLines(splitNdjsonLines(records.map(record => JSON.stringify(record)).join('\n'))));

    expect(result).toEqual({ recordCount: 2, errors: [] });
    expect(streamed).toMatchObject({ recordCount: 2, enterpriseName: 'acme' });
    expect(streamed.aggregated).toEqual(batch.aggregated);
    expect(computeSingleUserDetailedMetrics(streamed.userDetailAccumulator, 1))
      .toEqual(computeSingleUserDetailedMetrics(batch.userDetailAccumulator, 1));
  });

  it('retains accepted records and cumulative counts after a mid-file failure', async () => {
    const first = makeMetric({ user_id: 1 });
    let reads = 0;
    const broken = new File([], 'partial.ndjson');
    Object.defineProperty(broken, 'stream', {
      value: () => new ReadableStream<Uint8Array>({
        pull(controller) {
          if (reads++ === 0) {
            controller.enqueue(new TextEncoder().encode(`${JSON.stringify(first)}\n`));
          } else {
            controller.error(new Error('read failed'));
          }
        },
      }, { highWaterMark: 0 }),
    });
    const accepted: number[] = [];
    const progress: MultiFileProgress[] = [];

    const result = await consumeMultipleMetricsStreams(
      [broken, createChunkedFile([JSON.stringify(makeMetric({ user_id: 2 }))], 'next.ndjson')],
      metric => accepted.push(metric.user_id),
      update => progress.push(update),
    );

    expect(accepted).toEqual([1, 2]);
    expect(result).toEqual({
      recordCount: 2,
      errors: [{ fileIndex: 1, fileName: 'partial.ndjson', error: 'read failed' }],
    });
    expect(progress.map(update => update.recordsProcessed)).toEqual([1, 1, 2]);
  });

  it('propagates consumer failures instead of treating them as per-file errors', async () => {
    const failure = new Error('aggregation failed');
    const later = new File([], 'later.ndjson');
    const laterStream = vi.spyOn(later, 'stream');
    await expect(consumeMultipleMetricsStreams(
      [createChunkedFile([`${JSON.stringify(makeMetric())}\n`]), later],
      () => { throw failure; },
    )).rejects.toBe(failure);
    expect(laterStream).not.toHaveBeenCalled();
  });

  it('matches whole-content parsing for equivalent NDJSON content across chunk boundaries', async () => {
    const baseRecord = makeMetric({
      user_id: 123,
      user_login: 'user1',
      user_initiated_interaction_count: 10,
      code_generation_activity_count: 5,
      code_acceptance_activity_count: 3,
      loc_added_sum: 100,
      loc_deleted_sum: 20,
      loc_suggested_to_add_sum: 150,
      loc_suggested_to_delete_sum: 30,
      used_chat: true,
    });
    const secondRecord = { ...baseRecord, user_id: 456, user_login: 'user2' };
    const deprecatedRecord = { ...baseRecord, user_id: 789, generated_loc_sum: 100 };

    const firstLine = JSON.stringify(baseRecord);
    const secondLine = JSON.stringify(secondRecord);
    const deprecatedLine = JSON.stringify(deprecatedRecord);
    const fileContent = `${firstLine}\r\n\r\n${secondLine}\r\n${deprecatedLine}`;
    const file = createChunkedFile([
      `${firstLine}\r`,
      '\n\r',
      `\n${secondLine.slice(0, 20)}`,
      secondLine.slice(20),
      `\r\n${deprecatedLine.slice(0, 25)}`,
      deprecatedLine.slice(25),
    ]);

    const streamed = await parseMultipleMetricsStreams([file]);
    const parsedFromString = parseMetricsLines(splitNdjsonLines(fileContent));

    expect(streamed.errors).toEqual([]);
    expect(streamed.metrics).toEqual(parsedFromString);
    expect(streamed.metrics).toHaveLength(2);
    expect(streamed.metrics.map(metric => metric.user_id)).toEqual([123, 456]);
  });

  it('continues parsing later files after a file stream fails and reports cumulative progress', async () => {
    const firstFile = createChunkedFile([
      `${JSON.stringify(makeMetric({ user_id: 111, user_login: 'first_user' }))}\n`,
    ], 'first.ndjson');
    const failingFile = createFailingFile('broken.ndjson', new Error('stream exploded'));
    const lastFile = createChunkedFile([
      `${JSON.stringify(makeMetric({ user_id: 333, user_login: 'last_user' }))}\n`,
    ], 'last.ndjson');
    const progress: MultiFileProgress[] = [];

    const result = await parseMultipleMetricsStreams(
      [firstFile, failingFile, lastFile],
      update => progress.push(update)
    );

    expect(result.metrics.map(metric => metric.user_id)).toEqual([111, 333]);
    expect(result.errors).toEqual([
      { fileIndex: 2, fileName: 'broken.ndjson', error: 'stream exploded' },
    ]);
    expect(progress).toEqual([
      { currentFile: 1, totalFiles: 3, fileName: 'first.ndjson', recordsProcessed: 1 },
      { currentFile: 3, totalFiles: 3, fileName: 'last.ndjson', recordsProcessed: 2 },
    ]);
  });
});

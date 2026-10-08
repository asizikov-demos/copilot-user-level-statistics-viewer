import { describe, expect, it } from 'vitest';
import { createChunkedFile, createFailingFile } from '../../__tests__/factories/files';
import { makeMetric } from '../../__tests__/factories/metrics';
import { parseMetricsLines } from '../../domain/metricsParser';
import { splitNdjsonLines } from '../../utils/ndjsonParser';
import type { MultiFileProgress } from '../metricsFileParser';
import { parseMultipleMetricsStreams } from '../metricsFileParser';

describe('parseMultipleMetricsStreams', () => {
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

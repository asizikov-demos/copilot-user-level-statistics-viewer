import { describe, expect, it } from 'vitest';
import { parseMetricsFile } from '../../domain/metricsParser';
import { parseMultipleMetricsStreams } from '../metricsFileParser';

const encoder = new TextEncoder();

function createChunkedFile(chunks: string[], name: string = 'metrics.ndjson'): File {
  const file = new File([''], name, { type: 'application/x-ndjson' });
  const encodedChunks = chunks.map(chunk => encoder.encode(chunk));

  Object.defineProperty(file, 'stream', {
    value: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of encodedChunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      }),
  });

  return file;
}

describe('parseMultipleMetricsStreams', () => {
  it('matches parseMetricsFile for equivalent NDJSON content across chunk boundaries', async () => {
    const baseRecord = {
      report_start_day: '2024-01-01',
      report_end_day: '2024-01-31',
      day: '2024-01-15',
      enterprise_id: 'test-enterprise',
      user_id: 123,
      user_login: 'user1',
      user_initiated_interaction_count: 10,
      code_generation_activity_count: 5,
      code_acceptance_activity_count: 3,
      loc_added_sum: 100,
      loc_deleted_sum: 20,
      loc_suggested_to_add_sum: 150,
      loc_suggested_to_delete_sum: 30,
      totals_by_ide: [],
      totals_by_feature: [],
      totals_by_language_feature: [],
      totals_by_language_model: [],
      totals_by_model_feature: [],
      used_agent: false,
      used_chat: true,
    };
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
    const parsedFromString = parseMetricsFile(fileContent);

    expect(streamed.errors).toEqual([]);
    expect(streamed.metrics).toEqual(parsedFromString);
    expect(streamed.metrics).toHaveLength(2);
    expect(streamed.metrics.map(metric => metric.user_id)).toEqual([123, 456]);
  });
});

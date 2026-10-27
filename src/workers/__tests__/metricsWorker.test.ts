import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createChunkedFile, createFailingFile } from '../../__tests__/factories/files';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { WorkerRequest, WorkerResponse } from '../types';

type WorkerHost = typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void | Promise<void>) | null;
  postMessage?: (message: WorkerResponse) => void;
};

type ResponseOf<T extends WorkerResponse['type']> = Extract<WorkerResponse, { type: T }>;

async function loadWorker() {
  vi.resetModules();

  const host = globalThis as WorkerHost;
  const responses: WorkerResponse[] = [];
  host.postMessage = (message: WorkerResponse) => {
    responses.push(message);
  };

  await import('../metricsWorker');

  const send = async (message: WorkerRequest) => {
    expect(host.onmessage).toBeTypeOf('function');
    await host.onmessage!({ data: message } as MessageEvent<WorkerRequest>);
  };

  const find = <T extends WorkerResponse['type']>(type: T) =>
    responses.find((response): response is ResponseOf<T> => response.type === type);

  return { responses, send, find };
}

const metricFile = (name: string, ...records: Parameters<typeof makeMetric>[0][]) =>
  createChunkedFile(records.map(record => `${JSON.stringify(makeMetric(record))}\n`), name);

describe('metricsWorker protocol', () => {
  let originalPostMessage: WorkerHost['postMessage'];
  let originalOnMessage: WorkerHost['onmessage'];

  beforeEach(() => {
    const host = globalThis as WorkerHost;
    originalPostMessage = host.postMessage;
    originalOnMessage = host.onmessage;
  });

  afterEach(() => {
    const host = globalThis as WorkerHost;
    host.postMessage = originalPostMessage;
    host.onmessage = originalOnMessage;
    vi.restoreAllMocks();
  });

  describe('parseAndAggregate', () => {
    it('loads the sample report with varied AI credit usage across days and phases', async () => {
      const sample = readFileSync('public/data/sample-report.ndjson', 'utf8');
      const records = sample.trimEnd().split('\n').map(line => JSON.parse(line));
      const credits = records.map(record => record.ai_credits_used as number);
      expect(credits.every(value => Number.isFinite(value) && value >= 0)).toBe(true);
      expect(credits.some(value => value === 0)).toBe(true);
      expect(credits.filter(value => value > 0).length).toBeGreaterThan(records.length / 2);
      for (const phase of [0, 1, 2, 3]) {
        expect(records.some(record =>
          record.ai_adoption_phase?.phase_number === phase && record.ai_credits_used > 0
        )).toBe(true);
      }
      const median = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        expect(sorted.length).toBeGreaterThan(0);
        return sorted[Math.floor(sorted.length / 2)];
      };
      const medianCredits = (predicate: (record: typeof records[number]) => boolean) =>
        median(records.filter(predicate).map(record => record.ai_credits_used as number));
      const lowActivity = medianCredits(record =>
        record.user_initiated_interaction_count > 0 && record.user_initiated_interaction_count < 10
      );
      const mediumActivity = medianCredits(record =>
        record.user_initiated_interaction_count >= 10 && record.user_initiated_interaction_count < 50
      );
      const highActivity = medianCredits(record => record.user_initiated_interaction_count >= 50);
      expect(mediumActivity).toBeGreaterThan(lowActivity);
      expect(highActivity).toBeGreaterThan(mediumActivity);
      expect(medianCredits(record => record.loc_added_sum >= 100))
        .toBeGreaterThan(medianCredits(record => record.loc_added_sum <= 0));

      const { send, find } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'sample',
        files: [createChunkedFile([sample], 'sample-report.ndjson')],
      });

      const result = find('parseAndAggregateResult');
      expect(result).toMatchObject({ recordCount: records.length, errors: [] });
      expect(result?.result.ai.dailyAiCreditsData).toHaveLength(
        new Set(records.map(record => record.day)).size
      );
      const dailyCredits = result?.result.ai.dailyAiCreditsData ?? [];
      expect(dailyCredits.every(day => day.aiCreditsUsed > 0 && day.users > 0)).toBe(true);
      expect(dailyCredits.reduce((total, day) => total + day.aiCreditsUsed, 0))
        .toBeCloseTo(credits.reduce((total, value) => total + value, 0), 5);
    });

    it('accepts name-only customization entries and retains unavailable counts in user details', async () => {
      const { send, find } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'name-only',
        files: [metricFile('customizations.ndjson', {
          user_id: 42,
          totals_by_custom_agent: [{ custom_agent: 'other' }],
          distinct_custom_agent_use_count: 2,
        })],
      });
      expect(find('error')).toBeUndefined();
      expect(find('parseAndAggregateResult')).toMatchObject({ recordCount: 1, errors: [] });
      await send({ type: 'computeUserDetails', id: 'details', userId: 42 });
      const details = find('userDetailsResult')?.result;
      expect(details?.cliCustomizations[1]).toMatchObject({
        summedDailyDistinctItems: 2,
        observedInteractions: null,
        legacyEntryCount: 0,
        items: [{ name: 'other', interactionCount: null, daysInvoked: null, averagePerDay: null }],
      });
      expect(details?.days[0].cliCustomizations?.[1]).toMatchObject({
        distinctItems: 2,
        observedInteractions: null,
        items: [{ name: 'other', interactionCount: null, daysInvoked: null, averagePerDay: null }],
      });
    });

    it('posts progress then an aggregated result tagged with the request id', async () => {
      const { responses, send } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'parse-1',
        files: [
          metricFile('first.ndjson', { user_id: 1, user_login: 'octocat_acme' }),
          metricFile('second.ndjson', { user_id: 2, user_login: 'hubot_acme' }),
        ],
      });

      expect(responses.map(response => response.type)).toEqual([
        'parseProgress',
        'parseProgress',
        'parseAndAggregateResult',
      ]);
      expect(responses[0]).toEqual({
        type: 'parseProgress',
        id: 'parse-1',
        progress: { currentFile: 1, totalFiles: 2, fileName: 'first.ndjson', recordsProcessed: 1 },
      });
      const result = responses[2] as ResponseOf<'parseAndAggregateResult'>;
      expect(result).toMatchObject({ id: 'parse-1', recordCount: 2, enterpriseName: 'acme', errors: [] });
      expect(result.result.overview.stats.uniqueUsers).toBe(2);
      expect(result).not.toHaveProperty('metrics');
      expect(result.result).not.toHaveProperty('rawMetrics');
    });

    it('returns per-file errors alongside the result when some files fail', async () => {
      const { send, find } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'partial',
        files: [
          metricFile('good.ndjson', {}),
          createFailingFile('bad.ndjson', new Error('bad file stream')),
        ],
      });

      expect(find('parseAndAggregateResult')).toMatchObject({
        id: 'partial',
        recordCount: 1,
        errors: [{ fileIndex: 2, fileName: 'bad.ndjson', error: 'bad file stream' }],
      });
    });

    it('posts an error instead of a result when every file fails', async () => {
      const { responses, send, find } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'all-failed',
        files: [createFailingFile('bad.ndjson', new Error('bad file stream'))],
      });

      expect(find('parseAndAggregateResult')).toBeUndefined();
      expect(responses.at(-1)).toMatchObject({ type: 'error', id: 'all-failed' });
    });
  });

  describe('computeUserDetails', () => {
    it('rejects requests until parse-and-aggregate has retained an accumulator', async () => {
      const { responses, send } = await loadWorker();

      await send({ type: 'computeUserDetails', id: 'details-before-aggregation', userId: 1 });

      expect(responses).toEqual([
        {
          type: 'error',
          id: 'details-before-aggregation',
          error: 'No aggregation data available. Aggregate metrics first.',
        },
      ]);
    });

    it('serves details for the requested user from the retained accumulator', async () => {
      const { responses, send } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'parse',
        files: [metricFile('metrics.ndjson',
          { user_id: 42, user_initiated_interaction_count: 12, ai_credits_used: 3.5 },
          { user_id: 7, user_initiated_interaction_count: 1 },
        )],
      });
      responses.length = 0;

      await send({ type: 'computeUserDetails', id: 'details-1', userId: 42 });

      expect(responses).toHaveLength(1);
      expect(responses[0]).toMatchObject({ type: 'userDetailsResult', id: 'details-1' });
      const details = (responses[0] as ResponseOf<'userDetailsResult'>).result;
      expect(details?.total_ai_credits_used).toBe(3.5);
      expect(details?.days.map(day => day.user_initiated_interaction_count)).toEqual([12]);
    });
  });

  describe('unknown requests', () => {
    it('answers an unknown request type carrying an id with an error', async () => {
      const { responses, send } = await loadWorker();

      await send({ type: 'unexpected', id: 'unknown-1' } as unknown as WorkerRequest);

      expect(responses).toEqual([
        { type: 'error', id: 'unknown-1', error: "Unknown request type 'unexpected'" },
      ]);
    });
  });
});

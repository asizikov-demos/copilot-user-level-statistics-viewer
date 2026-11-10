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
    it('returns reporting quality through worker parsing without exposing new profile projections', async () => {
      const { send, find } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'quality',
        files: [metricFile('quality.ndjson', {
          user_id: 7,
          day: '2026-11-02',
          report_start_day: '2026-11-01',
          report_end_day: '2026-11-03',
          client_telemetry_present: false,
          usage_metrics_requirements: { met: [], unmet: ['vscode/copilot-chat'], unknown: ['1.138.0:'] },
        })],
      });
      const result = find('parseAndAggregateResult');
      expect(result?.result.clients.reportingQuality).toMatchObject({
        summary: { missingTelemetryUsers: 1, belowMinimumUsers: 1 },
        components: [
          { component: 'vscode/copilot-chat', unmetUsers: 1, unknownUsers: 0 },
          { component: '1.138.0:', unmetUsers: 0, unknownUsers: 1 },
        ],
        affectedUsers: [{ userId: 7, missingTelemetryDays: 1, belowMinimumDays: 1 }],
      });
      expect(result?.result.clients.reportingQuality.daily.map(day => day.missingTelemetryUsers)).toEqual([null, 1, null]);
      await send({ type: 'computeUserDetails', id: 'quality-details', userId: 7 });
      expect(find('userDetailsResult')?.result).not.toHaveProperty('telemetryWarnings');
      expect(find('userDetailsResult')?.result).toMatchObject({
        reportingQuality: {
          uploadedDays: 1, telemetryReportedDays: 1, serverOnlyDays: 1,
          daily: [{
            telemetryStatus: 'missing',
            requirementCounts: { met: 0, unmet: 1, unknown: 1 },
            requirements: [
              { component: 'vscode/copilot-chat', status: 'unmet' },
              { component: '1.138.0:', status: 'unknown' },
            ],
          }],
        },
        days: [{
          client_telemetry_present: false,
          usage_metrics_requirements: { met: [], unmet: ['vscode/copilot-chat'], unknown: ['1.138.0:'] },
        }],
      });
      expect(find('error')).toBeUndefined();
    });

    it('returns client traffic through aggregation and on-demand detail messages', async () => {
      const { send, find } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'traffic',
        files: [metricFile('traffic.ndjson', {
          user_id: 1,
          totals_by_client: [{
            client: 'opencode',
            request_count: 2,
            session_count: 0,
            token_usage: { prompt_tokens_sum: 20, output_tokens_sum: 10, avg_tokens_per_request: 15 },
            totals_by_model: [{
              model: 'unknown',
              model_selection_mode: 'future_mode',
              request_count: 2,
              token_usage: { prompt_tokens_sum: 20, output_tokens_sum: 10, avg_tokens_per_request: 15 },
            }],
          }],
        })],
      });
      const result = find('parseAndAggregateResult');
      expect(result?.result.clients.traffic.summary).toMatchObject({
        recordCount: 1, reportedRecords: 1, activeUsers: 1,
        clients: [{ client: 'opencode', requestCount: 2, reportedSessionCount: 0 }],
      });
      await send({ type: 'computeUserDetails', id: 'details', userId: 1 });
      expect(find('userDetailsResult')?.result?.clientTraffic).toEqual(result?.result.clients.traffic);
      expect(find('error')).toBeUndefined();
    });

    it('loads the sample report with varied credits, App usage, client traffic, and recovery stories', async () => {
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

      const { send, find, responses } = await loadWorker();
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

      const appRecords = records.filter(record => record.used_copilot_app);
      expect(new Set(appRecords.map(record => record.user_id)).size).toBeGreaterThan(50);
      expect(result?.result.copilotApp.dailyAppSessionData.reduce((total, day) =>
        total + day.sessionCount, 0
      )).toBe(appRecords.reduce((total, record) =>
        total + record.totals_by_copilot_app.session_count, 0
      ));
      expect(result?.result.clients.traffic.summary.reportedRecords)
        .toBeLessThan(records.length);
      expect(records.some(record => record.totals_by_client?.length === 0)).toBe(true);
      expect(result?.result.clients.traffic.summary.clients.length).toBeGreaterThan(10);
      expect(result?.result.models.selectionModeRequests.modes.every(mode =>
        mode.categories.some(category => category.requestCount > 0)
      )).toBe(true);
      for (const record of records) {
        for (const client of record.totals_by_client ?? []) {
          expect(client.totals_by_model.reduce((total: number, model: { request_count: number }) =>
            total + model.request_count, 0
          )).toBe(client.request_count);
          for (const model of client.totals_by_model) {
            if (model.request_count === 0) {
              expect(model.token_usage.output_tokens_sum).toBe(0);
              expect(model.token_usage.prompt_tokens_sum).toBe(0);
            }
          }
        }
      }

      await send({ type: 'computeUserDetails', id: 'app-story', userId: 429 });
      const appDetails = find('userDetailsResult')?.result;
      expect(appDetails?.dailyCopilotAppImpact.some(day => day.locAdded > 0)).toBe(true);
      expect(appDetails?.clientTraffic.summary.clients.some(client =>
        client.client === 'github_app' && client.requestCount > 0
      )).toBe(true);

      const recovery = result?.result.clients.reportingQuality.affectedUsers
        .find(user => user.userId === 314);
      expect(recovery?.missingTelemetryDays).toBeGreaterThan(0);
      expect(recovery?.lastMissingTelemetryDay
        && recovery.lastMissingTelemetryDay < '2026-06-04').toBe(true);
      expect(recovery?.lastBelowMinimumDay
        && recovery.lastBelowMinimumDay < '2026-06-08').toBe(true);

      await send({ type: 'computeUserDetails', id: 'cli-story', userId: 117 });
      await send({ type: 'computeUserDetails', id: 'multi-story', userId: 358 });
      await send({ type: 'computeUserDetails', id: 'recovery-story', userId: 314 });
      const stories = responses.filter((response): response is ResponseOf<'userDetailsResult'> =>
        response.type === 'userDetailsResult'
      );
      const cliDetails = stories.find(response => response.id === 'cli-story')?.result;
      expect(cliDetails?.cliCustomizations.every(category => category.items.length > 0)).toBe(true);
      const multiDetails = stories.find(response => response.id === 'multi-story')?.result;
      expect(multiDetails?.clientTraffic.summary.clients.length).toBeGreaterThan(4);
      const recoveryDetails = stories.find(response => response.id === 'recovery-story')?.result;
      expect(recoveryDetails?.reportingQuality.daily.some(day =>
        day.day >= '2026-06-08'
        && day.telemetryStatus === 'received'
        && day.requirementCounts?.unmet === 0
      )).toBe(true);
      expect(find('error')).toBeUndefined();
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
    it('memoizes only the last user and invalidates the response on a new upload', async () => {
      const { send, responses } = await loadWorker();
      const calculators = await import('../../domain/calculators');
      const compute = vi.spyOn(calculators, 'computeSingleUserDetailedMetrics');
      await send({
        type: 'parseAndAggregate',
        id: 'initial',
        files: [metricFile('initial.ndjson',
          { user_id: 1, ai_credits_used: 3 },
          { user_id: 2 },
        )],
      });
      await send({ type: 'computeUserDetails', id: 'first', userId: 1 });
      await send({ type: 'computeUserDetails', id: 'repeat', userId: 1 });
      expect(compute).toHaveBeenCalledTimes(1);
      await send({ type: 'computeUserDetails', id: 'other', userId: 2 });
      await send({ type: 'computeUserDetails', id: 'return', userId: 1 });
      expect(compute).toHaveBeenCalledTimes(3);

      await send({
        type: 'parseAndAggregate',
        id: 'replacement',
        files: [metricFile('replacement.ndjson', { user_id: 1, ai_credits_used: 7 })],
      });
      await send({ type: 'computeUserDetails', id: 'updated', userId: 1 });
      expect(compute).toHaveBeenCalledTimes(4);
      expect(responses.at(-1)).toMatchObject({
        type: 'userDetailsResult',
        id: 'updated',
        result: { total_ai_credits_used: 7 },
      });

      await send({
        type: 'parseAndAggregate',
        id: 'failure',
        files: [createFailingFile('failure.ndjson', new Error('unreadable'))],
      });
      await send({ type: 'computeUserDetails', id: 'after-failure', userId: 1 });
      expect(responses.at(-1)).toMatchObject({ type: 'error', id: 'after-failure' });
    });

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

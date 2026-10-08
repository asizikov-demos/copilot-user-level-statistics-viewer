import type { CopilotMetrics } from '../../types/metrics';
import { describe, it, expect } from 'vitest';
import { makeMetric, makeMetricLine } from '../../__tests__/factories/metrics';
import {
  makeFeatureTotal,
  makeIdeTotal,
  makeLanguageFeatureTotal,
  makeLanguageModelTotal,
} from '../../__tests__/factories/metricTotals';
import { parseMetricsLine, parseMetricsLines, appendParsedMetricsFromLines } from '../metricsParser';
import { StringPool } from '../../utils/stringPool';
import { splitNdjsonLines } from '../../utils/ndjsonParser';

const baseParserMetricOverrides: Partial<CopilotMetrics> = {
  user_id: 123,
  user_login: 'testuser',
  user_initiated_interaction_count: 10,
  code_generation_activity_count: 5,
  code_acceptance_activity_count: 3,
  loc_added_sum: 100,
  loc_deleted_sum: 20,
  loc_suggested_to_add_sum: 150,
  loc_suggested_to_delete_sum: 30,
  used_chat: true,
};

const zeroInteractionMetrics = {
  user_initiated_interaction_count: 0,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

function makeParserMetric(overrides: Partial<CopilotMetrics> = {}): CopilotMetrics {
  return makeMetric({ ...baseParserMetricOverrides, ...overrides });
}

function makeParserMetricLine(overrides: Partial<CopilotMetrics> = {}): string {
  return makeMetricLine({ ...baseParserMetricOverrides, ...overrides });
}

function omitMetricField(metric: CopilotMetrics, field: keyof CopilotMetrics): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metric).filter(([key]) => key !== field));
}

describe('metricsParser', () => {
  describe('parseMetricsLine', () => {
    it('should parse valid new schema with required LOC fields', () => {
      const validLine = makeParserMetricLine({
        ai_credits_used: 55.053015,
        ai_adoption_phase: {
          phase_number: 2,
          phase: 'Phase 2',
          version: 'v1',
        },
      });

      const result = parseMetricsLine(validLine);

      expect(result).not.toBeNull();
      expect(result?.user_id).toBe(123);
      expect(result?.user_login).toBe('testuser');
      expect(result?.loc_added_sum).toBe(100);
      expect(result?.loc_deleted_sum).toBe(20);
      expect(result?.loc_suggested_to_add_sum).toBe(150);
      expect(result?.loc_suggested_to_delete_sum).toBe(30);
      expect(result?.ai_credits_used).toBe(55.053015);
      expect(result?.ai_adoption_phase).toEqual({
        phase_number: 2,
        phase: 'Phase 2',
        version: 'v1',
      });
    });

    it('should reject deprecated schema with old LOC fields at root level', () => {
      const deprecatedLine = JSON.stringify({
        ...makeParserMetric(),
        generated_loc_sum: 150, // deprecated field
        accepted_loc_sum: 100, // deprecated field
      });

      const result = parseMetricsLine(deprecatedLine);

      expect(result).toBeNull();
    });

    it('should reject deprecated schema with old LOC fields in nested totals_by_feature', () => {
      const deprecatedNestedLine = JSON.stringify({
        ...makeParserMetric(),
        totals_by_feature: [
          {
            feature: 'code_completion',
            generated_loc_sum: 50, // deprecated field in nested structure
            accepted_loc_sum: 40,
          },
        ],
      });

      const result = parseMetricsLine(deprecatedNestedLine);

      expect(result).toBeNull();
    });

    it.each<keyof CopilotMetrics>([
      'loc_added_sum',
      'loc_deleted_sum',
      'loc_suggested_to_add_sum',
      'loc_suggested_to_delete_sum',
    ])('should reject lines missing required %s', (field) => {
      expect(parseMetricsLine(JSON.stringify(omitMetricField(makeParserMetric(), field)))).toBeNull();
    });

    it.each([
      'not json at all',
      '{incomplete json',
      '{"key": "value"',
      '[]',
      '"just a string"',
      '123',
      'null',
    ])('should return null for malformed line %j', (malformed) => {
      expect(parseMetricsLine(malformed)).toBeNull();
    });

    it('should default used_cli to false when missing', () => {
      const lineWithoutCli = JSON.stringify(omitMetricField(makeParserMetric(), 'used_cli'));

      const result = parseMetricsLine(lineWithoutCli);

      expect(result).not.toBeNull();
      expect(result?.used_cli).toBe(false);
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should preserve Copilot App usage and expose it as a client', () => {
      const appResult = parseMetricsLine(makeParserMetricLine({
        used_copilot_app: true,
        totals_by_copilot_app: {
          session_count: 1,
          request_count: 119,
          prompt_count: 19,
          token_usage: {
            output_tokens_sum: 77310,
            prompt_tokens_sum: 9200984,
            avg_tokens_per_request: 77968.86,
          },
        },
        totals_by_feature: [{
          feature: 'copilot_app',
          user_initiated_interaction_count: 19,
          code_generation_activity_count: 15,
          code_acceptance_activity_count: 14,
          loc_added_sum: 126,
          loc_deleted_sum: 57,
          loc_suggested_to_add_sum: 130,
          loc_suggested_to_delete_sum: 60,
        }],
      }));

      expect(appResult?.used_copilot_app).toBe(true);
      expect(appResult?.totals_by_copilot_app?.request_count).toBe(119);
      expect(appResult?.totals_by_ide).toContainEqual({
        ide: 'copilot_app',
        user_initiated_interaction_count: 19,
        code_generation_activity_count: 15,
        code_acceptance_activity_count: 14,
        loc_added_sum: 126,
        loc_deleted_sum: 57,
        loc_suggested_to_add_sum: 130,
        loc_suggested_to_delete_sum: 60,
      });
    });

    it('should default used_copilot_app to false when missing', () => {
      const lineWithoutApp = JSON.stringify(
        omitMetricField(makeParserMetric(), 'used_copilot_app')
      );

      expect(parseMetricsLine(lineWithoutApp)?.used_copilot_app).toBe(false);
    });

    it('should infer App usage and interactions from App totals only', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        totals_by_copilot_app: {
          session_count: 1,
          request_count: 8,
          prompt_count: 5,
          token_usage: {
            output_tokens_sum: 20,
            prompt_tokens_sum: 30,
            avg_tokens_per_request: 6.25,
          },
        },
      }));

      expect(result?.used_copilot_app).toBe(true);
      expect(result?.totals_by_ide).toContainEqual(expect.objectContaining({
        ide: 'copilot_app',
        user_initiated_interaction_count: 5,
      }));
    });

    it('should infer App usage and interactions from App features only', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        totals_by_feature: [{
          ...zeroInteractionMetrics,
          feature: 'copilot_app',
          user_initiated_interaction_count: 7,
        }],
      }));

      expect(result?.used_copilot_app).toBe(true);
      expect(result?.totals_by_ide).toContainEqual(expect.objectContaining({
        ide: 'copilot_app',
        user_initiated_interaction_count: 7,
      }));
    });

    it('should prefer App feature interactions when App totals differ', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        totals_by_copilot_app: {
          session_count: 1,
          request_count: 8,
          prompt_count: 5,
          token_usage: {
            output_tokens_sum: 20,
            prompt_tokens_sum: 30,
            avg_tokens_per_request: 6.25,
          },
        },
        totals_by_feature: [{
          ...zeroInteractionMetrics,
          feature: 'copilot_app',
          user_initiated_interaction_count: 0,
        }],
      }));

      expect(result?.totals_by_ide).toContainEqual(expect.objectContaining({
        ide: 'copilot_app',
        user_initiated_interaction_count: 0,
      }));
    });

    it('should not duplicate an explicit Copilot App IDE client', () => {
      const appIde = {
        ide: 'copilot_app',
        user_initiated_interaction_count: 7,
        code_generation_activity_count: 6,
        code_acceptance_activity_count: 5,
        loc_added_sum: 4,
        loc_deleted_sum: 3,
        loc_suggested_to_add_sum: 2,
        loc_suggested_to_delete_sum: 1,
      };

      const result = parseMetricsLine(makeParserMetricLine({
        used_copilot_app: true,
        totals_by_ide: [appIde],
        totals_by_feature: [{
          ...appIde,
          feature: 'copilot_app',
        }],
      }));

      expect(
        result?.totals_by_ide.filter((entry) => entry.ide === 'copilot_app')
      ).toEqual([appIde]);
    });

    it('should replace an explicit App client interaction count with the feature total', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        used_copilot_app: true,
        totals_by_ide: [{
          ...zeroInteractionMetrics,
          ide: 'copilot_app',
          user_initiated_interaction_count: 0,
        }],
        totals_by_feature: [{
          ...zeroInteractionMetrics,
          feature: 'copilot_app',
          user_initiated_interaction_count: 2,
        }],
      }));

      expect(
        result?.totals_by_ide.filter((entry) => entry.ide === 'copilot_app')
      ).toEqual([
        expect.objectContaining({
          ide: 'copilot_app',
          user_initiated_interaction_count: 2,
        }),
      ]);
    });

    it('should infer App usage from an active explicit App client', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        used_copilot_app: false,
        totals_by_ide: [{
          ...zeroInteractionMetrics,
          ide: 'copilot_app',
          user_initiated_interaction_count: 2,
        }],
      }));

      expect(result?.used_copilot_app).toBe(true);
    });

    it('should infer App usage from suggested LOC in an explicit App client', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        used_copilot_app: false,
        totals_by_ide: [{
          ...zeroInteractionMetrics,
          ide: 'copilot_app',
          loc_suggested_to_add_sum: 4,
        }],
      }));

      expect(result?.used_copilot_app).toBe(true);
    });

    it('should apply the prompt fallback to an existing zero-interaction App client', () => {
      const result = parseMetricsLine(makeParserMetricLine({
        totals_by_copilot_app: {
          session_count: 1,
          request_count: 8,
          prompt_count: 5,
          token_usage: {
            output_tokens_sum: 20,
            prompt_tokens_sum: 30,
            avg_tokens_per_request: 6.25,
          },
        },
        totals_by_ide: [{
          ...zeroInteractionMetrics,
          ide: 'copilot_app',
          user_initiated_interaction_count: 0,
        }],
      }));

      expect(result?.totals_by_ide).toContainEqual(expect.objectContaining({
        ide: 'copilot_app',
        user_initiated_interaction_count: 5,
      }));
    });

    it('should reject lines with invalid ai_credits_used', () => {
      const invalidCreditsLine = JSON.stringify({
        ...makeParserMetric(),
        ai_credits_used: '55.05',
      });

      expect(parseMetricsLine(invalidCreditsLine)).toBeNull();
    });

    it.each([
      { name: 'omitted', line: () => JSON.stringify(omitMetricField(makeParserMetric(), 'ai_credits_used')) },
      { name: 'null', line: () => JSON.stringify({ ...makeParserMetric(), ai_credits_used: null }) },
    ])('should default $name ai_credits_used to zero', ({ line }) => {
      expect(parseMetricsLine(line())?.ai_credits_used).toBe(0);
    });

    it.each([
      { name: 'cloud-agent flag set', flags: { used_copilot_cloud_agent: true }, expected: true },
      { name: 'cloud-agent flag false', flags: { used_copilot_cloud_agent: false }, expected: false },
      { name: 'only the retired coding-agent flag set', flags: { used_copilot_coding_agent: true }, expected: false },
      { name: 'no agent flags', flags: {}, expected: false },
    ])('should normalize both cloud-agent fields when $name', ({ flags, expected }) => {
      const base: Record<string, unknown> = { ...makeParserMetric() };
      delete base.used_copilot_coding_agent;
      delete base.used_copilot_cloud_agent;

      const result = parseMetricsLine(JSON.stringify({ ...base, ...flags }));

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(expected);
      expect(result?.used_copilot_cloud_agent).toBe(expected);
    });


    it('should normalize language names and skip malformed language totals', () => {
      const line = JSON.stringify({
        ...makeParserMetric(),
        totals_by_language_feature: [null, { language: 42 }, makeLanguageFeatureTotal('ts', 'code_completion')],
        totals_by_language_model: [makeLanguageModelTotal('puml', 'gpt-4.1')],
      });

      const result = parseMetricsLine(line);

      expect(result?.totals_by_language_feature[2]?.language).toBe('TypeScript');
      expect(result?.totals_by_language_model[0]?.language).toBe('PlantUML');
    });

    it('should tolerate non-array language totals', () => {
      const line = JSON.stringify({ ...makeParserMetric(), totals_by_language_model: 'not-an-array' });

      expect(parseMetricsLine(line)).not.toBeNull();
    });

    it('should reuse interned strings across lines, including normalized language aliases', () => {
      const pool = new StringPool();
      const lineFor = (userId: number, language: string) => makeParserMetricLine({
        user_id: userId,
        totals_by_ide: [makeIdeTotal('vscode', 5)],
        totals_by_feature: [makeFeatureTotal('code_completion', 3)],
        totals_by_language_feature: [makeLanguageFeatureTotal(language, 'code_completion')],
        totals_by_language_model: [makeLanguageModelTotal(language, 'gpt-4.1')],
        totals_by_model_feature: [],
      });

      expect(parseMetricsLine(lineFor(123, 'typescript'), pool)).not.toBeNull();
      const poolSizeAfterFirstParse = pool.size;
      expect(parseMetricsLine(lineFor(456, 'ts'), pool)).not.toBeNull();

      expect(poolSizeAfterFirstParse).toBeGreaterThan(0);
      expect(pool.size).toBe(poolSizeAfterFirstParse);
    });
  });

  describe('shared line consumption helpers', () => {
    const baseRecord = makeMetric({
      ...baseParserMetricOverrides,
      user_login: 'user1',
    });

    it('should parse mixed NDJSON line collections consistently', () => {
      const deprecatedLine = JSON.stringify({ ...baseRecord, generated_loc_sum: 100 });
      const missingLocLine = JSON.stringify(omitMetricField(baseRecord, 'loc_added_sum'));
      const secondValidLine = JSON.stringify({ ...baseRecord, user_id: 456, user_login: 'user2' });

      const lines = splitNdjsonLines(
        `${JSON.stringify(baseRecord)}\n${deprecatedLine}\n${missingLocLine}\ninvalid json\n${secondValidLine}`
      );

      const results = parseMetricsLines(lines);

      expect(results).toHaveLength(2);
      expect(results.map(metric => metric.user_id)).toEqual([123, 456]);
    });

    it('should append parsed metrics and return accepted count', () => {
      const metrics: CopilotMetrics[] = [];
      const pool = new StringPool();
      const secondValidLine = JSON.stringify({ ...baseRecord, user_id: 456, user_login: 'user2' });
      const lines = [
        { line: JSON.stringify(baseRecord) },
        { line: 'invalid json' },
        { line: secondValidLine },
      ];

      const accepted = appendParsedMetricsFromLines(lines, metrics, pool);

      expect(accepted).toBe(2);
      expect(metrics).toHaveLength(2);
      expect(metrics.map(metric => metric.user_id)).toEqual([123, 456]);
    });
  });
});

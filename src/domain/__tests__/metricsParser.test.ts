import type { CopilotMetrics } from '../../types/metrics';
import { describe, it, expect } from 'vitest';
import { makeMetric, makeMetricLine, makeNdjson } from '../../__tests__/factories/metrics';
import { parseMetricsLine, parseMetricsFile } from '../metricsParser';
import { StringPool } from '../../utils/stringPool';

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

    it('should reject lines missing required LOC fields', () => {
      const missingFieldsTests = [
        { field: 'loc_added_sum' },
        { field: 'loc_deleted_sum' },
        { field: 'loc_suggested_to_add_sum' },
        { field: 'loc_suggested_to_delete_sum' },
      ];

      missingFieldsTests.forEach(({ field }) => {
        const line = JSON.stringify(omitMetricField(makeParserMetric(), field));
        const result = parseMetricsLine(line);

        expect(result).toBeNull();
      });
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedCases = [
        'not json at all',
        '{incomplete json',
        '{"key": "value"', // truncated
        '[]', // array instead of object
        '"just a string"', // primitive
        '123', // number
        'null',
      ];

      malformedCases.forEach((malformed) => {
        const result = parseMetricsLine(malformed);
        expect(result).toBeNull();
      });
    });

    it('should default used_cli to false when missing', () => {
      const lineWithoutCli = JSON.stringify(omitMetricField(makeParserMetric(), 'used_cli'));

      const result = parseMetricsLine(lineWithoutCli);

      expect(result).not.toBeNull();
      expect(result?.used_cli).toBe(false);
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should reject lines with invalid ai_credits_used', () => {
      const invalidCreditsLine = JSON.stringify({
        ...makeParserMetric(),
        ai_credits_used: '55.05',
      });

      expect(parseMetricsLine(invalidCreditsLine)).toBeNull();
    });

    it('should default omitted ai_credits_used to zero', () => {
      const lineWithoutCredits = JSON.stringify(omitMetricField(makeParserMetric(), 'ai_credits_used'));

      const result = parseMetricsLine(lineWithoutCredits);

      expect(result).not.toBeNull();
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should default null ai_credits_used to zero', () => {
      const lineWithNullCredits = JSON.stringify({
        ...makeParserMetric(),
        ai_credits_used: null,
      });

      const result = parseMetricsLine(lineWithNullCredits);

      expect(result).not.toBeNull();
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should default used_copilot_coding_agent to false when missing', () => {
      const lineWithoutCodingAgent = JSON.stringify(omitMetricField(makeParserMetric(), 'used_copilot_coding_agent'));

      const result = parseMetricsLine(lineWithoutCodingAgent);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(false);
      expect(result?.used_copilot_cloud_agent).toBe(false);
    });

    it('should prefer used_copilot_cloud_agent over legacy used_copilot_coding_agent', () => {
      const line = makeParserMetricLine({
        used_copilot_coding_agent: true,
        used_copilot_cloud_agent: false,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(false);
      expect(result?.used_copilot_cloud_agent).toBe(false);
    });

    it('should fallback to legacy used_copilot_coding_agent when cloud-agent flag is missing', () => {
      const line = makeParserMetricLine({
        used_copilot_coding_agent: true,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(true);
      expect(result?.used_copilot_cloud_agent).toBe(true);
    });

    it('should normalize language names in parsed language arrays', () => {
      const line = makeParserMetricLine({
        totals_by_language_feature: [
          {
            language: 'ts',
            feature: 'code_completion',
            code_generation_activity_count: 2,
            code_acceptance_activity_count: 1,
            loc_added_sum: 10,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 12,
            loc_suggested_to_delete_sum: 3,
          },
        ],
        totals_by_language_model: [
          {
            language: 'puml',
            model: 'gpt-4.1',
            code_generation_activity_count: 3,
            code_acceptance_activity_count: 1,
            loc_added_sum: 11,
            loc_deleted_sum: 4,
            loc_suggested_to_add_sum: 14,
            loc_suggested_to_delete_sum: 5,
          },
        ],
        totals_by_model_feature: [],
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.totals_by_language_feature[0]?.language).toBe('TypeScript');
      expect(result?.totals_by_language_model[0]?.language).toBe('PlantUML');
    });

    it('should ignore missing or malformed language totals during normalization', () => {
      const line = JSON.stringify({
        ...makeParserMetric(),
        totals_by_language_feature: [null, { language: 42 }, { language: 'ts' }],
        totals_by_language_model: 'not-an-array',
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.totals_by_language_feature[2]?.language).toBe('TypeScript');
    });

    it('should apply string interning when pool is provided', () => {
      const pool = new StringPool();
      const firstLine = makeParserMetricLine({
        totals_by_ide: [
          { ide: 'vscode', user_initiated_interaction_count: 5 },
        ],
        totals_by_feature: [
          { feature: 'code_completion', user_initiated_interaction_count: 3 },
        ],
        totals_by_language_feature: [
          {
            language: 'typescript',
            feature: 'code_completion',
            code_generation_activity_count: 2,
            code_acceptance_activity_count: 1,
            loc_added_sum: 10,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 12,
            loc_suggested_to_delete_sum: 3,
          },
        ],
        totals_by_language_model: [
          {
            language: 'typescript',
            model: 'gpt-4.1',
            code_generation_activity_count: 2,
            code_acceptance_activity_count: 1,
            loc_added_sum: 10,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 12,
            loc_suggested_to_delete_sum: 3,
          },
        ],
        totals_by_model_feature: [],
      });

      const firstResult = parseMetricsLine(firstLine, pool);
      const poolSizeAfterFirstParse = pool.size;

      const secondLine = makeParserMetricLine({
        user_id: 456,
        totals_by_ide: [
          { ide: 'vscode', user_initiated_interaction_count: 5 },
        ],
        totals_by_feature: [
          { feature: 'code_completion', user_initiated_interaction_count: 3 },
        ],
        totals_by_language_feature: [
          {
            language: 'ts',
            feature: 'code_completion',
            code_generation_activity_count: 2,
            code_acceptance_activity_count: 1,
            loc_added_sum: 10,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 12,
            loc_suggested_to_delete_sum: 3,
          },
        ],
        totals_by_language_model: [
          {
            language: 'ts',
            model: 'gpt-4.1',
            code_generation_activity_count: 2,
            code_acceptance_activity_count: 1,
            loc_added_sum: 10,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 12,
            loc_suggested_to_delete_sum: 3,
          },
        ],
        totals_by_model_feature: [],
      });

      const secondResult = parseMetricsLine(secondLine, pool);

      expect(firstResult).not.toBeNull();
      expect(secondResult).not.toBeNull();
      expect(firstResult?.totals_by_language_feature[0]?.language).toBe('TypeScript');
      expect(secondResult?.totals_by_language_feature[0]?.language).toBe('TypeScript');
      // After interning, pool should have these strings
      expect(pool.size).toBeGreaterThan(0);
      expect(pool.size).toBe(poolSizeAfterFirstParse);
    });
  });

  describe('parseMetricsFile', () => {
    const baseRecord = makeMetric({
      ...baseParserMetricOverrides,
      user_login: 'user1',
    });

    it('should parse multiple valid lines and filter invalid ones', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };
      const deprecatedLine = { ...baseRecord, generated_loc_sum: 100 };

      const fileContent = makeNdjson([
        baseRecord,
        '', // empty line
        validLine2,
        'invalid json',
        deprecatedLine,
      ]);

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(2);
      expect(results[0].user_id).toBe(123);
      expect(results[1].user_id).toBe(456);
    });

    it('should handle CRLF line endings', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };

      const fileContent = makeNdjson([baseRecord, validLine2], '\r\n');

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(2);
      expect(results[0].user_id).toBe(123);
      expect(results[1].user_id).toBe(456);
    });

    it('should handle file without trailing newline', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };

      const fileContent = makeNdjson([baseRecord, validLine2]);

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(2);
    });

    it('should skip deprecated LOC schema records', () => {
      const deprecatedRoot = { ...baseRecord, generated_loc_sum: 200 };
      const deprecatedNested = {
        ...baseRecord,
        user_id: 999,
        totals_by_feature: [{ feature: 'code_completion', generated_loc_sum: 10 }],
      };

      const fileContent = makeNdjson([baseRecord, deprecatedRoot, deprecatedNested]);

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(1);
      expect(results[0].user_id).toBe(123);
    });

    it('should skip records missing new LOC fields', () => {
      const missingLoc = omitMetricField(baseRecord, 'loc_added_sum');

      const fileContent = makeNdjson([baseRecord, missingLoc]);

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(1);
      expect(results[0].user_id).toBe(123);
    });

    it('should return empty array for empty input', () => {
      expect(parseMetricsFile('')).toEqual([]);
      expect(parseMetricsFile('   ')).toEqual([]);
      expect(parseMetricsFile('\n\n')).toEqual([]);
    });
  });
});

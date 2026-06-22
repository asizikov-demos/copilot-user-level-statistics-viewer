import { describe, it, expect } from 'vitest';
import { parseMetricsLine, parseMetricsFile } from '../metricsParser';
import { StringPool } from '../../utils/stringPool';

describe('metricsParser', () => {
  describe('parseMetricsLine', () => {
    it('should parse valid new schema with required LOC fields', () => {
      const validLine = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        ai_credits_used: 55.053015,
        totals_by_ide: [],
        totals_by_feature: [],
        totals_by_language_feature: [],
        totals_by_language_model: [],
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
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
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        generated_loc_sum: 150, // deprecated field
        accepted_loc_sum: 100, // deprecated field
        totals_by_ide: [],
        totals_by_feature: [],
        totals_by_language_feature: [],
        totals_by_language_model: [],
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
      });

      const result = parseMetricsLine(deprecatedLine);

      expect(result).toBeNull();
    });

    it('should reject deprecated schema with old LOC fields in nested totals_by_feature', () => {
      const deprecatedNestedLine = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        totals_by_ide: [],
        totals_by_feature: [
          {
            feature: 'code_completion',
            generated_loc_sum: 50, // deprecated field in nested structure
            accepted_loc_sum: 40,
          },
        ],
        totals_by_language_feature: [],
        totals_by_language_model: [],
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
      });

      const result = parseMetricsLine(deprecatedNestedLine);

      expect(result).toBeNull();
    });

    it('should reject lines missing required LOC fields', () => {
      const missingFieldsTests = [
        { field: 'loc_added_sum', value: 'loc_added_sum' },
        { field: 'loc_deleted_sum', value: 'loc_deleted_sum' },
        { field: 'loc_suggested_to_add_sum', value: 'loc_suggested_to_add_sum' },
        { field: 'loc_suggested_to_delete_sum', value: 'loc_suggested_to_delete_sum' },
      ];

      missingFieldsTests.forEach(({ field }) => {
        const baseMetric = {
          report_start_day: '2024-01-01',
          report_end_day: '2024-01-31',
          day: '2024-01-15',
          enterprise_id: 'test-enterprise',
          user_id: 123,
          user_login: 'testuser',
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

        // Remove the field being tested
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (baseMetric as any)[field];

        const line = JSON.stringify(baseMetric);
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
      const lineWithoutCli = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
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
        // used_cli is missing
      });

      const result = parseMetricsLine(lineWithoutCli);

      expect(result).not.toBeNull();
      expect(result?.used_cli).toBe(false);
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should reject lines with invalid ai_credits_used', () => {
      const invalidCreditsLine = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        ai_credits_used: '55.05',
        totals_by_ide: [],
        totals_by_feature: [],
        totals_by_language_feature: [],
        totals_by_language_model: [],
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
      });

      expect(parseMetricsLine(invalidCreditsLine)).toBeNull();
    });

    it('should default null ai_credits_used to zero', () => {
      const lineWithNullCredits = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        ai_credits_used: null,
        totals_by_ide: [],
        totals_by_feature: [],
        totals_by_language_feature: [],
        totals_by_language_model: [],
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
      });

      const result = parseMetricsLine(lineWithNullCredits);

      expect(result).not.toBeNull();
      expect(result?.ai_credits_used).toBe(0);
    });

    it('should default used_copilot_coding_agent to false when missing', () => {
      const lineWithoutCodingAgent = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
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
        used_cli: false,
      });

      const result = parseMetricsLine(lineWithoutCodingAgent);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(false);
      expect(result?.used_copilot_cloud_agent).toBe(false);
    });

    it('should prefer used_copilot_cloud_agent over legacy used_copilot_coding_agent', () => {
      const line = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
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
        used_cli: false,
        used_copilot_coding_agent: true,
        used_copilot_cloud_agent: false,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(false);
      expect(result?.used_copilot_cloud_agent).toBe(false);
    });

    it('should fallback to legacy used_copilot_coding_agent when cloud-agent flag is missing', () => {
      const line = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
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
        used_cli: false,
        used_copilot_coding_agent: true,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.used_copilot_coding_agent).toBe(true);
      expect(result?.used_copilot_cloud_agent).toBe(true);
    });

    it('should normalize language names in parsed language arrays', () => {
      const line = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        totals_by_ide: [],
        totals_by_feature: [],
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
        used_agent: false,
        used_chat: true,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.totals_by_language_feature[0]?.language).toBe('TypeScript');
      expect(result?.totals_by_language_model[0]?.language).toBe('PlantUML');
    });

    it('should ignore missing or malformed language totals during normalization', () => {
      const line = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
        totals_by_ide: [],
        totals_by_feature: [],
        totals_by_language_feature: [null, { language: 42 }, { language: 'ts' }],
        totals_by_language_model: 'not-an-array',
        totals_by_model_feature: [],
        used_agent: false,
        used_chat: true,
      });

      const result = parseMetricsLine(line);

      expect(result).not.toBeNull();
      expect(result?.totals_by_language_feature[2]?.language).toBe('TypeScript');
    });

    it('should apply string interning when pool is provided', () => {
      const pool = new StringPool();
      const firstLine = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 123,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
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
        used_agent: false,
        used_chat: true,
      });

      const firstResult = parseMetricsLine(firstLine, pool);
      const poolSizeAfterFirstParse = pool.size;

      const secondLine = JSON.stringify({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        day: '2024-01-15',
        enterprise_id: 'test-enterprise',
        user_id: 456,
        user_login: 'testuser',
        user_initiated_interaction_count: 10,
        code_generation_activity_count: 5,
        code_acceptance_activity_count: 3,
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        loc_suggested_to_add_sum: 150,
        loc_suggested_to_delete_sum: 30,
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
        used_agent: false,
        used_chat: true,
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

    it('should parse multiple valid lines and filter invalid ones', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };
      const deprecatedLine = { ...baseRecord, generated_loc_sum: 100 };

      const fileContent = [
        JSON.stringify(baseRecord),
        '', // empty line
        JSON.stringify(validLine2),
        'invalid json',
        JSON.stringify(deprecatedLine),
      ].join('\n');

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(2);
      expect(results[0].user_id).toBe(123);
      expect(results[1].user_id).toBe(456);
    });

    it('should handle CRLF line endings', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };

      const fileContent = [
        JSON.stringify(baseRecord),
        JSON.stringify(validLine2),
      ].join('\r\n');

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(2);
      expect(results[0].user_id).toBe(123);
      expect(results[1].user_id).toBe(456);
    });

    it('should handle file without trailing newline', () => {
      const validLine2 = { ...baseRecord, user_id: 456, user_login: 'user2' };

      // join('\n') produces no trailing newline
      const fileContent = [JSON.stringify(baseRecord), JSON.stringify(validLine2)].join('\n');

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

      const fileContent = [
        JSON.stringify(baseRecord),
        JSON.stringify(deprecatedRoot),
        JSON.stringify(deprecatedNested),
      ].join('\n');

      const results = parseMetricsFile(fileContent);

      expect(results).toHaveLength(1);
      expect(results[0].user_id).toBe(123);
    });

    it('should skip records missing new LOC fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missingLoc = { ...baseRecord } as any;
      delete missingLoc.loc_added_sum;

      const fileContent = [JSON.stringify(baseRecord), JSON.stringify(missingLoc)].join('\n');

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

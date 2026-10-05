import { describe, expect, it } from 'vitest';
import {
  accumulateLanguageStats,
  computeLanguageStats,
  createLanguageAccumulator,
} from '../languageCalculator';

describe('normalized language statistics', () => {
  it('normalizes the example cohorts to four and eight generations per observed user', () => {
    const accumulator = createLanguageAccumulator();
    for (let user = 1; user <= 150; user++) {
      accumulateLanguageStats(accumulator, user, 'typescript', 4, 0, 0, 0, 0, 0);
      if (user <= 50) {
        accumulateLanguageStats(accumulator, user, 'kotlin', 8, 0, 0, 0, 0, 0);
      }
    }

    const [typescript, kotlin] = computeLanguageStats(accumulator);
    expect(typescript).toMatchObject({
      uniqueUsers: 150, totalGenerations: 600, generationsPerUser: 4, generationShare: 0.6,
    });
    expect(kotlin).toMatchObject({
      uniqueUsers: 50, totalGenerations: 400, generationsPerUser: 8, generationShare: 0.4,
    });
    expect(kotlin.generationsPerUser! / typescript.generationsPerUser! - 1).toBe(1);
  });

  it('deduplicates repeated users across days/features and includes zero-activity entries', () => {
    const accumulator = createLanguageAccumulator();
    accumulateLanguageStats(accumulator, 1, 'typescript', 3, 1, 0, 0, 0, 0);
    accumulateLanguageStats(accumulator, 1, 'typescript', 2, 2, 0, 0, 0, 0);
    accumulateLanguageStats(accumulator, 2, 'typescript', 0, 0, 0, 0, 0, 0);

    expect(computeLanguageStats(accumulator)[0]).toMatchObject({
      uniqueUsers: 2, totalGenerations: 5, totalAcceptances: 3,
      totalEngagements: 8, generationsPerUser: 2.5, generationShare: 1,
    });
  });

  it('uses all language rows including unknown buckets, before top-ten disclosure', () => {
    const accumulator = createLanguageAccumulator();
    for (let index = 0; index < 11; index++) {
      accumulateLanguageStats(accumulator, 1, `language-${index}`, 10, 0, 0, 0, 0, 0);
    }
    accumulateLanguageStats(accumulator, 1, 'unknown', 5, 0, 0, 0, 0, 0);
    const result = computeLanguageStats(accumulator);
    expect(result).toHaveLength(12);
    expect(result[0].generationShare).toBe(10 / 115);
    expect(result[11]).toMatchObject({ language: 'unknown', generationShare: 5 / 115 });
    expect(result.reduce((sum, language) => sum + language.generationShare!, 0)).toBeCloseTo(1);
  });

  it('preserves reported zero numerators and marks zero denominators as unavailable', () => {
    const accumulator = createLanguageAccumulator();
    accumulateLanguageStats(accumulator, 1, 'zero', 0, 0, 0, 0, 0, 0);
    expect(computeLanguageStats(accumulator)[0]).toMatchObject({
      generationsPerUser: 0, generationShare: null,
    });
    accumulator.languageStatsMap.get('zero')!.users.clear();
    expect(computeLanguageStats(accumulator)[0].generationsPerUser).toBeNull();
    accumulateLanguageStats(accumulator, 2, 'nonzero', 1, 0, 0, 0, 0, 0);
    expect(computeLanguageStats(accumulator).find(row => row.language === 'zero')?.generationShare).toBe(0);
    expect(computeLanguageStats(createLanguageAccumulator())).toEqual([]);
  });
});

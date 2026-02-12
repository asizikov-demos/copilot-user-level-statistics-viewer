import type { LanguageFeatureImpactData, DailyLanguageChartData } from '../../types/metrics';

export interface LanguageFeatureImpactAccumulator {
  languageFeatureMap: Map<string, Map<string, number>>;
  allFeatures: Set<string>;
  languageTotals: Map<string, number>;
  dailyGenerations: Map<string, Map<string, number>>;
  dailyLoc: Map<string, Map<string, number>>;
  generationTotals: Map<string, number>;
  locTotals: Map<string, number>;
}

export function createLanguageFeatureImpactAccumulator(): LanguageFeatureImpactAccumulator {
  return {
    languageFeatureMap: new Map(),
    allFeatures: new Set(),
    languageTotals: new Map(),
    dailyGenerations: new Map(),
    dailyLoc: new Map(),
    generationTotals: new Map(),
    locTotals: new Map(),
  };
}

export function accumulateLanguageFeatureImpact(
  accumulator: LanguageFeatureImpactAccumulator,
  langFeature: {
    language: string;
    feature: string;
    loc_added_sum: number;
    loc_deleted_sum: number;
  }
): void {
  const { language, feature } = langFeature;
  if (!language || language === 'unknown') return;

  const locImpact = langFeature.loc_added_sum + langFeature.loc_deleted_sum;
  accumulator.allFeatures.add(feature);

  if (!accumulator.languageFeatureMap.has(language)) {
    accumulator.languageFeatureMap.set(language, new Map());
  }
  const featureMap = accumulator.languageFeatureMap.get(language)!;
  featureMap.set(feature, (featureMap.get(feature) || 0) + locImpact);

  accumulator.languageTotals.set(
    language,
    (accumulator.languageTotals.get(language) || 0) + locImpact
  );
}

export function accumulateDailyLanguage(
  accumulator: LanguageFeatureImpactAccumulator,
  date: string,
  langFeature: {
    language: string;
    code_generation_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
  }
): void {
  const { language } = langFeature;
  const genValue = langFeature.code_generation_activity_count;
  const locValue = langFeature.loc_added_sum + langFeature.loc_deleted_sum;

  if (!accumulator.dailyGenerations.has(date)) {
    accumulator.dailyGenerations.set(date, new Map());
  }
  const genMap = accumulator.dailyGenerations.get(date)!;
  genMap.set(language, (genMap.get(language) || 0) + genValue);
  accumulator.generationTotals.set(
    language,
    (accumulator.generationTotals.get(language) || 0) + genValue
  );

  if (!accumulator.dailyLoc.has(date)) {
    accumulator.dailyLoc.set(date, new Map());
  }
  const locMap = accumulator.dailyLoc.get(date)!;
  locMap.set(language, (locMap.get(language) || 0) + locValue);
  accumulator.locTotals.set(
    language,
    (accumulator.locTotals.get(language) || 0) + locValue
  );
}

export function computeLanguageFeatureImpactData(
  accumulator: LanguageFeatureImpactAccumulator
): LanguageFeatureImpactData {
  const sortedLanguages = Array.from(accumulator.languageTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang]) => lang);

  const sortedFeatures = Array.from(accumulator.allFeatures).sort();

  const rows = sortedLanguages.map((language) => {
    const featureMap = accumulator.languageFeatureMap.get(language) || new Map();
    const features: Record<string, number> = {};
    for (const feature of sortedFeatures) {
      features[feature] = featureMap.get(feature) || 0;
    }
    return {
      language,
      total: accumulator.languageTotals.get(language) || 0,
      features,
    };
  });

  return { rows, features: sortedFeatures };
}

function buildDailyChartData(
  dailyMap: Map<string, Map<string, number>>,
  totals: Map<string, number>
): DailyLanguageChartData {
  const dates = Array.from(dailyMap.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const languages = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang]) => lang);

  const data: Record<string, Record<string, number>> = {};
  for (const date of dates) {
    const langMap = dailyMap.get(date)!;
    data[date] = {};
    for (const lang of languages) {
      data[date][lang] = langMap.get(lang) || 0;
    }
  }

  const totalsRecord: Record<string, number> = {};
  for (const lang of languages) {
    totalsRecord[lang] = totals.get(lang) || 0;
  }

  return { dates, languages, data, totals: totalsRecord };
}

export function computeDailyLanguageChartData(
  accumulator: LanguageFeatureImpactAccumulator,
  variant: 'generations' | 'loc'
): DailyLanguageChartData {
  if (variant === 'generations') {
    return buildDailyChartData(accumulator.dailyGenerations, accumulator.generationTotals);
  }
  return buildDailyChartData(accumulator.dailyLoc, accumulator.locTotals);
}

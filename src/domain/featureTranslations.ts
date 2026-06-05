import { FEATURE_TRANSLATIONS, getFeatureLabel } from './featureCategories';

/**
 * Maps technical feature names to human-readable labels
 */
export const featureTranslations: Record<string, string> = FEATURE_TRANSLATIONS;

/**
 * Translates a technical feature name to a human-readable label
 * @param feature The technical feature name
 * @returns The human-readable label or the original feature name if no translation exists
 */
export function translateFeature(feature: string): string {
  return getFeatureLabel(feature) || feature;
}

/**
 * Gets all available feature translations
 * @returns An array of objects with technical names and their translations
 */
export function getAllFeatureTranslations(): Array<{ technical: string; display: string }> {
  return Object.entries(featureTranslations).map(([technical, display]) => ({
    technical,
    display,
  }));
}

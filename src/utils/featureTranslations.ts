/**
 * Maps technical feature names to human-readable labels
 */
export const featureTranslations: Record<string, string> = {
  'chat_panel_edit_mode': 'Chat: Edit Mode',
  'chat_panel_ask_mode': 'Chat: Ask Mode',
  'chat_panel_agent_mode': 'Chat: Agent Mode',
  'code_completion': 'Code Completion',
  'chat_panel_unknown_mode': 'Chat: Unknown Mode',
  'chat_inline': 'Chat: Inline',
};

/**
 * Translates a technical feature name to a human-readable label
 * @param feature The technical feature name
 * @returns The human-readable label or the original feature name if no translation exists
 */
export function translateFeature(feature: string): string {
  return featureTranslations[feature] || feature;
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

const CLI_FEATURES = new Set(['copilot_cli', 'cli_agent']);

export function isCliFeature(feature: string): boolean {
  return CLI_FEATURES.has(feature);
}

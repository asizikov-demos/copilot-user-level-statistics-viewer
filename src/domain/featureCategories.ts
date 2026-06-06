export type ChatModeBucket = 'ask' | 'agent' | 'edit' | 'inline' | 'plan';

interface FeatureTaxonomyEntry {
  feature: string;
  label: string;
  isCli?: boolean;
  isChat?: boolean;
  isAgent?: boolean;
  isJoinedImpact?: boolean;
  chatModeBucket?: ChatModeBucket;
}

const FEATURE_TAXONOMY: readonly FeatureTaxonomyEntry[] = [
  {
    feature: 'chat_panel_edit_mode',
    label: 'Chat: Edit Mode',
    isChat: true,
    isJoinedImpact: true,
    chatModeBucket: 'edit',
  },
  {
    feature: 'chat_panel_ask_mode',
    label: 'Chat: Ask Mode',
    isChat: true,
    isJoinedImpact: true,
    chatModeBucket: 'ask',
  },
  {
    feature: 'chat_panel_agent_mode',
    label: 'Chat: Agent Mode',
    isChat: true,
    isAgent: true,
    isJoinedImpact: true,
    chatModeBucket: 'agent',
  },
  {
    feature: 'chat_panel_custom_mode',
    label: 'Chat: Custom Mode',
  },
  {
    feature: 'chat_panel_plan_mode',
    label: 'Chat: Plan Mode',
    isChat: true,
    chatModeBucket: 'plan',
  },
  {
    feature: 'code_completion',
    label: 'Code Completion',
    isJoinedImpact: true,
  },
  {
    feature: 'chat_panel_unknown_mode',
    label: 'Chat: Unknown Mode',
    isChat: true,
  },
  {
    feature: 'chat_inline',
    label: 'Chat: Inline',
    isChat: true,
    isJoinedImpact: true,
    chatModeBucket: 'inline',
  },
  {
    feature: 'agent_edit',
    label: 'Agent Edit',
    isAgent: true,
    isJoinedImpact: true,
  },
  {
    feature: 'cli_agent',
    label: 'CLI Agent',
    isCli: true,
    isJoinedImpact: true,
  },
  {
    feature: 'copilot_cli',
    label: 'Copilot CLI',
    isCli: true,
    isJoinedImpact: true,
  },
];

const FEATURE_LOOKUP = new Map(FEATURE_TAXONOMY.map((entry) => [entry.feature, entry]));
const FEATURE_LABELS = Object.fromEntries(
  FEATURE_TAXONOMY.map((entry) => [entry.feature, entry.label])
) as Record<string, string>;
const CLI_FEATURES = new Set(FEATURE_TAXONOMY.filter((entry) => entry.isCli).map((entry) => entry.feature));
const CHAT_FEATURES = new Set(FEATURE_TAXONOMY.filter((entry) => entry.isChat).map((entry) => entry.feature));
const AGENT_FEATURES = new Set(FEATURE_TAXONOMY.filter((entry) => entry.isAgent).map((entry) => entry.feature));
const JOINED_IMPACT_FEATURES = new Set(FEATURE_TAXONOMY.filter((entry) => entry.isJoinedImpact).map((entry) => entry.feature));

export const FEATURE_TRANSLATIONS: Record<string, string> = FEATURE_LABELS;

export const FEATURE_ADOPTION_CHART_METADATA = [
  { key: 'totalUsers', label: 'Total Users', description: 'All users in the dataset' },
  { key: 'completionUsers', label: 'Code Completion', description: 'Users who used code completion' },
  { key: 'chatUsers', label: 'Chat Features', description: 'Users who used any chat feature (Ask/Edit/Agent/Plan/Inline)' },
  { key: 'askModeUsers', label: 'Ask Mode', description: 'Users who used chat ask mode' },
  { key: 'editModeUsers', label: 'Edit Mode', description: 'Users who used chat edit mode' },
  { key: 'agentModeUsers', label: 'IDE Agent Mode', description: 'Users who used Agent Mode in the IDE' },
  { key: 'planModeUsers', label: 'Plan Mode', description: 'Users who used Plan Mode' },
  { key: 'cliUsers', label: 'Copilot CLI', description: 'Users who used Copilot CLI' },
  { key: 'inlineModeUsers', label: 'Inline Chat', description: 'Users who used inline chat' },
  { key: 'codingAgentUsers', label: 'Copilot Cloud Agent', description: 'Users who used Copilot Cloud Agent' },
] as const;

export const FEATURE_ADOPTION_RADAR_METADATA = [
  { key: 'agentInteractions', label: 'Agent Mode', summaryLabel: 'Agent', unit: 'interactions' },
  { key: 'planInteractions', label: 'Plan Mode', summaryLabel: 'Plan', unit: 'interactions' },
  { key: 'cliInteractions', label: 'CLI', summaryLabel: 'CLI', unit: 'interactions' },
  { key: 'askModeInteractions', label: 'Ask Mode', summaryLabel: 'Ask', unit: 'interactions' },
  { key: 'editModeInteractions', label: 'Edit Mode', summaryLabel: 'Edit', unit: 'interactions' },
  { key: 'completionInteractions', label: 'Completions', summaryLabel: 'Completions', unit: 'acceptances' },
] as const;

export function getFeatureTaxonomy(): readonly FeatureTaxonomyEntry[] {
  return FEATURE_TAXONOMY;
}

export function getFeatureLabel(feature: string): string | undefined {
  return FEATURE_LABELS[feature];
}

export function isCliFeature(feature: string): boolean {
  return CLI_FEATURES.has(feature);
}

export function isChatFeature(feature: string): boolean {
  return CHAT_FEATURES.has(feature);
}

export function isAgentFeature(feature: string): boolean {
  return AGENT_FEATURES.has(feature);
}

export function isJoinedImpactFeature(feature: string): boolean {
  return JOINED_IMPACT_FEATURES.has(feature);
}

export function isCodeCompletionFeature(feature: string): boolean {
  return feature === 'code_completion';
}

export function getChatModeBucket(feature: string): ChatModeBucket | undefined {
  return FEATURE_LOOKUP.get(feature)?.chatModeBucket;
}

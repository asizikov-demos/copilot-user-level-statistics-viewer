export type IDEIconKey =
  | 'vscode'
  | 'jetbrains'
  | 'visualstudio'
  | 'pycharm'
  | 'webstorm'
  | 'rider'
  | 'datagrip'
  | 'android_studio'
  | 'goland'
  | 'phpstorm'
  | 'rubymine'
  | 'clion'
  | 'rustrover'
  | 'rstudio'
  | 'emacs'
  | 'neovim'
  | 'vim'
  | 'eclipse'
  | 'xcode'
  | 'zed'
  | 'copilot_app'
  | 'copilot_cli'
  | 'aqua'
  | 'marimo'
  | 'obsidian'
  | 'tablepro'
  | 'opencode'
  | 'claude_code'
  | 'codex'
  | 'slack'
  | 'azure_devops'
  | 'workflow'
  | 'code_review'
  | 'desktop'
  | 'mobile'
  | 'github';

interface IDEMetadataDefinition {
  keys: readonly [string, ...string[]];
  label?: string;
  iconKey?: IDEIconKey;
  color?: string;
}

export interface IDEMetadata {
  canonicalKey: string;
  label?: string;
  iconKey?: IDEIconKey;
  color?: string;
}

const IDE_METADATA_DEFINITIONS: readonly IDEMetadataDefinition[] = [
  { keys: ['opencode'], label: 'OpenCode', iconKey: 'opencode', color: '#4E5968' },
  { keys: ['claude_code'], label: 'Claude Code', iconKey: 'claude_code', color: '#D43511' },
  { keys: ['codex'], label: 'Codex', iconKey: 'codex', color: '#005C4B' },
  { keys: ['slack'], label: 'Slack', iconKey: 'slack', color: '#6F285E' },
  { keys: ['azure_devops'], label: 'Azure DevOps', iconKey: 'azure_devops', color: '#003B70' },
  { keys: ['github_desktop'], label: 'GitHub Desktop', iconKey: 'desktop', color: '#684A9E' },
  { keys: ['github_web'], label: 'GitHub Web', iconKey: 'github', color: '#394044' },
  { keys: ['github_mobile'], label: 'GitHub Mobile', iconKey: 'mobile', color: '#8B3973' },
  { keys: ['github_app'], label: 'Copilot App', iconKey: 'copilot_app', color: '#1F2328' },
  { keys: ['copilot_sdk'], label: 'Copilot SDK', iconKey: 'copilot_app', color: '#596480' },
  { keys: ['agentic_workflows'], label: 'Agentic Workflows', iconKey: 'workflow', color: '#8B5700' },
  { keys: ['cloud_agent'], label: 'Copilot Cloud Agent', iconKey: 'copilot_app', color: '#4B397F' },
  { keys: ['code_review'], label: 'Copilot Code Review', iconKey: 'code_review', color: '#7D263A' },
  { keys: ['vscode'], label: 'VS Code', iconKey: 'vscode', color: '#006EDB' },
  { keys: ['jetbrains', 'intellij'], label: 'JetBrains', iconKey: 'jetbrains', color: '#B85C00' },
  { keys: ['visualstudio', 'visual_studio'], label: 'Visual Studio', iconKey: 'visualstudio', color: '#894CEB' },
  { keys: ['pycharm'], label: 'PyCharm', iconKey: 'pycharm', color: '#30A147' },
  { keys: ['dataspell'], label: 'DataSpell', iconKey: 'jetbrains', color: '#7658C9' },
  { keys: ['webstorm'], label: 'WebStorm', iconKey: 'webstorm', color: '#179B9B' },
  { keys: ['rider'], label: 'Rider', iconKey: 'rider', color: '#DF0C24' },
  { keys: ['datagrip'], label: 'DataGrip', iconKey: 'datagrip', color: '#856D4C' },
  { keys: ['android_studio'], label: 'Android Studio', iconKey: 'android_studio', color: '#527A29' },
  { keys: ['goland'], label: 'GoLand', iconKey: 'goland', color: '#007F99' },
  { keys: ['phpstorm'], label: 'PhpStorm', iconKey: 'phpstorm', color: '#5A61E7' },
  { keys: ['rubymine'], label: 'RubyMine', iconKey: 'rubymine', color: '#A30D32' },
  { keys: ['clion'], label: 'CLion', iconKey: 'clion', color: '#64762D' },
  { keys: ['rustrover'], label: 'RustRover', iconKey: 'rustrover', color: '#9D615C' },
  { keys: ['rstudio'], label: 'RStudio', iconKey: 'rstudio', color: '#004B95' },
  { keys: ['emacs'], label: 'Emacs', iconKey: 'emacs', color: '#A830E8' },
  { keys: ['neovim'], label: 'Neovim', iconKey: 'neovim', color: '#167E53' },
  { keys: ['vim'], label: 'Vim', iconKey: 'vim', color: '#31572C' },
  { keys: ['eclipse'], label: 'Eclipse', iconKey: 'eclipse', color: '#47325F' },
  { keys: ['xcode'], label: 'Xcode', iconKey: 'xcode', color: '#0082A6' },
  { keys: ['zed', 'zed:zed-copilot'], label: 'Zed', iconKey: 'zed', color: '#866E04' },
  { keys: ['copilot_app'], label: 'Copilot App', iconKey: 'copilot_app', color: '#1F2328' },
  { keys: ['copilot_cli'], label: 'Copilot CLI', iconKey: 'copilot_cli', color: '#CE2C85' },
  { keys: ['aqua'], label: 'Aqua', iconKey: 'aqua', color: '#006A6A' },
  { keys: ['marimo'], label: 'marimo', iconKey: 'marimo', color: '#1C7361' },
  { keys: ['obsidian'], label: 'Obsidian', iconKey: 'obsidian', color: '#5925AB' },
  { keys: ['tablepro', 'tablepro:tablepro-copilot'], label: 'TablePro', iconKey: 'tablepro', color: '#724C20' },
  { keys: ['sublime_text'], color: '#A64B00' },
];

export function normalizeIDEKey(ideKey: string): string {
  return ideKey.toLowerCase().trim();
}

function createIDEMetadataByKey(): Record<string, IDEMetadata> {
  const metadataByKey: Record<string, IDEMetadata> = {};

  for (const definition of IDE_METADATA_DEFINITIONS) {
    const canonicalKey = normalizeIDEKey(definition.keys[0]);

    for (const key of definition.keys) {
      metadataByKey[normalizeIDEKey(key)] = {
        canonicalKey,
        label: definition.label,
        iconKey: definition.iconKey,
        color: definition.color,
      };
    }
  }

  return metadataByKey;
}

export const IDE_METADATA_BY_KEY: Readonly<Record<string, IDEMetadata>> = Object.freeze(createIDEMetadataByKey());

export function getIDEMetadata(ideKey: string): IDEMetadata | undefined {
  return IDE_METADATA_BY_KEY[normalizeIDEKey(ideKey)];
}

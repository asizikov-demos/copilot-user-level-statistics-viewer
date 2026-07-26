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
  | 'copilot_cli';

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
  { keys: ['vscode'], label: 'VS Code', iconKey: 'vscode', color: '#007ACC' },
  { keys: ['jetbrains', 'intellij'], label: 'JetBrains', iconKey: 'jetbrains', color: '#FC801D' },
  { keys: ['visualstudio', 'visual_studio'], label: 'Visual Studio', iconKey: 'visualstudio', color: '#68217A' },
  { keys: ['pycharm'], label: 'PyCharm', iconKey: 'pycharm' },
  { keys: ['webstorm'], label: 'WebStorm', iconKey: 'webstorm' },
  { keys: ['rider'], label: 'Rider', iconKey: 'rider' },
  { keys: ['datagrip'], label: 'DataGrip', iconKey: 'datagrip' },
  { keys: ['android_studio'], label: 'Android Studio', iconKey: 'android_studio' },
  { keys: ['goland'], label: 'GoLand', iconKey: 'goland' },
  { keys: ['phpstorm'], label: 'PhpStorm', iconKey: 'phpstorm' },
  { keys: ['rubymine'], label: 'RubyMine', iconKey: 'rubymine' },
  { keys: ['clion'], label: 'CLion', iconKey: 'clion' },
  { keys: ['rustrover'], label: 'RustRover', iconKey: 'rustrover' },
  { keys: ['rstudio'], label: 'RStudio', iconKey: 'rstudio' },
  { keys: ['emacs'], label: 'Emacs', iconKey: 'emacs', color: '#9266CC' },
  { keys: ['neovim'], label: 'Neovim', iconKey: 'neovim', color: '#57A143' },
  { keys: ['vim'], label: 'Vim', iconKey: 'vim', color: '#019733' },
  { keys: ['eclipse'], label: 'Eclipse', iconKey: 'eclipse', color: '#2C2255' },
  { keys: ['xcode'], label: 'Xcode', iconKey: 'xcode', color: '#29ABE2' },
  { keys: ['zed', 'zed:zed-copilot'], label: 'Zed', iconKey: 'zed', color: '#F9CE49' },
  { keys: ['copilot_cli'], label: 'Copilot CLI', iconKey: 'copilot_cli', color: '#DB61A2' },
  { keys: ['sublime_text'], color: '#FF9800' },
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

const FORMAT_MAP: Record<string, string> = {
  vscode: 'VS Code',
  jetbrains: 'JetBrains',
  intellij: 'JetBrains',
  visualstudio: 'Visual Studio',
  visual_studio: 'Visual Studio',
  pycharm: 'PyCharm',
  webstorm: 'WebStorm',
  rider: 'Rider',
  datagrip: 'DataGrip',
  android_studio: 'Android Studio',
  goland: 'GoLand',
  phpstorm: 'PhpStorm',
  rubymine: 'RubyMine',
  clion: 'CLion',
  rustrover: 'RustRover',
  rstudio: 'RStudio',
  emacs: 'Emacs',
  neovim: 'Neovim',
  vim: 'Vim',
  eclipse: 'Eclipse',
  xcode: 'Xcode',
  zed: 'Zed',
  'zed:zed-copilot': 'Zed',
  copilot_cli: 'Copilot CLI',
};

export const formatIDEName = (ideName: string): string => {
  const normalizedName = ideName.toLowerCase().trim();
  return FORMAT_MAP[normalizedName] || ideName;
};

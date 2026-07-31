import { describe, expect, it } from 'vitest';
import { formatIDEName } from './ideNames';
import { getIDEIcon } from '../components/icons/IDEIcons';
import { getIdeColor } from '../components/charts/utils/chartColors';

describe('shared IDE metadata registry', () => {
  it('keeps visual studio aliases in sync across label, icon, and color helpers', () => {
    expect(formatIDEName(' visual_studio ')).toBe('Visual Studio');
    expect(formatIDEName('VisualStudio')).toBe('Visual Studio');
    expect(getIDEIcon('visual_studio')).toBe(getIDEIcon('visualstudio'));
    expect(getIdeColor('visual_studio', 0)).toBe(getIdeColor('visualstudio', 0));
  });

  it('applies case-insensitive normalization for shared metadata lookups', () => {
    expect(formatIDEName('VSCODE')).toBe('VS Code');
    expect(getIDEIcon('VsCoDe')).toBe(getIDEIcon('vscode'));
    expect(getIdeColor('VSCode', 0)).toBe(getIdeColor('vscode', 0));
  });

  it('keeps zed aliases in sync across label, icon, and color helpers', () => {
    expect(formatIDEName('zed:zed-copilot')).toBe('Zed');
    expect(formatIDEName(' ZED ')).toBe('Zed');
    expect(getIDEIcon('zed:zed-copilot')).toBe(getIDEIcon('zed'));
    expect(getIdeColor('zed:zed-copilot', 0)).toBe(getIdeColor('zed', 0));
  });

  it('maps intellij to jetbrains across label, icon, and color helpers', () => {
    expect(formatIDEName('intellij')).toBe('JetBrains');
    expect(getIDEIcon('intellij')).toBe(getIDEIcon('jetbrains'));
    expect(getIdeColor('intellij', 0)).toBe(getIdeColor('jetbrains', 0));
  });

  it('maps Copilot App as a named client with Copilot visuals', () => {
    expect(formatIDEName('copilot_app')).toBe('Copilot App');
    expect(getIDEIcon('copilot_app')).not.toBe(getIDEIcon('copilot_cli'));
    expect(getIdeColor('copilot_app', 0)).toBe('#000000');
  });
});

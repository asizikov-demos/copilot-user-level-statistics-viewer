import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getIDEMetadata, IDE_METADATA_BY_KEY } from './ideMetadata';
import { formatIDEName } from './ideNames';
import { getIDEIcon } from '../components/icons/IDEIcons';
import { getIdeColor, hasIdeColor } from '../components/charts/utils/chartColors';
import { MarkGithubIcon, CopilotIcon, WorkflowIcon, CodeReviewIcon, DeviceDesktopIcon, DeviceMobileIcon } from '@primer/octicons-react';

describe('shared IDE metadata registry', () => {
  it('recognizes Azure DevOps with its vendor icon and separate chart color', () => {
    expect(formatIDEName(' AZURE_DEVOPS ')).toBe('Azure DevOps');
    expect(getIDEMetadata('azure_devops')?.canonicalKey).toBe('azure_devops');
    expect(getIDEIcon(' AZURE_DEVOPS ')).toBe(getIDEIcon('azure_devops'));
    expect(getIDEIcon('azure_devops')).not.toBe(getIDEIcon('unknown-client'));
    expect(getIdeColor('azure_devops')).toBe('#003B70');
    const svg = renderToStaticMarkup(createElement(getIDEIcon('azure_devops')));
    expect(svg).toContain('<path');
    expect(svg).toContain('fill="#0078D7"');
    expect(svg).not.toContain('<text');
  });
  it('recognizes Slack with a vendor SVG across shared client surfaces', () => {
    expect(formatIDEName(' SLACK ')).toBe('Slack');
    expect(getIDEMetadata('slack')?.canonicalKey).toBe('slack');
    expect(getIDEIcon(' SLACK ')).toBe(getIDEIcon('slack'));
    expect(getIDEIcon('slack')).not.toBe(getIDEIcon('unknown-client'));
    const svg = renderToStaticMarkup(createElement(getIDEIcon('slack')));
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('<path');
    for (const color of ['#E01E5A', '#36C5F0', '#2EB67D', '#ECB22E']) {
      expect(svg).toContain(`fill="${color}"`);
    }
    expect(svg).not.toContain('fill="currentColor"');
    expect(svg).not.toContain('<text');
  });
  it.each([
    ['github_web', 'GitHub Web'],
  ])('uses Primer GitHub branding for %s without merging client identities', (key, label) => {
    expect(formatIDEName(key)).toBe(label);
    expect(getIDEMetadata(key)?.canonicalKey).toBe(key);
    expect(renderToStaticMarkup(createElement(getIDEIcon(key))))
      .toBe(renderToStaticMarkup(createElement(MarkGithubIcon, { size: 16 })));
  });

  it.each([
    ['github_app', 'Copilot App'],
    ['copilot_sdk', 'Copilot SDK'],
    ['cloud_agent', 'Copilot Cloud Agent'],
    ['copilot_app', 'Copilot App'],
  ])('uses Primer Copilot branding for %s without merging client identities', (key, label) => {
    expect(formatIDEName(key)).toBe(label);
    expect(getIDEMetadata(key)?.canonicalKey).toBe(key);
    expect(renderToStaticMarkup(createElement(getIDEIcon(key))))
      .toBe(renderToStaticMarkup(createElement(CopilotIcon, { size: 16 })));
  });

  it.each(['opencode', 'claude_code', 'codex'])('renders vendor paths rather than a monogram for %s', key => {
    const svg = renderToStaticMarkup(createElement(getIDEIcon(key)));
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<text');
    if (key === 'opencode') expect(svg).toContain('fill="currentColor"');
  });
  it('uses Primer workflow-16 for Agentic Workflows', () => {
    expect(formatIDEName('agentic_workflows')).toBe('Agentic Workflows');
    expect(getIDEMetadata('agentic_workflows')?.canonicalKey).toBe('agentic_workflows');
    expect(renderToStaticMarkup(createElement(getIDEIcon('agentic_workflows'))))
      .toBe(renderToStaticMarkup(createElement(WorkflowIcon, { size: 16 })));
  });
  it('uses Primer code-review-16 for Copilot Code Review', () => {
    expect(formatIDEName('code_review')).toBe('Copilot Code Review');
    expect(getIDEMetadata('code_review')?.canonicalKey).toBe('code_review');
    expect(renderToStaticMarkup(createElement(getIDEIcon(' CODE_REVIEW '))))
      .toBe(renderToStaticMarkup(createElement(CodeReviewIcon, { size: 16 })));
  });
  it.each([
    ['github_desktop', 'GitHub Desktop', DeviceDesktopIcon],
    ['github_mobile', 'GitHub Mobile', DeviceMobileIcon],
  ] as const)('uses the Primer device icon for %s', (key, label, Icon) => {
    expect(formatIDEName(key)).toBe(label);
    expect(getIDEMetadata(key)?.canonicalKey).toBe(key);
    expect(renderToStaticMarkup(createElement(getIDEIcon(` ${key.toUpperCase()} `))))
      .toBe(renderToStaticMarkup(createElement(Icon, { size: 16 })));
  });

  it('uses Claude Code terracotta and the Codex brand gradient with unique SVG IDs', () => {
    expect(renderToStaticMarkup(createElement(getIDEIcon('claude_code')))).toContain('fill="#D97757"');
    const Icon = getIDEIcon('codex');
    const svg = renderToStaticMarkup(createElement('div', null, createElement(Icon), createElement(Icon)));
    for (const color of ['#B1A7FF', '#7A9DFF', '#3941FF']) expect(svg).toContain(color);
    const ids = Array.from(svg.matchAll(/<linearGradient id="([^"]+)"/g), match => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(svg).toContain(`fill="url(#${id})"`);
  });
  it.each([
    ['opencode', 'OpenCode'],
    ['claude_code', 'Claude Code'],
    ['codex', 'Codex'],
  ])('maps %s to a named client with a distinct icon', (key, label) => {
    expect(formatIDEName(` ${key.toUpperCase()} `)).toBe(label);
    expect(getIDEIcon(key)).not.toBe(getIDEIcon('unknown-client'));
    expect(getIDEIcon(key)).toBe(getIDEIcon(key.toUpperCase()));
    for (const other of ['opencode', 'claude_code', 'codex'].filter(other => other !== key)) {
      expect(getIDEIcon(key)).not.toBe(getIDEIcon(other));
    }
  });
  it('keeps visual studio aliases in sync across label, icon, and color helpers', () => {
    expect(formatIDEName(' visual_studio ')).toBe('Visual Studio');
    expect(formatIDEName('VisualStudio')).toBe('Visual Studio');
    expect(getIDEIcon('visual_studio')).toBe(getIDEIcon('visualstudio'));
    expect(getIdeColor('visual_studio')).toBe(getIdeColor('visualstudio'));
  });

  it('applies case-insensitive normalization for shared metadata lookups', () => {
    expect(formatIDEName('VSCODE')).toBe('VS Code');
    expect(getIDEIcon('VsCoDe')).toBe(getIDEIcon('vscode'));
    expect(getIdeColor('VSCode')).toBe(getIdeColor('vscode'));
  });

  it('keeps zed aliases in sync across label, icon, and color helpers', () => {
    expect(formatIDEName('zed:zed-copilot')).toBe('Zed');
    expect(formatIDEName(' ZED ')).toBe('Zed');
    expect(getIDEIcon('zed:zed-copilot')).toBe(getIDEIcon('zed'));
    expect(getIdeColor('zed:zed-copilot')).toBe(getIdeColor('zed'));
  });

  it('maps intellij to jetbrains across label, icon, and color helpers', () => {
    expect(formatIDEName('intellij')).toBe('JetBrains');
    expect(getIDEIcon('intellij')).toBe(getIDEIcon('jetbrains'));
    expect(getIdeColor('intellij')).toBe(getIdeColor('jetbrains'));
  });

  it('recognizes DataSpell with its display name and JetBrains icon', () => {
    expect(formatIDEName('dataspell')).toBe('DataSpell');
    expect(getIDEMetadata('dataspell')?.canonicalKey).toBe('dataspell');
    expect(getIDEIcon('dataspell')).toBe(getIDEIcon('jetbrains'));
    expect(hasIdeColor('dataspell')).toBe(true);
    expect(getIdeColor('dataspell')).toBe('#7658C9');
  });

  it('maps Copilot App as a named client with Copilot visuals', () => {
    expect(formatIDEName('copilot_app')).toBe('Copilot App');
    expect(getIDEIcon('copilot_app')).not.toBe(getIDEIcon('copilot_cli'));
    expect(getIdeColor('copilot_app')).toBe('#1F2328');
    expect(getIdeColor('github_app')).toBe(getIdeColor('copilot_app'));
    expect(getIDEMetadata('github_app')?.canonicalKey).not.toBe(getIDEMetadata('copilot_app')?.canonicalKey);
  });

  it('maps Aqua with display name, a distinct icon, and a canonical chart color', () => {
    expect(formatIDEName('aqua')).toBe('Aqua');
    expect(getIDEIcon('aqua')).not.toBe(getIDEIcon('vscode'));
    expect(getIDEIcon('aqua')).not.toBe(getIDEIcon('rubymine'));
    expect(hasIdeColor('aqua')).toBe(true);
    expect(getIdeColor('aqua')).toBe('#006A6A');
  });

  it('maps marimo with display name, icon, and brand color', () => {
    expect(formatIDEName('marimo')).toBe('marimo');
    expect(getIDEIcon('marimo')).not.toBe(getIDEIcon('vscode'));
    expect(getIdeColor('marimo')).toBe('#1C7361');
  });

  it('maps Obsidian with display name, icon, and brand color', () => {
    expect(formatIDEName('obsidian')).toBe('Obsidian');
    expect(getIDEIcon('obsidian')).not.toBe(getIDEIcon('vscode'));
    expect(getIdeColor('obsidian')).toBe('#5925AB');
  });

  it('maps TablePro telemetry and normalized aliases to the official display name and icon', () => {
    for (const key of ['tablepro:tablepro-copilot', 'tablepro', ' TABLEPRO:TABLEPRO-COPILOT ']) {
      expect(formatIDEName(key)).toBe('TablePro');
      expect(getIDEMetadata(key)?.canonicalKey).toBe('tablepro');
      expect(getIDEIcon(key)).toBe(getIDEIcon('tablepro'));
      expect(getIDEIcon(key)).not.toBe(getIDEIcon('unknown-ide'));
      expect(getIdeColor(key)).toBe(getIdeColor('tablepro'));
    }
  });

  it('renders the bundled TablePro icon at the standard IDE icon size', () => {
    const markup = renderToStaticMarkup(createElement(getIDEIcon('tablepro:tablepro-copilot')));
    expect(markup).toContain('<img');
    expect(markup).toContain('tablepro.png');
    expect(markup).toContain('width="16"');
    expect(markup).toContain('height="16"');
    expect(markup).toContain('alt=""');
  });

  it('assigns every known key a color, with only Copilot App sharing a visual identity', () => {
    const canonicals = new Map(Object.values(IDE_METADATA_BY_KEY).map(metadata => [metadata.canonicalKey, metadata]));
    const colors = new Map<string, string[]>();
    for (const [key, metadata] of canonicals) {
      expect(metadata.color).toMatch(/^#[0-9A-F]{6}$/);
      const color = getIdeColor(key);
      colors.set(color, [...colors.get(color) ?? [], key]);
    }
    expect(canonicals.size).toBe(41);
    expect(colors.size).toBe(40);
    expect([...colors.values()].filter(keys => keys.length > 1)).toEqual([['github_app', 'copilot_app']]);
    for (const [key, metadata] of Object.entries(IDE_METADATA_BY_KEY)) {
      expect(getIdeColor(` ${key.toUpperCase()} `)).toBe(getIdeColor(metadata.canonicalKey));
    }
  });
});

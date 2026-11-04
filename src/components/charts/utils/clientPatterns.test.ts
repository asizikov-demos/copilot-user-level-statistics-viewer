import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientPattern, getClientPatternIndex } from './clientPatterns';

afterEach(() => vi.unstubAllGlobals());

describe('client patterns', () => {
  it.each([
    ['visual_studio', 'visualstudio'],
    ['intellij', 'jetbrains'],
    ['zed:zed-copilot', 'zed'],
    ['tablepro:tablepro-copilot', 'tablepro'],
    ['github_app', 'copilot_app'],
    [' VSCODE ', 'vscode'],
    [' FUTURE_CLIENT ', 'future_client'],
  ])('keeps the visual identity for %s and %s', (alias, canonical) => {
    expect(getClientPatternIndex(alias)).toBe(getClientPatternIndex(canonical));
  });

  it('creates a repeatable colored tile with a supplemental white texture', () => {
    const pen = {
      fillStyle: '', strokeStyle: '', lineWidth: 0,
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    };
    const tile = { width: 0, height: 0, getContext: vi.fn(() => pen) };
    vi.stubGlobal('document', { createElement: vi.fn(() => tile) });
    const pattern = { setTransform: vi.fn() };
    const context = { createPattern: vi.fn(() => pattern) };
    expect(createClientPattern(context, '#006EDB', 'vscode')).toBe(pattern);
    expect(tile.width).toBe(8);
    expect(tile.height).toBe(8);
    expect(pen.fillRect).toHaveBeenCalledWith(0, 0, 8, 8);
    expect(pen.stroke).toHaveBeenCalledOnce();
    expect(context.createPattern).toHaveBeenCalledWith(tile, 'repeat');
  });

  it('surfaces unsupported canvas errors rather than silently dropping patterns', () => {
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
    expect(() => createClientPattern({ createPattern: vi.fn() }, '#006EDB', 'vscode'))
      .toThrow('Client chart patterns require Canvas 2D support.');
  });
});

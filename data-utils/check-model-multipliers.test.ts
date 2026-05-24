import { describe, expect, it } from 'vitest';

import { toConfigKey } from './check-model-multipliers.mjs';

describe('check-model-multipliers toConfigKey', () => {
  it('maps Claude Opus 4.6 fast mode preview to the preview-specific key', () => {
    expect(toConfigKey('Claude Opus 4.6 (fast mode) (preview)')).toBe('claude-opus-4.6-fast-mode-preview');
  });

  it('keeps Claude Opus 4.6 fast mode and standard keys distinct', () => {
    expect(toConfigKey('Claude Opus 4.6')).toBe('claude-opus-4.6');
    expect(toConfigKey('Claude Opus 4.6 (fast mode)')).toBe('claude-opus-4.6-fast-mode');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { internMetricStrings, StringPool } from '../stringPool';

describe('IDE version string interning', () => {
  it('interns repeated IDE version observations while preserving metadata', () => {
    const pool = new StringPool();
    const intern = vi.spyOn(pool, 'intern');
    const metric = {
      totals_by_ide: [
        {
          ide: 'vscode',
          last_known_ide_version: {
            ide_version: '1.138.0',
            sampled_at: '2026-10-06T00:00:00Z',
          },
        },
        {
          ide: 'vscode',
          last_known_ide_version: {
            ide_version: '1.138.0',
            sampled_at: '2026-10-07T00:00:00Z',
          },
        },
        { ide: 'copilot_cli' },
      ],
    };
    const before = structuredClone(metric);

    expect(internMetricStrings(metric, pool)).toBe(metric);
    expect(intern.mock.calls.filter(([value]) => value === '1.138.0')).toHaveLength(2);
    expect(pool.size).toBe(3);
    expect(metric).toEqual(before);
  });

  it('retains plugin interning when IDE version metadata is absent', () => {
    const pool = new StringPool();
    const intern = vi.spyOn(pool, 'intern');
    const metric = {
      totals_by_ide: [{
        ide: 'vscode',
        last_known_plugin_version: { plugin: 'copilot-chat', plugin_version: '0.138.0' },
      }],
    };

    internMetricStrings(metric, pool);
    expect(intern.mock.calls).toEqual([['vscode'], ['copilot-chat'], ['0.138.0']]);
    expect(pool.size).toBe(3);
  });
});

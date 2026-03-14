import { describe, it, expect } from 'vitest';
import { computeIDEInsights } from '../ideInsights';
import type { IDEStatsData } from '../../types/metrics';

function makeIDE(
  ide: string,
  uniqueUsers: number,
  totalGenerations: number,
  totalAcceptances: number,
  cliOverlapUsers = 0,
): IDEStatsData {
  return {
    ide,
    uniqueUsers,
    cliOverlapUsers,
    totalEngagements: uniqueUsers * 10,
    totalGenerations,
    totalAcceptances,
    locAdded: uniqueUsers * 100,
    locDeleted: uniqueUsers * 20,
    locSuggestedToAdd: totalGenerations * 5,
    locSuggestedToDelete: totalGenerations * 1,
  };
}

describe('computeIDEInsights', () => {
  it('returns empty array when no IDE data and no CLI users', () => {
    expect(computeIDEInsights([], 0, 0, 0)).toEqual([]);
  });

  it('returns CLI Not Yet Adopted when ideStats is empty but totalUniqueIDEUsers > 0', () => {
    const insights = computeIDEInsights([], 0, 50, 0);
    const match = insights.find((i) => i.title === 'CLI Not Yet Adopted');
    expect(match).toBeDefined();
    expect(match!.variant).toBe('blue');
  });

  it('returns Strong CLI Adoption when ideStats is empty but CLI users exist', () => {
    const insights = computeIDEInsights([], 0, 100, 15);
    const match = insights.find((i) => i.title === 'Strong CLI Adoption');
    expect(match).toBeDefined();
  });

  describe('IDE Concentration', () => {
    it('triggers Strong IDE Standardization when top IDE >= 80% share', () => {
      const stats = [
        makeIDE('vscode', 85, 1000, 400),
        makeIDE('jetbrains', 15, 200, 80),
      ];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      const match = insights.find((i) => i.title === 'Strong IDE Standardization');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('green');
      expect(match!.message).toContain('VS Code');
      expect(match!.message).toContain('85%');
    });

    it('does not trigger when top IDE < 80% share', () => {
      const stats = [
        makeIDE('vscode', 70, 1000, 400),
        makeIDE('jetbrains', 30, 200, 80),
      ];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      expect(insights.find((i) => i.title === 'Strong IDE Standardization')).toBeUndefined();
    });
  });

  describe('IDE Fragmentation', () => {
    it('triggers High IDE Fragmentation when 5+ IDEs each >= 5% share', () => {
      const stats = [
        makeIDE('vscode', 20, 500, 200),
        makeIDE('jetbrains', 20, 500, 200),
        makeIDE('neovim', 20, 500, 200),
        makeIDE('emacs', 20, 500, 200),
        makeIDE('xcode', 20, 500, 200),
      ];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      const match = insights.find((i) => i.title === 'High IDE Fragmentation');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('orange');
      expect(match!.message).toContain('5 IDEs');
    });

    it('does not trigger when fewer than 5 IDEs have >= 5% share', () => {
      const stats = [
        makeIDE('vscode', 80, 500, 200),
        makeIDE('jetbrains', 10, 500, 200),
        makeIDE('neovim', 5, 500, 200),
        makeIDE('emacs', 3, 500, 200),
        makeIDE('xcode', 2, 500, 200),
      ];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      expect(insights.find((i) => i.title === 'High IDE Fragmentation')).toBeUndefined();
    });
  });

  describe('CLI Penetration', () => {
    it('triggers CLI Opportunity for non-VS Code/VS users without CLI', () => {
      const stats = [
        makeIDE('vscode', 50, 1000, 400, 10),
        makeIDE('jetbrains', 30, 500, 200, 5),
        makeIDE('neovim', 10, 100, 40, 0),
      ];
      const insights = computeIDEInsights(stats, 0, 90, 15);
      const match = insights.find((i) => i.title === 'CLI Opportunity');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('orange');
      expect(match!.message).toContain('35');
      expect(match!.message).toContain('agentic');
      expect(match!.ctaUrl).toContain('copilot-cli');
    });

    it('counts only non-VS Code/Visual Studio IDEs', () => {
      const stats = [
        makeIDE('vscode', 50, 1000, 400, 0),
        makeIDE('visualstudio', 20, 500, 200, 0),
      ];
      const insights = computeIDEInsights(stats, 0, 70, 0);
      expect(insights.find((i) => i.title === 'CLI Opportunity')).toBeUndefined();
    });

    it('does not trigger when all non-VS users already use CLI', () => {
      const stats = [
        makeIDE('vscode', 50, 1000, 400, 10),
        makeIDE('jetbrains', 20, 500, 200, 20),
      ];
      const insights = computeIDEInsights(stats, 0, 70, 30);
      expect(insights.find((i) => i.title === 'CLI Opportunity')).toBeUndefined();
    });
  });

  describe('Low-Usage Clients', () => {
    it('triggers when IDEs have 1-2 users and others have more', () => {
      const stats = [
        makeIDE('vscode', 50, 1000, 400),
        makeIDE('emacs', 2, 20, 8),
        makeIDE('vim', 1, 10, 4),
      ];
      const insights = computeIDEInsights(stats, 0, 53, 0);
      const match = insights.find((i) => i.title === 'Low-Usage Clients');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('blue');
      expect(match!.message).toContain('Emacs');
      expect(match!.message).toContain('Vim');
    });

    it('does not trigger when all IDEs have <= 2 users', () => {
      const stats = [
        makeIDE('emacs', 2, 20, 8),
        makeIDE('vim', 1, 10, 4),
      ];
      const insights = computeIDEInsights(stats, 0, 3, 0);
      expect(insights.find((i) => i.title === 'Low-Usage Clients')).toBeUndefined();
    });
  });

  describe('Multi-Client Usage', () => {
    it('triggers when multiIDEUsersCount >= 15% of totalUniqueIDEUsers', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 20, 100, 0);
      const match = insights.find((i) => i.title === 'Multi-Client Usage');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('purple');
      expect(match!.message).toContain('20%');
      expect(match!.message).toContain('20 users');
    });

    it('does not trigger when multiIDEUsersCount < 15%', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 10, 100, 0);
      expect(insights.find((i) => i.title === 'Multi-Client Usage')).toBeUndefined();
    });

    it('does not trigger when multiIDEUsersCount is 0', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      expect(insights.find((i) => i.title === 'Multi-Client Usage')).toBeUndefined();
    });
  });

  describe('CLI Adoption', () => {
    it('triggers Strong CLI Adoption when cliUsers >= 10%', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 0, 100, 15);
      const match = insights.find((i) => i.title === 'Strong CLI Adoption');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('green');
      expect(match!.message).toContain('15 developers');
      expect(match!.message).toContain('15%');
      expect(match!.ctaUrl).toContain('copilot-cli');
    });

    it('triggers CLI Not Yet Adopted when cliUsers is 0', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 0, 100, 0);
      const match = insights.find((i) => i.title === 'CLI Not Yet Adopted');
      expect(match).toBeDefined();
      expect(match!.variant).toBe('blue');
      expect(match!.message).toContain('agentic');
      expect(match!.ctaUrl).toContain('copilot-cli');
    });

    it('does not trigger Strong CLI Adoption when cliUsers < 10%', () => {
      const stats = [makeIDE('vscode', 100, 1000, 400)];
      const insights = computeIDEInsights(stats, 0, 100, 5);
      expect(insights.find((i) => i.title === 'Strong CLI Adoption')).toBeUndefined();
    });
  });

  describe('Multiple insights', () => {
    it('fires multiple insights simultaneously', () => {
      const stats = [
        makeIDE('vscode', 85, 1000, 500, 10),
        makeIDE('jetbrains', 10, 1000, 300, 2),
        makeIDE('emacs', 2, 20, 8, 0),
        makeIDE('vim', 1, 10, 4, 0),
      ];
      const insights = computeIDEInsights(stats, 20, 100, 15);

      const titles = insights.map((i) => i.title);
      expect(titles).toContain('Strong IDE Standardization');
      expect(titles).toContain('CLI Opportunity');
      expect(titles).toContain('Low-Usage Clients');
      expect(titles).toContain('Multi-Client Usage');
      expect(titles).toContain('Strong CLI Adoption');
    });
  });
});

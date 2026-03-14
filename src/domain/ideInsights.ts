import type { IDEStatsData } from '../types/metrics';
import { formatIDEName } from '../components/icons/IDEIcons';

const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/agents/copilot-cli/about-copilot-cli';

export interface IDEInsight {
  title: string;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export function computeIDEInsights(
  ideStats: IDEStatsData[],
  multiIDEUsersCount: number,
  totalUniqueIDEUsers: number,
  cliUsers: number,
): IDEInsight[] {
  const insights: IDEInsight[] = [];

  if (ideStats.length === 0) return insights;

  // 1. IDE Concentration — top IDE >= 80% share
  const sorted = [...ideStats].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const topIDE = sorted[0];
  if (totalUniqueIDEUsers > 0) {
    const topPct = (topIDE.uniqueUsers / totalUniqueIDEUsers) * 100;
    if (topPct >= 80) {
      insights.push({
        title: 'Strong IDE Standardization',
        variant: 'green',
        message: `${formatIDEName(topIDE.ide)} accounts for ${topPct.toFixed(0)}% of users — low support fragmentation and training costs.`,
      });
    }
  }

  // 2. IDE Fragmentation — 5+ IDEs each with >= 5% share
  if (totalUniqueIDEUsers > 0) {
    const significantIDEs = ideStats.filter(
      (s) => (s.uniqueUsers / totalUniqueIDEUsers) * 100 >= 5,
    );
    if (significantIDEs.length >= 5) {
      insights.push({
        title: 'High IDE Fragmentation',
        variant: 'orange',
        message: `${significantIDEs.length} IDEs each have significant user bases. Consider standardizing to reduce support and training overhead.`,
      });
    }
  }

  // 3. CLI Penetration — users on non-VS Code/Visual Studio IDEs without CLI
  const bestAgenticIDEs = new Set(['vscode', 'visualstudio']);
  const nonVSIDEs = ideStats.filter((s) => !bestAgenticIDEs.has(s.ide) && s.uniqueUsers > 0);
  if (nonVSIDEs.length > 0) {
    const nonVSUsers = nonVSIDEs.reduce((sum, s) => sum + s.uniqueUsers, 0);
    const nonVSWithCLI = nonVSIDEs.reduce((sum, s) => sum + s.cliOverlapUsers, 0);
    const nonVSWithoutCLI = nonVSUsers - nonVSWithCLI;
    if (nonVSWithoutCLI > 0) {
      const names = nonVSIDEs.map((s) => formatIDEName(s.ide)).join(', ');
      insights.push({
        title: 'CLI Opportunity',
        variant: 'orange',
        message: `${nonVSWithoutCLI} users on ${names} don\u2019t use Copilot CLI. These IDEs have limited agentic capabilities \u2014 CLI provides a stronger agentic harness for terminal-based workflows.`,
        ctaUrl: CLI_DOCS_URL,
        ctaLabel: 'Learn about Copilot CLI',
      });
    }
  }

  // 4. Low-Usage Clients — IDEs with 1-2 users when others have more
  const lowUsageIDEs = ideStats.filter((s) => s.uniqueUsers <= 2);
  const hasLargerIDEs = ideStats.some((s) => s.uniqueUsers > 2);
  if (lowUsageIDEs.length > 0 && hasLargerIDEs) {
    const names = lowUsageIDEs.map((s) => formatIDEName(s.ide)).join(', ');
    insights.push({
      title: 'Low-Usage Clients',
      variant: 'blue',
      message: `${names} each have fewer than 3 users. Consider whether these need dedicated support.`,
    });
  }

  // 5. Multi-IDE Users — >= 15% of totalUniqueIDEUsers
  if (multiIDEUsersCount > 0 && totalUniqueIDEUsers > 0) {
    const multiPct = (multiIDEUsersCount / totalUniqueIDEUsers) * 100;
    if (multiPct >= 15) {
      insights.push({
        title: 'Multi-Client Usage',
        variant: 'purple',
        message: `${multiPct.toFixed(0)}% of developers use multiple clients (${multiIDEUsersCount} users). This may reflect healthy tool exploration or workflow fragmentation.`,
      });
    }
  }

  // 6. CLI Adoption
  if (cliUsers > 0 && totalUniqueIDEUsers > 0) {
    const cliPct = (cliUsers / totalUniqueIDEUsers) * 100;
    if (cliPct >= 10) {
      insights.push({
        title: 'Strong CLI Adoption',
        variant: 'green',
        message: `${cliUsers} developers (${cliPct.toFixed(0)}%) are using Copilot CLI alongside IDE clients.`,
        ctaUrl: CLI_DOCS_URL,
        ctaLabel: 'Copilot CLI docs',
      });
    }
  } else if (cliUsers === 0) {
    insights.push({
      title: 'CLI Not Yet Adopted',
      variant: 'blue',
      message: 'No users are using Copilot CLI yet. It provides powerful agentic capabilities for terminal-based workflows.',
      ctaUrl: CLI_DOCS_URL,
      ctaLabel: 'Learn about Copilot CLI',
    });
  }

  return insights;
}

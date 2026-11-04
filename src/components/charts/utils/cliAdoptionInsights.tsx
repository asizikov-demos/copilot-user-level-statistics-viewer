import type { ReactNode } from 'react';
import { Link } from '@primer/react';
import type { DailyCliAdoptionTrend } from '../../../domain/calculators/metricCalculators';
import type { MetricsStats } from '../../../types/metrics';

export interface CliInsight {
  title: string;
  message: ReactNode;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
}

const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise';

export function computeCliInsights(
  stats: MetricsStats,
  trend: DailyCliAdoptionTrend[],
  { client = 'CLI', clientUsers = stats.cliUsers }: {
    client?: 'CLI' | 'Copilot App';
    clientUsers?: number;
  } = {}
): CliInsight[] {
  const insights: CliInsight[] = [];

  if (clientUsers === 0) {
    insights.push({
      title: `${client} Not in Use`,
      variant: 'red',
      message: (
        <>
          No users have adopted {client === 'CLI' ? 'Copilot CLI' : client} yet.{" "}
          {client === 'CLI' && 'Copilot CLI is now generally available and can significantly boost developer productivity in the terminal. '}
          {client === 'CLI' && <Link
            href={CLI_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            inline
            className="font-medium"
          >
            Enable it for your enterprise →
          </Link>}
        </>
      ),
    });
    return insights;
  }

  if (trend.length < 2) {
    insights.push({
      title: 'Collecting Data',
      variant: 'blue',
      message: `Not enough data to determine ${client} adoption trends yet. Check back after a few more days of usage data.`,
    });
    return insights;
  }

  const adoptionPct = stats.uniqueUsers > 0
    ? (clientUsers / stats.uniqueUsers) * 100
    : 0;

  const recentWindow = Math.min(7, Math.floor(trend.length / 2));
  const recentDays = trend.slice(-recentWindow);
  const priorDays = trend.slice(-recentWindow * 2, -recentWindow);

  const recentNewUsers = recentDays.reduce((s, d) => s + d.newUsers, 0);
  const priorNewUsers = priorDays.reduce((s, d) => s + d.newUsers, 0);

  const recentAvgActive = recentDays.reduce((s, d) => s + d.totalActiveUsers, 0) / recentDays.length;
  const priorAvgActive = priorDays.length > 0
    ? priorDays.reduce((s, d) => s + d.totalActiveUsers, 0) / priorDays.length
    : 0;

  const totalReturning = trend.reduce((s, d) => s + d.returningUsers, 0);
  const totalActive = trend.reduce((s, d) => s + d.totalActiveUsers, 0);
  const retentionRate = totalActive > 0 ? (totalReturning / totalActive) * 100 : 0;

  if (adoptionPct < 5) {
    insights.push({
      title: `Low ${client} Adoption`,
      variant: 'orange',
      message: (
        <>
          Only {adoptionPct.toFixed(1)}% of Copilot users have tried {client === 'CLI' ? 'the CLI' : client}.
          Consider promoting it through internal demos, Slack channels, or developer onboarding.{" "}
          {client === 'CLI' && <Link
            href={CLI_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            inline
            className="font-medium"
          >
            Admin setup guide →
          </Link>}
        </>
      ),
    });
  }

  if (recentNewUsers > priorNewUsers && recentNewUsers > 0) {
    insights.push({
      title: 'Growing Adoption',
      variant: 'green',
      message: `${client} adoption is accelerating — ${recentNewUsers} new user${recentNewUsers !== 1 ? 's' : ''} in the last ${recentWindow} day${recentWindow !== 1 ? 's' : ''}, up from ${priorNewUsers} in the prior period.`,
    });
  } else if (recentAvgActive > priorAvgActive * 1.1 && priorAvgActive > 0) {
    insights.push({
      title: 'Increasing Activity',
      variant: 'green',
      message: `Daily ${client} activity is trending up — average ${recentAvgActive.toFixed(1)} active users/day vs ${priorAvgActive.toFixed(1)} previously.`,
    });
  } else if (recentAvgActive < priorAvgActive * 0.8 && priorAvgActive > 0) {
    insights.push({
      title: 'Declining Activity',
      variant: 'orange',
      message: `${client} usage is declining compared to the prior period. Consider gathering feedback from developers on barriers they may be facing.`,
    });
  } else if (recentNewUsers <= 1 && trend.length >= 7) {
    insights.push({
      title: 'Adoption Plateau',
      variant: 'blue',
      message: `Few new users are adopting ${client}. Consider running workshops, sharing ${client} tips in team channels, or highlighting ${client} productivity wins.`,
    });
  }

  if (retentionRate >= 50) {
    insights.push({
      title: 'Strong Retention',
      variant: 'green',
      message: `${retentionRate.toFixed(0)}% of daily ${client} users are returning — developers who try ${client} tend to keep using it.`,
    });
  } else if (retentionRate < 30 && totalActive > 0 && trend.length >= 7) {
    insights.push({
      title: 'Low Retention',
      variant: 'orange',
      message: `Only ${retentionRate.toFixed(0)}% of daily ${client} users are returning. Many try it once and don’t come back. Consider improving onboarding or sharing best practices.`,
    });
  }

  if (adoptionPct >= 20) {
    insights.push({
      title: `Healthy ${client} Adoption`,
      variant: 'green',
      message: `${adoptionPct.toFixed(1)}% of Copilot users are using ${client} — strong adoption across the enterprise.`,
    });
  }

  return insights;
}
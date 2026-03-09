'use client';

import React from 'react';
import InsightsCard from './ui/InsightsCard';
import type { DailyCliAdoptionTrend } from '../domain/calculators/metricCalculators';
import type { MetricsStats } from '../types/metrics';

export interface CliInsight {
  title: string;
  message: React.ReactNode;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
}

const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise';

export function computeCliInsights(
  stats: MetricsStats,
  trend: DailyCliAdoptionTrend[]
): CliInsight[] {
  const insights: CliInsight[] = [];

  if (stats.cliUsers === 0) {
    insights.push({
      title: 'CLI Not in Use',
      variant: 'red',
      message: (
        <>
          No users have adopted Copilot CLI yet. Copilot CLI is now generally available and can
          significantly boost developer productivity in the terminal.{' '}
          <a
            href={CLI_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Enable it for your enterprise →
          </a>
        </>
      ),
    });
    return insights;
  }

  if (trend.length < 2) {
    insights.push({
      title: 'Collecting Data',
      variant: 'blue',
      message: 'Not enough data to determine CLI adoption trends yet. Check back after a few more days of usage data.',
    });
    return insights;
  }

  const adoptionPct = stats.uniqueUsers > 0
    ? (stats.cliUsers / stats.uniqueUsers) * 100
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
      title: 'Low CLI Adoption',
      variant: 'orange',
      message: (
        <>
          Only {adoptionPct.toFixed(1)}% of Copilot users have tried the CLI.
          Consider promoting it through internal demos, Slack channels, or developer onboarding.{' '}
          <a
            href={CLI_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Admin setup guide →
          </a>
        </>
      ),
    });
  }

  if (recentNewUsers > priorNewUsers && recentNewUsers > 0) {
    insights.push({
      title: 'Growing Adoption',
      variant: 'green',
      message: `CLI adoption is accelerating — ${recentNewUsers} new user${recentNewUsers !== 1 ? 's' : ''} in the last ${recentWindow} day${recentWindow !== 1 ? 's' : ''}, up from ${priorNewUsers} in the prior period.`,
    });
  } else if (recentAvgActive > priorAvgActive * 1.1 && priorAvgActive > 0) {
    insights.push({
      title: 'Increasing Activity',
      variant: 'green',
      message: `Daily CLI activity is trending up — average ${recentAvgActive.toFixed(1)} active users/day vs ${priorAvgActive.toFixed(1)} previously.`,
    });
  } else if (recentAvgActive < priorAvgActive * 0.8 && priorAvgActive > 0) {
    insights.push({
      title: 'Declining Activity',
      variant: 'orange',
      message: 'CLI usage is declining compared to the prior period. Consider gathering feedback from developers on barriers they may be facing.',
    });
  } else if (recentNewUsers <= 1 && trend.length >= 7) {
    insights.push({
      title: 'Adoption Plateau',
      variant: 'blue',
      message: 'Few new users are adopting CLI. Consider running workshops, sharing CLI tips in team channels, or highlighting CLI productivity wins.',
    });
  }

  if (retentionRate >= 50) {
    insights.push({
      title: 'Strong Retention',
      variant: 'green',
      message: `${retentionRate.toFixed(0)}% of daily CLI sessions come from returning users — developers who try CLI tend to keep using it.`,
    });
  } else if (retentionRate < 30 && totalActive > 0 && trend.length >= 7) {
    insights.push({
      title: 'Low Retention',
      variant: 'orange',
      message: `Only ${retentionRate.toFixed(0)}% of CLI activity comes from returning users. Many try it once and don\u2019t come back. Consider improving onboarding or sharing best practices.`,
    });
  }

  if (adoptionPct >= 20) {
    insights.push({
      title: 'Healthy CLI Adoption',
      variant: 'green',
      message: `${adoptionPct.toFixed(1)}% of Copilot users are using CLI — strong adoption across the enterprise.`,
    });
  }

  return insights;
}

interface CLIAdoptionInsightsProps {
  stats: MetricsStats;
  trend: DailyCliAdoptionTrend[];
}

export default function CLIAdoptionInsights({ stats, trend }: CLIAdoptionInsightsProps) {
  const insights = computeCliInsights(stats, trend);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight, i) => (
        <InsightsCard key={i} title={insight.title} variant={insight.variant}>
          {insight.message}
        </InsightsCard>
      ))}
    </div>
  );
}

'use client';

import React from 'react';
import InsightsCard from './ui/InsightsCard';
import type { FeatureAdoptionData } from '../domain/calculators/metricCalculators';
import type { MetricsStats } from '../types/metrics';

export interface FeatureAdoptionInsight {
  title: string;
  message: React.ReactNode;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
}

const PLANNING_DOCS_URL = 'https://code.visualstudio.com/docs/copilot/agents/planning';
const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise';

export function computeFeatureAdoptionInsights(
  featureAdoptionData: FeatureAdoptionData | null,
  stats: MetricsStats
): FeatureAdoptionInsight[] {
  const insights: FeatureAdoptionInsight[] = [];

  if (!featureAdoptionData) return insights;

  const { agentModeUsers, planModeUsers } = featureAdoptionData;

  if (agentModeUsers > 0 && planModeUsers < agentModeUsers * 0.5) {
    const planPct = Math.round((planModeUsers / agentModeUsers) * 100);
    insights.push({
      title: 'Planning Mode Underutilized',
      variant: 'orange',
      message: (
        <>
          Only {planPct}% of Agent Mode users ({planModeUsers} of {agentModeUsers}) have tried
          Planning mode. Planning mode helps teams break down complex tasks and improve workflow
          quality.{' '}
          <a
            href={PLANNING_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Learn about Planning mode →
          </a>
        </>
      ),
    });
  }

  const cliAdoptionPct = stats.uniqueUsers > 0
    ? (stats.cliUsers / stats.uniqueUsers) * 100
    : 0;

  if (stats.cliUsers > 0 && cliAdoptionPct < 5) {
    insights.push({
      title: 'Low CLI Adoption',
      variant: 'orange',
      message: (
        <>
          Only {cliAdoptionPct.toFixed(1)}% of Copilot users have tried the CLI.
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

  return insights;
}

interface CopilotAdoptionInsightsProps {
  featureAdoptionData: FeatureAdoptionData | null;
  stats: MetricsStats;
}

export default function CopilotAdoptionInsights({ featureAdoptionData, stats }: CopilotAdoptionInsightsProps) {
  const insights = computeFeatureAdoptionInsights(featureAdoptionData, stats);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight) => (
        <InsightsCard key={insight.title} title={insight.title} variant={insight.variant}>
          {insight.message}
        </InsightsCard>
      ))}
    </div>
  );
}

'use client';

import React from 'react';
import InsightsCard from './ui/InsightsCard';
import type { FeatureAdoptionData } from '../domain/calculators/metricCalculators';

export interface FeatureAdoptionInsight {
  title: string;
  message: React.ReactNode;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
}

const PLANNING_MODE_DOCS_URL = 'https://code.visualstudio.com/docs/copilot/agents/planning';
const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise';

export function computeFeatureAdoptionInsights(
  data: FeatureAdoptionData
): FeatureAdoptionInsight[] {
  const insights: FeatureAdoptionInsight[] = [];

  if (data.totalUsers === 0) {
    return insights;
  }

  const agentModePercentage = (data.agentModeUsers / data.totalUsers) * 100;
  const planModePercentage = (data.planModeUsers / data.totalUsers) * 100;
  const cliPercentage = (data.cliUsers / data.totalUsers) * 100;

  // Insight 1: Large gap between IDE Agent Mode and Planning Mode
  // Only show this if there's meaningful Agent Mode usage and a significant gap
  if (agentModePercentage >= 5 && planModePercentage < agentModePercentage * 0.3) {
    const gap = agentModePercentage - planModePercentage;
    insights.push({
      title: 'Planning Mode Opportunity',
      variant: 'purple',
      message: (
        <>
          {agentModePercentage.toFixed(1)}% of users are using IDE Agent Mode, but only {planModePercentage.toFixed(1)}% are using Planning Mode (a gap of {gap.toFixed(1)}%). Planning Mode helps break down complex tasks into structured workflows.{' '}
          <a
            href={PLANNING_MODE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Learn about Planning Mode →
          </a>
        </>
      ),
    });
  }

  // Insight 2: Low CLI adoption (below 5%)
  if (cliPercentage < 5) {
    insights.push({
      title: 'Low CLI Adoption',
      variant: 'orange',
      message: (
        <>
          Only {cliPercentage.toFixed(1)}% of Copilot users have tried the CLI.
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

interface FeatureAdoptionInsightsProps {
  data: FeatureAdoptionData;
}

export default function FeatureAdoptionInsights({ data }: FeatureAdoptionInsightsProps) {
  const insights = computeFeatureAdoptionInsights(data);

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

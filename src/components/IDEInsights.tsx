'use client';

import React from 'react';
import InsightsCard from './ui/InsightsCard';
import { computeIDEInsights } from '../domain/ideInsights';
import type { IDEStatsData } from '../types/metrics';

interface IDEInsightsProps {
  ideStats: IDEStatsData[];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  cliUsers: number;
}

export default function IDEInsights({ ideStats, multiIDEUsersCount, totalUniqueIDEUsers, cliUsers }: IDEInsightsProps) {
  const insights = computeIDEInsights(ideStats, multiIDEUsersCount, totalUniqueIDEUsers, cliUsers);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight) => (
        <InsightsCard key={insight.title} title={insight.title} variant={insight.variant}>
          <p>{insight.message}</p>
          {insight.ctaUrl && insight.ctaLabel && (
            <a
              href={insight.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-medium underline hover:no-underline"
            >
              {insight.ctaLabel} &rarr;
            </a>
          )}
        </InsightsCard>
      ))}
    </div>
  );
}

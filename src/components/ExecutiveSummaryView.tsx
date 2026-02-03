"use client";

import React from 'react';
import { ViewPanel } from './ui';
import ModeImpactChart from './charts/ModeImpactChart';
import PRUModelUsageChart from './charts/PRUModelUsageChart';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import type {
  ModeImpactData,
  AgentImpactData,
  CodeCompletionImpactData,
  FeatureAdoptionData,
} from '../domain/calculators/metricCalculators';
import type { DailyModelUsageData } from '../domain/calculators/metricCalculators';
import type { MetricsStats } from '../types/metrics';
import type { VoidCallback } from '../types/events';

interface ExecutiveSummaryViewProps {
  stats: MetricsStats;
  enterpriseName: string | null;
  joinedImpactData: ModeImpactData[];
  modelUsageData: DailyModelUsageData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  featureAdoptionData: FeatureAdoptionData;
  onBack: VoidCallback;
}

function formatLongDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatSignedNumber(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function sumNetChange(data: Array<{ netChange: number }>): number {
  return data.reduce((acc, entry) => acc + (entry.netChange || 0), 0);
}

export default function ExecutiveSummaryView({
  stats,
  enterpriseName,
  joinedImpactData,
  modelUsageData,
  agentImpactData,
  codeCompletionImpactData,
  featureAdoptionData,
  onBack,
}: ExecutiveSummaryViewProps) {
  const reportRange = `${formatLongDate(stats.reportStartDay)} – ${formatLongDate(stats.reportEndDay)}`;
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const combinedNetChange = sumNetChange(joinedImpactData || []);
  const agentNetChange = sumNetChange(agentImpactData || []);
  const manualNetChange = sumNetChange(codeCompletionImpactData || []);
  const agentShare = combinedNetChange !== 0 ? (agentNetChange / combinedNetChange) * 100 : 0;
  const manualShare = combinedNetChange !== 0 ? (manualNetChange / combinedNetChange) * 100 : 0;

  const totalUsers = featureAdoptionData?.totalUsers ?? 0;
  const chatUsers = featureAdoptionData?.chatUsers ?? 0;
  const agentModeUsers = featureAdoptionData?.agentModeUsers ?? 0;
  const completionOnlyUsers = featureAdoptionData?.completionOnlyUsers ?? 0;
  const chatShare = totalUsers > 0 ? (chatUsers / totalUsers) * 100 : 0;
  const agentModeShare = totalUsers > 0 ? (agentModeUsers / totalUsers) * 100 : 0;
  const completionOnlyShare = totalUsers > 0 ? (completionOnlyUsers / totalUsers) * 100 : 0;

  return (
    <ViewPanel
      headerProps={{
        title: 'Executive Summary',
        onBack,
        backButtonLabel: '← Back',
        backButtonClassName: 'print:hidden',
        description: (
          <div className="mt-2 space-y-1 text-sm text-gray-700 print:text-black">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="font-medium text-gray-900 print:text-black">Report date range:</span>{' '}
                <span>{reportRange}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900 print:text-black">Enterprise:</span>{' '}
                <span>{enterpriseName ?? 'N/A'}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 print:text-black">
              Generated on {generatedOn}
            </div>
          </div>
        ),
      }}
      contentClassName="space-y-8"
      containerClassName="bg-white rounded-lg shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0 print:rounded-none print:p-0"
    >
      <ModeImpactChart
        data={joinedImpactData || []}
        title="Combined Copilot Impact"
        description="Aggregate impact across Code Completion, Ask Mode, Agent Mode, Edit Mode, and Inline Mode activities."
        emptyStateMessage="No combined impact data available."
      />

      <div className="border border-gray-200 rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-900 print:border-black print:bg-white print:text-black print:text-xs">
        <dl className="space-y-2 leading-snug">
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Net LOC change:</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{formatSignedNumber(combinedNetChange)}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                Net lines added − deleted (all Copilot modes).
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Agent Mode:</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{formatPercent(agentShare)}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                Share of net LOC from Agent Mode.
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Manual (Suggestions):</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{formatPercent(manualShare)}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                Share of net LOC from accepted completions.
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <PRUModelUsageChart data={modelUsageData || []} hideInsights />

      <div className="border border-gray-200 rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-900 print:border-black print:bg-white print:text-black print:text-xs">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 print:text-black">
          Feature adoption summary
        </div>
        <dl className="mt-2 space-y-2 leading-snug">
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Chat Users:</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{chatUsers.toLocaleString()}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                ({formatPercent(chatShare)} of total) — any chat feature.
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Agent Mode Users:</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{agentModeUsers.toLocaleString()}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                ({formatPercent(agentModeShare)} of total) — Agent Mode at least once.
              </span>
            </dd>
          </div>
          <div className="grid grid-cols-[max-content_1fr] items-baseline gap-x-1">
            <dt className="font-medium whitespace-nowrap">Completion only users:</dt>
            <dd className="min-w-0">
              <span className="tabular-nums font-semibold">{completionOnlyUsers.toLocaleString()}</span>
              <span className="ml-1 text-xs text-gray-600 print:text-[10px] print:text-black">
                ({formatPercent(completionOnlyShare)} of total) — completions only.
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <FeatureAdoptionChart
        data={
          featureAdoptionData || {
            totalUsers: 0,
            completionUsers: 0,
            completionOnlyUsers: 0,
            chatUsers: 0,
            agentModeUsers: 0,
            askModeUsers: 0,
            editModeUsers: 0,
            inlineModeUsers: 0,
            codeReviewUsers: 0,
          }
        }
      />
    </ViewPanel>
  );
}

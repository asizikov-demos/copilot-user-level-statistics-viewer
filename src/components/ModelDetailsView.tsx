'use client';

import React, { useMemo } from 'react';
import { useRawMetrics } from './MetricsContext';
import { useFilters } from '../state/FilterContext';
import { filterMetricsByDateRange } from '../utils/dateFilters';
import ModelsUsageChart from './charts/ModelsUsageChart';
import InsightsCard from './ui/InsightsCard';
import { KNOWN_MODELS } from '../domain/modelConfig';
import type { VoidCallback } from '../types/events';
import { ViewPanel } from './ui';

interface ModelDetailsViewProps {
  onBack: VoidCallback;
}

export default function ModelDetailsView({ onBack }: ModelDetailsViewProps) {
  const { rawMetrics, originalStats } = useRawMetrics();
  const { dateRange } = useFilters();

  const metrics = useMemo(() => {
    if (!originalStats) return [];
    return filterMetricsByDateRange(rawMetrics, dateRange, originalStats.reportEndDay);
  }, [rawMetrics, dateRange, originalStats]);

  const premiumUtilization = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const modelClassification = KNOWN_MODELS.reduce<Record<string, boolean>>((acc, model) => {
      acc[model.name.toLowerCase()] = model.isPremium;
      return acc;
    }, {});

    let premiumTotal = 0;
    let standardTotal = 0;
    let unknownTotal = 0;

    for (const metric of metrics) {
      for (const modelFeature of metric.totals_by_model_feature) {
        const count = modelFeature.user_initiated_interaction_count || 0;
        if (!count) continue;

        const normalizedModel = modelFeature.model.trim().toLowerCase();
        const classification = modelClassification[normalizedModel];

        if (classification === true) {
          premiumTotal += count;
        } else if (classification === false) {
          standardTotal += count;
        } else {
          unknownTotal += count;
        }
      }
    }

    const trackedTotal = premiumTotal + standardTotal;
    const numberFormatter = new Intl.NumberFormat();

    const summaryLines: string[] = [
      `Premium interactions: ${numberFormatter.format(premiumTotal)}`,
      `Standard interactions: ${numberFormatter.format(standardTotal)}`
    ];

    if (unknownTotal > 0) {
      summaryLines.push(`Unclassified interactions: ${numberFormatter.format(unknownTotal)}`);
    }

    if (trackedTotal === 0) {
      const paragraphs = unknownTotal > 0
        ? [
            'Model activity is currently attributed to models that are not mapped in the catalog. Add them to surface premium versus standard insights.'
          ]
        : ['No premium or standard model activity has been recorded for this reporting window yet.'];

      return {
        variant: 'blue' as const,
        paragraphs,
        summaryLines,
        note: 'Each Copilot seat includes at least 300 Premium Request Units (≈$12 of value) that expire monthly.'
      };
    }

    const premiumShare = trackedTotal === 0 ? 0 : premiumTotal / trackedTotal;
    const shareLabel = `${(premiumShare * 100).toFixed(1)}%`;
    const ratio = standardTotal > 0 ? premiumTotal / standardTotal : Number.POSITIVE_INFINITY;
    const ratioLabel = Number.isFinite(ratio) ? `${ratio.toFixed(2)}x` : 'all premium usage';

    summaryLines.push(`Premium share of tracked usage: ${shareLabel}`);
    summaryLines.push(`Premium-to-standard ratio: ${ratioLabel}`);

    const standardLead = standardTotal - premiumTotal;
    const premiumLead = premiumTotal - standardTotal;

    const paragraphs: string[] = [];
    let variant: 'green' | 'blue' | 'red' | 'orange' | 'purple' = 'blue';

    if (premiumShare < 0.2) {
      variant = 'red';
      paragraphs.push(
        `Premium models account for only ${shareLabel} of tracked interactions. Included PRUs are likely expiring unused each month. Which is a missed opportunity and unutilized value.`
      );
      paragraphs.push(
        `Standard models processed ${numberFormatter.format(standardLead)} more requests, signaling an awareness or entitlement gap for Premium Models access. There is room to utilize more of the included (prepaid) PRUs.`
      );
    } else if (premiumShare < 0.35) {
      variant = 'orange';
      paragraphs.push(
        `Premium models represent ${shareLabel} of usage. Consider nudging teams on premium value or checking whether they exhaust PRUs early in the month.`
      );
      if (premiumLead > 0) {
        paragraphs.push(
          `Premium requests already outpace standard by ${numberFormatter.format(premiumLead)} interactions—monitor that monthly bundles stay sufficient.`
        );
      } else {
        paragraphs.push(
          `Standard usage leads by ${numberFormatter.format(standardLead)} interactions, leaving meaningful premium headroom before monthly resets.`
        );
      }
    } else if (premiumShare <= 0.6) {
      variant = 'green';
      paragraphs.push(
        `Premium share at ${shareLabel} points to a healthy balance between premium and standard model usage.`
      );
      if (premiumLead >= 0) {
        paragraphs.push(
          `Premium requests exceed standard by ${numberFormatter.format(premiumLead)} interactions while staying within a sustainable balance.`
        );
      } else {
        paragraphs.push(
          `Standard models still lead by ${numberFormatter.format(standardLead)} interactions, suggesting the opportunity to further increase included Premium Model requests usage.`
        );
      }
    } else {
      variant = 'purple';
      paragraphs.push(
        `Premium models now drive ${shareLabel} of tracked interactions, indicating teams lean heavily on higher-value models.`
      );
      if (premiumLead > 0) {
        paragraphs.push(
          `Premium volume is ${numberFormatter.format(premiumLead)} interactions above Standard Models. Confirm monthly PRU bundles (baseline 300 per user) are sufficient or plan for add-ons.`
        );
      } else {
        paragraphs.push(
          `Standard usage trails premium by ${numberFormatter.format(Math.abs(standardLead))} interactions—watch for signals that teams might hit PRU limits mid-month.`
        );
      }
    }

    return {
      variant,
      paragraphs,
      summaryLines,
      note:
        unknownTotal > 0
          ? `There are ${numberFormatter.format(unknownTotal)} interactions from models that are not yet tagged as premium or standard.`
          : undefined
    };
  }, [metrics]);

  return (
    <ViewPanel
      headerProps={{
        title: 'Model Usage',
        description: 'Detailed model insights along with model usage trends.',
        onBack,
      }}
      contentClassName="space-y-6"
    >
      <div className="space-y-6">
        <div className="text-sm text-gray-500">
          Each seat comes with at least 300 Premium Request Units (PRUs) that reset monthly. Comparing premium and standard usage helps ensure those high-value requests are fully utilized before they expire.
        </div>
        {premiumUtilization && (
          <InsightsCard
            title="Premium Request Utilization"
            variant={premiumUtilization.variant}
          >
            {premiumUtilization.paragraphs.map((paragraph, index) => (
              <p key={index} className={index > 0 ? 'mt-2' : ''}>
                {paragraph}
              </p>
            ))}
            {premiumUtilization.summaryLines.length > 0 && (
              <ul className="mt-4 list-disc pl-5 space-y-1">
                {premiumUtilization.summaryLines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            )}
            {premiumUtilization.note && (
              <p className="mt-3 text-xs">
                {premiumUtilization.note}
              </p>
            )}
          </InsightsCard>
        )}
        <ModelsUsageChart metrics={metrics} variant="standard" />
        <ModelsUsageChart metrics={metrics} variant="premium" />
      </div>
    </ViewPanel>
  );
}

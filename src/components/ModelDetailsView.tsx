'use client';

import React, { useMemo } from 'react';
import ModelsUsageChart from './charts/ModelsUsageChart';
import DailyPremiumBaseChart from './charts/DailyPremiumBaseChart';
import type { ModelBreakdownData } from '../types/metrics';
import { ViewPanel } from './ui';

interface ModelDetailsViewProps {
  modelBreakdownData: ModelBreakdownData;
}

export default function ModelDetailsView({ modelBreakdownData }: ModelDetailsViewProps) {
  const premiumUtilization = useMemo(() => {
    const { premiumTotal, standardTotal, unknownTotal } = modelBreakdownData;

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
    let variant: 'green' | 'red' | 'orange' | 'purple';

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
  }, [modelBreakdownData]);

  return (
    <ViewPanel
      headerProps={{
        title: 'Model Usage',
        description: 'Detailed model insights along with model usage trends.',
      }}
      contentClassName="space-y-6"
    >
      <div className="space-y-6">
        <div className="text-sm text-gray-500">
          Each seat comes with at least 300 Premium Request Units (PRUs) that reset monthly. Comparing premium and standard usage helps ensure those high-value requests are fully utilized before they expire.
        </div>
        {premiumUtilization && (
          <div className="border border-gray-200 rounded-md bg-white">
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900">Premium Request Utilization</h4>
            </div>
            <div className="px-4 py-4 space-y-3 text-sm text-gray-900">
              {premiumUtilization.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {premiumUtilization.summaryLines.length > 0 && (
                <dl className="mt-2 grid grid-cols-1 gap-1 border-t border-gray-100 pt-3">
                  {premiumUtilization.summaryLines.map((line, index) => {
                    const [label, value] = line.split(': ');
                    return value ? (
                      <div key={index} className="flex justify-between gap-4">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="font-medium tabular-nums text-right">{value}</dd>
                      </div>
                    ) : (
                      <div key={index} className="text-gray-700">{line}</div>
                    );
                  })}
                </dl>
              )}
              {premiumUtilization.note && (
                <p className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                  {premiumUtilization.note}
                </p>
              )}
            </div>
          </div>
        )}
        <DailyPremiumBaseChart modelBreakdownData={modelBreakdownData} />
        <ModelsUsageChart modelEntries={modelBreakdownData.standardModels} dates={modelBreakdownData.dates} totalInteractions={modelBreakdownData.standardTotal} variant="standard" />
        <ModelsUsageChart modelEntries={modelBreakdownData.premiumModels} dates={modelBreakdownData.dates} totalInteractions={modelBreakdownData.premiumTotal} variant="premium" />
      </div>
    </ViewPanel>
  );
}

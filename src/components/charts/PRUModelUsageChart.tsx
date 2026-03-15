'use client';

import { useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal, calculateAverage } from '../../domain/calculators/statsCalculators';
import { chartColors } from './utils/chartColors';
import { DailyModelUsageData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import ChartToggleButtons from '../ui/ChartToggleButtons';
import InsightsCard from '../ui/InsightsCard';
import { computePruAdoptionInsight, computeBillingCycleInsight } from '../../domain/pruAdoptionInsights';

registerChartJS();

interface PRUModelUsageChartProps {
  data: DailyModelUsageData[];
  hideInsights?: boolean;
}

const CHART_TYPE_OPTIONS = [
  { value: 'area' as const, label: 'Area' },
  { value: 'bar' as const, label: 'Bar' },
];

export default function PRUModelUsageChart({ data, hideInsights = false }: PRUModelUsageChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const totalPRURequests = calculateTotal(data, d => d.pruModels);
  const totalStandardRequests = calculateTotal(data, d => d.standardModels);
  const totalUnknownRequests = calculateTotal(data, d => d.unknownModels);
  const totalPRUs = calculateTotal(data, d => d.totalPRUs);
  const totalCost = calculateTotal(data, d => d.serviceValue);
  const grandTotal = totalPRURequests + totalStandardRequests + totalUnknownRequests;
  const pruAdoptionInsight = computePruAdoptionInsight(totalPRURequests, totalStandardRequests, totalUnknownRequests);
  const billingCycleInsight = computeBillingCycleInsight(data);
  const avgPRUs = calculateAverage(data, d => d.totalPRUs);
  const avgCost = calculateAverage(data, d => d.serviceValue);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        label: 'Premium Models (PRU)',
        data: data.map(d => d.pruModels),
        backgroundColor: chartColors.red.alpha60,
        borderColor: chartColors.red.solid,
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      },
      {
        label: 'Standard Models (GPT-4.1/4o)',
        data: data.map(d => d.standardModels),
        backgroundColor: chartColors.green.alpha60,
        borderColor: chartColors.green.solid,
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      },
      {
        label: 'Unknown Models',
        data: data.map(d => d.unknownModels),
        backgroundColor: chartColors.gray.alpha60,
        borderColor: chartColors.gray.solid,
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      }
    ]
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Number of Requests',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y;
      const datasetLabel = context.dataset.label;
      return `${datasetLabel}: ${value} requests`;
    },
  });

  return (
    <ChartContainer
      title="Daily PRU vs Standard Model Usage"
      isEmpty={!data || data.length === 0}
      emptyState="No model usage data available"
      headerActions={
        <ChartToggleButtons options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
      }
      summaryStats={[
        { value: totalPRURequests, label: 'PRU Requests', sublabel: grandTotal > 0 ? `${Math.round((totalPRURequests / grandTotal) * 100)}%` : '0%', colorClass: 'text-red-600' },
        { value: totalStandardRequests, label: 'Standard Requests', sublabel: grandTotal > 0 ? `${Math.round((totalStandardRequests / grandTotal) * 100)}%` : '0%', colorClass: 'text-green-600' },
        { value: totalUnknownRequests, label: 'Unknown Requests', sublabel: grandTotal > 0 ? `${Math.round((totalUnknownRequests / grandTotal) * 100)}%` : '0%', colorClass: 'text-gray-600' },
        { value: Math.round(totalPRUs * 100) / 100, label: 'Total PRUs', sublabel: `Avg: ${avgPRUs}/day`, colorClass: 'text-blue-600' },
        { value: `$${Math.round(totalCost * 100) / 100}`, label: 'Service Value', sublabel: `Avg: $${avgCost}/day`, colorClass: 'text-purple-600' },
      ]}
      chartHeight="h-96"
      footer={
        hideInsights ? undefined : (
          <div className="space-y-4">
            <InsightsCard title="Model Types" variant="blue">
              <p>
                <strong>PRU Models:</strong> Premium models like Claude and Gemini that consume Premium Request Units (PRUs).{' '}
                <strong className="ml-1">Standard Models:</strong> GPT-4.1 and GPT-4o included with paid plans at no additional cost.
              </p>
            </InsightsCard>

            <InsightsCard title={pruAdoptionInsight.title} variant={pruAdoptionInsight.variant}>
              <p>
                {pruAdoptionInsight.message}
                {pruAdoptionInsight.ctaHref && (
                  <>
                    {' '}
                    <a
                      href={pruAdoptionInsight.ctaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {pruAdoptionInsight.ctaLabel}
                    </a>
                  </>
                )}
              </p>
            </InsightsCard>

            {billingCycleInsight && (
              <InsightsCard title={billingCycleInsight.title} variant={billingCycleInsight.variant}>
                <p>
                  {billingCycleInsight.message}
                  {billingCycleInsight.ctaHref && (
                    <>
                      {' '}
                      <a
                        href={billingCycleInsight.ctaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {billingCycleInsight.ctaLabel}
                      </a>
                    </>
                  )}
                </p>
              </InsightsCard>
            )}

            {totalUnknownRequests > 0 && (
              <InsightsCard title="Unknown Requests Detected" variant="orange">
                <p className="mb-2">
                  <strong>{totalUnknownRequests.toLocaleString()}</strong> requests are categorized as &quot;Unknown&quot;. This typically occurs due to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Outdated IDE plugins</strong> — older versions do not provide accurate telemetry. Check the Adoption Insights page for users with outdated plugins.</li>
                  <li><strong>Preview models</strong> — some recently released preview models were not mapped correctly in the telemetry data.</li>
                </ul>
                <p className="mt-2">
                  For more details, see the{' '}
                  <a
                    href="https://github.com/orgs/community/discussions/177273#discussioncomment-15015810"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    GitHub Community discussion
                  </a>.
                </p>
              </InsightsCard>
            )}
          </div>
        )
      }
    >
      <Chart type={chartType === 'area' ? 'line' : 'bar'} data={chartData} options={options} />
    </ChartContainer>
  );
}

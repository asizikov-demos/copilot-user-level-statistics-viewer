'use client';

import { useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createHorizontalBarChartOptions } from './utils/chartOptions';
import { chartColors } from './utils/chartColors';
import { FeatureAdoptionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import ChartToggleButtons from '../ui/ChartToggleButtons';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface FeatureAdoptionChartProps {
  data: FeatureAdoptionData;
}

const VIEW_TYPE_OPTIONS = [
  { value: 'absolute' as const, label: 'Absolute' },
  { value: 'percentage' as const, label: 'Percentage' },
];

export default function FeatureAdoptionChart({ data }: FeatureAdoptionChartProps) {
  const [viewType, setViewType] = useState<'absolute' | 'percentage'>('absolute');

  const features = [
    { name: 'Total Users', count: data?.totalUsers || 0, color: chartColors.indigo.solid, description: 'All users in the dataset' },
    { name: 'Code Completion', count: data?.completionUsers || 0, color: chartColors.green.solid, description: 'Users who used code completion' },
    { name: 'Chat Features', count: data?.chatUsers || 0, color: chartColors.blue.solid, description: 'Users who used any chat feature (Ask/Edit/Agent/Inline)' },
    { name: 'Ask Mode', count: data?.askModeUsers || 0, color: chartColors.purple.solid, description: 'Users who used chat ask mode' },
    { name: 'Edit Mode', count: data?.editModeUsers || 0, color: chartColors.amber.solid, description: 'Users who used chat edit mode' },
    { name: 'IDE Agent Mode', count: data?.agentModeUsers || 0, color: chartColors.red.solid, description: 'Users who used Agent Mode in the IDE' },
    { name: 'Copilot CLI', count: data?.cliUsers || 0, color: chartColors.pink.solid, description: 'Users who used Copilot CLI' },
    { name: 'Inline Chat', count: data?.inlineModeUsers || 0, color: chartColors.violet.solid, description: 'Users who used inline chat' },
    { name: 'Code Review', count: data?.codeReviewUsers || 0, color: chartColors.teal.solid, description: 'Users who used code review features' },
  ];

  const totalUsers = data?.totalUsers || 0;
  const completionRate = totalUsers > 0 ? (data.completionUsers / totalUsers) * 100 : 0;
  const chatRate = totalUsers > 0 ? (data.chatUsers / totalUsers) * 100 : 0;
  const agentRate = totalUsers > 0 ? (data.agentModeUsers / totalUsers) * 100 : 0;
  const cliRate = totalUsers > 0 ? (data.cliUsers / totalUsers) * 100 : 0;
  const advancedUsersCount = (data?.agentModeUsers || 0) + (data?.cliUsers || 0);
  const advancedRate = totalUsers > 0 ? (advancedUsersCount / totalUsers) * 100 : 0;

  const chartData = {
    labels: features.map(f => f.name),
    datasets: [{
      label: viewType === 'absolute' ? 'Number of Users' : 'Percentage of Total Users',
      data: viewType === 'absolute' 
        ? features.map(f => f.count)
        : features.map(f => totalUsers > 0 ? Math.round((f.count / totalUsers) * 100 * 100) / 100 : 0),
      backgroundColor: features.map(f => f.color),
      borderColor: features.map(f => f.color),
      borderWidth: 1
    }]
  };

  const options = {
    ...createHorizontalBarChartOptions({
      xAxisLabel: viewType === 'absolute' ? 'Number of Users' : 'Percentage (%)',
      yAxisLabel: 'Features',
      showLegend: false,
      yMax: viewType === 'percentage' ? 100 : undefined,
    }),
    plugins: {
      title: { display: true, text: 'GitHub Copilot Feature Adoption Funnel' },
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => {
            const index = context[0].dataIndex;
            return features[index].name;
          },
          label: (context: TooltipItem<'bar'>) => {
            const index = context.dataIndex;
            const feature = features[index];
            const percentage = totalUsers > 0 ? Math.round((feature.count / totalUsers) * 100 * 100) / 100 : 0;
            return [
              `Users: ${feature.count}`,
              `Percentage: ${percentage}%`,
              `Description: ${feature.description}`
            ];
          }
        }
      }
    },
  };

  return (
    <ChartContainer
      title="Feature Adoption Funnel"
      isEmpty={!data || totalUsers === 0}
      emptyState="No feature adoption data available"
      headerActions={
        <ChartToggleButtons options={VIEW_TYPE_OPTIONS} value={viewType} onChange={setViewType} />
      }
      summaryStats={[
        { value: `${Math.round(completionRate)}%`, label: 'Completion Adoption', sublabel: `${data?.completionUsers || 0} users`, colorClass: 'text-green-600' },
        { value: `${Math.round(chatRate)}%`, label: 'Chat Adoption', sublabel: `${data?.chatUsers || 0} users`, colorClass: 'text-blue-600' },
        { value: `${Math.round(agentRate)}%`, label: 'IDE Agent Mode Adoption', sublabel: `${data?.agentModeUsers || 0} users`, colorClass: 'text-red-600' },
        { value: `${Math.round(cliRate)}%`, label: 'Copilot CLI Adoption', sublabel: `${data?.cliUsers || 0} users`, colorClass: 'text-pink-600' },
        { value: `${Math.round(advancedRate)}%`, label: 'Advanced Users', sublabel: `${advancedUsersCount} users (IDE Agent Mode + Copilot CLI)`, colorClass: 'text-purple-600' },
      ]}
      chartHeight="h-96"
      footer={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightsCard title="Feature Journey" variant="green">
            <p>
              {completionRate > 80 ? 'Excellent' : completionRate > 60 ? 'Good' : 'Low'} code completion adoption.
              {chatRate > 40 ? ' Strong' : chatRate > 20 ? ' Moderate' : ' Low'} chat feature engagement.
              {agentRate > 10 ? ' Good' : agentRate > 5 ? ' Emerging' : ' Limited'} Agent Mode usage.
            </p>
          </InsightsCard>
          <InsightsCard title="Advanced Features" variant="blue">
            <p>
              IDE Agent Mode and Copilot CLI are advanced features that drive significant productivity gains and are typically used by power users.
              {advancedRate > 15 ? ' High adoption suggests strong engagement among advanced users.' : ' Consider promoting these features to increase adoption among experienced developers.'}
            </p>
          </InsightsCard>
        </div>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}

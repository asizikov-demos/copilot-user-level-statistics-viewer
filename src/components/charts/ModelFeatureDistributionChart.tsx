'use client';

import { useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { registerChartJS } from '../../utils/chartSetup';
import { createBaseChartOptions } from '../../utils/chartOptions';
import { featureColors as baseFeatureColors } from '../../utils/chartColors';
import { calculateTotal } from '../../utils/statsCalculators';
import { ModelFeatureDistributionData } from '../../utils/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import ChartToggleButtons from '../ui/ChartToggleButtons';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface ModelFeatureDistributionChartProps {
  data: ModelFeatureDistributionData[];
}

type ViewType = 'stacked' | 'grouped' | 'pie';

const VIEW_TYPE_OPTIONS = [
  { value: 'stacked' as const, label: 'Stacked' },
  { value: 'grouped' as const, label: 'Grouped' },
];

const VIEW_TYPE_OPTIONS_WITH_PIE = [
  ...VIEW_TYPE_OPTIONS,
  { value: 'pie' as const, label: 'Pie' },
];

export default function ModelFeatureDistributionChart({ data }: ModelFeatureDistributionChartProps) {
  const [viewType, setViewType] = useState<ViewType>('stacked');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Model Feature Distribution">
        <div className="text-center text-gray-500 py-8">
          No model feature distribution data available
        </div>
      </ChartContainer>
    );
  }

  // Filter data based on selection
  const filteredData = selectedModel === 'all' ? data : data.filter(d => d.model === selectedModel);
  
  // Apply progressive disclosure pattern
  const maxItemsToShow = 5;
  const displayData = isExpanded ? filteredData : filteredData.slice(0, maxItemsToShow);

  // Feature colors using centralized palette
  const featureColorMap = {
    agentMode: baseFeatureColors.agentMode.solid,
    askMode: baseFeatureColors.askMode.solid,
    editMode: baseFeatureColors.editMode.solid,
    inlineMode: baseFeatureColors.inlineMode.solid,
    codeCompletion: baseFeatureColors.codeCompletion.solid,
    codeReview: baseFeatureColors.codeReview.solid,
    other: baseFeatureColors.other.solid
  };

  const featureLabels = {
    agentMode: 'Agent Mode',
    askMode: 'Ask Mode',
    editMode: 'Edit Mode',
    inlineMode: 'Inline Chat',
    codeCompletion: 'Code Completion',
    codeReview: 'Code Review',
    other: 'Other'
  };

  const getChartData = () => {
    if (viewType === 'pie' && selectedModel !== 'all') {
      // Pie chart for single model
      const modelData = data.find(d => d.model === selectedModel);
      if (!modelData) return { labels: [], datasets: [] };

      const features = Object.entries(modelData.features).filter(([, value]) => value > 0);
      
      return {
        labels: features.map(([key]) => featureLabels[key as keyof typeof featureLabels]),
        datasets: [{
          data: features.map(([, value]) => value),
          backgroundColor: features.map(([key]) => featureColorMap[key as keyof typeof featureColorMap]),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };
    }

    // Bar charts
    const features = Object.keys(featureLabels) as (keyof typeof featureLabels)[];
    
    if (viewType === 'stacked') {
      return {
        labels: displayData.map(d => d.modelDisplayName),
        datasets: features.map(feature => ({
          label: featureLabels[feature],
          data: displayData.map(d => d.features[feature]),
          backgroundColor: featureColorMap[feature],
          borderColor: featureColorMap[feature],
            borderWidth: 1
        }))
      };
    } else {
      // grouped
      return {
        labels: features.map(f => featureLabels[f]),
        datasets: displayData.map((model, index) => ({
          label: model.modelDisplayName,
          data: features.map(feature => model.features[feature]),
          backgroundColor: `hsl(${(index * 60) % 360}, 70%, 60%)`,
          borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
          borderWidth: 1
        }))
      };
    }
  };

  const chartData = getChartData();

  const tooltipAfterBody = (context: TooltipItem<'bar' | 'doughnut'>[]) => {
    if (viewType === 'pie') {
      return '';
    }
    const dataIndex = context[0].dataIndex;
    const modelData = displayData[dataIndex];
    if (!modelData) return '';
    
    return [
      '',
      `Total Interactions: ${modelData.totalInteractions}`,
      `Total PRUs: ${modelData.totalPRUs}`,
      `Service Value: $${modelData.serviceValue}`,
      `Multiplier: ${modelData.multiplier}x`
    ];
  };

  const options = viewType === 'pie' ? {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `${data.find(d => d.model === selectedModel)?.modelDisplayName} Feature Usage`
      },
      legend: {
        position: 'top' as const,
        display: true
      },
      tooltip: {
        callbacks: {
          afterBody: tooltipAfterBody
        }
      }
    },
  } : {
    ...createBaseChartOptions({
      xAxisLabel: viewType === 'stacked' ? 'Models' : 'Features',
      yAxisLabel: 'Number of Interactions',
      stacked: viewType === 'stacked',
    }),
    plugins: {
      title: {
        display: true,
        text: selectedModel === 'all' 
          ? `Model Feature Distribution (${viewType})`
          : `${data.find(d => d.model === selectedModel)?.modelDisplayName} Feature Usage`
      },
      legend: {
        position: 'top' as const,
        display: true
      },
      tooltip: {
        callbacks: {
          afterBody: tooltipAfterBody
        }
      }
    },
  };

  // Calculate summary statistics
  const totalInteractions = calculateTotal(filteredData, d => d.totalInteractions);
  const totalPRUs = calculateTotal(filteredData, d => d.totalPRUs);
  const totalServiceValue = calculateTotal(filteredData, d => d.serviceValue);
  const highestServiceValueModel = filteredData.length > 0
    ? filteredData.reduce((max, d) => d.serviceValue > max.serviceValue ? d : max, filteredData[0])
    : null;

  const AGENT_MODE_USAGE_THRESHOLD = 0.20; // 20%
  const totalAgentModeInteractions = calculateTotal(filteredData, d => d.features.agentMode);
  const agentModeUsageRatio = totalInteractions > 0 ? totalAgentModeInteractions / totalInteractions : 0;

  const summaryStats = [
    {
      value: totalInteractions,
      label: 'Total Interactions',
      sublabel: `${filteredData.length} models`,
      colorClass: 'text-blue-600' as const
    },
    {
      value: Math.round(totalPRUs * 100) / 100,
      label: 'Total PRUs',
      sublabel: 'From all features',
      colorClass: 'text-purple-600' as const
    },
    {
      value: `$${Math.round(totalServiceValue * 100) / 100}`,
      label: 'Total Realised Service Value',
      sublabel: 'Estimated',
      colorClass: 'text-green-600' as const
    },
    {
      value: `${highestServiceValueModel?.multiplier || 0}x`,
      label: 'Highest Multiplier',
      sublabel: highestServiceValueModel?.modelDisplayName || 'N/A',
      colorClass: 'text-red-600' as const
    }
  ];

  const headerActions = (
    <div className="flex gap-2">
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Models</option>
        {data.map(model => (
          <option key={model.model} value={model.model}>{model.modelDisplayName}</option>
        ))}
      </select>
      <ChartToggleButtons
        options={selectedModel !== 'all' ? VIEW_TYPE_OPTIONS_WITH_PIE : VIEW_TYPE_OPTIONS}
        value={viewType}
        onChange={setViewType}
      />
    </div>
  );

  const footer = (
    <>
      {/* Progressive Disclosure Button */}
      {selectedModel === 'all' && filteredData.length > maxItemsToShow && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            {isExpanded ? 'Show Less' : `Show All ${filteredData.length} Models`}
          </button>
        </div>
      )}

      {/* Model Details Table */}
      <div className="mt-6">
        <h4 className="text-md font-semibold text-gray-800 mb-3">Model Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2">Model</th>
                <th className="px-4 py-2">Multiplier</th>
                <th className="px-4 py-2">Interactions</th>
                <th className="px-4 py-2">PRUs</th>
                <th className="px-4 py-2">Service Value</th>
                <th className="px-4 py-2">Top Feature</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((model) => {
                const topFeature = Object.entries(model.features)
                  .reduce((max, [key, value]) => value > max.value ? { key, value } : max, { key: '', value: 0 });
                
                return (
                  <tr key={model.model} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{model.modelDisplayName}</td>
                    <td className="px-4 py-2">{model.multiplier}x</td>
                    <td className="px-4 py-2">{model.totalInteractions}</td>
                    <td className="px-4 py-2">{model.totalPRUs}</td>
                    <td className="px-4 py-2">${model.serviceValue}</td>
                    <td className="px-4 py-2">
                      {topFeature.value > 0 ? featureLabels[topFeature.key as keyof typeof featureLabels] : 'None'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-1 gap-4">
        <InsightsCard title="Advanced Feature Usage" variant="blue">
          <p>
            Agent Mode is the most advanced feature due to its capabilities.
            {agentModeUsageRatio >= AGENT_MODE_USAGE_THRESHOLD 
              ? ' Active Agent Mode usage detected.' 
              : ' Consider promoting Agent Mode for complex tasks.'}
          </p>
        </InsightsCard>
      </div>
    </>
  );

  return (
    <ChartContainer
      title="Model Feature Distribution"
      headerActions={headerActions}
      summaryStats={summaryStats}
      footer={footer}
    >
      <div className="h-96">
        {viewType === 'pie' ? (
          <Doughnut data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>
    </ChartContainer>
  );
}

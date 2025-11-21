'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ModelFeatureDistributionData } from '../../utils/metricCalculators';
import InsightsCard from '../ui/InsightsCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ModelFeatureDistributionChartProps {
  data: ModelFeatureDistributionData[];
}

export default function ModelFeatureDistributionChart({ data }: ModelFeatureDistributionChartProps) {
  const [viewType, setViewType] = useState<'stacked' | 'grouped' | 'pie'>('stacked');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Model Feature Distribution</h3>
        <div className="text-center text-gray-500 py-8">
          No model feature distribution data available
        </div>
      </div>
    );
  }

  // Filter data based on selection
  const filteredData = selectedModel === 'all' ? data : data.filter(d => d.model === selectedModel);
  
  // Apply progressive disclosure pattern
  const maxItemsToShow = 5;
  const displayData = isExpanded ? filteredData : filteredData.slice(0, maxItemsToShow);

  // Feature colors
  const featureColors = {
    agentMode: 'rgb(239, 68, 68)',     // red
    askMode: 'rgb(59, 130, 246)',      // blue
    editMode: 'rgb(245, 158, 11)',     // yellow
    inlineMode: 'rgb(168, 85, 247)',   // purple
    codeCompletion: 'rgb(34, 197, 94)', // green
    codeReview: 'rgb(20, 184, 166)',   // teal
    other: 'rgb(156, 163, 175)'        // gray
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
          backgroundColor: features.map(([key]) => featureColors[key as keyof typeof featureColors]),
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
          backgroundColor: featureColors[feature],
          borderColor: featureColors[feature],
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
          afterBody: function(context: TooltipItem<'bar' | 'doughnut'>[]) {
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
          }
        }
      }
    },
    scales: viewType === 'pie' ? {} : {
      x: {
        display: true,
        title: {
          display: true,
          text: viewType === 'stacked' ? 'Models' : 'Features'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Interactions'
        },
        stacked: viewType === 'stacked',
        beginAtZero: true
      }
    }
  };

  // Calculate summary statistics
  const totalInteractions = filteredData.reduce((sum, d) => sum + d.totalInteractions, 0);
  const totalPRUs = filteredData.reduce((sum, d) => sum + d.totalPRUs, 0);
  const totalServiceValue = filteredData.reduce((sum, d) => sum + d.serviceValue, 0);
  const highestServiceValueModel = filteredData.reduce((max, d) => d.serviceValue > max.serviceValue ? d : max, filteredData[0]);

  const AGENT_MODE_USAGE_THRESHOLD = 0.20; // 20%
  const totalAgentModeInteractions = filteredData.reduce((sum, d) => sum + d.features.agentMode, 0);
  const agentModeUsageRatio = totalInteractions > 0 ? totalAgentModeInteractions / totalInteractions : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Model Feature Distribution</h3>
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
          <button
            onClick={() => setViewType('stacked')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'stacked' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Stacked
          </button>
          <button
            onClick={() => setViewType('grouped')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'grouped' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Grouped
          </button>
          {selectedModel !== 'all' && (
            <button
              onClick={() => setViewType('pie')}
              className={`px-3 py-1 text-sm rounded ${
                viewType === 'pie' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pie
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalInteractions}</div>
          <div className="text-sm text-gray-600">Total Interactions</div>
          <div className="text-xs text-gray-500">{filteredData.length} models</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{Math.round(totalPRUs * 100) / 100}</div>
          <div className="text-sm text-gray-600">Total PRUs</div>
          <div className="text-xs text-gray-500">From all features</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${Math.round(totalServiceValue * 100) / 100}</div>
          <div className="text-sm text-gray-600">Total Realised Service Value</div>
          <div className="text-xs text-gray-500">Estimated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{highestServiceValueModel?.multiplier || 0}x</div>
          <div className="text-sm text-gray-600">Highest Multiplier</div>
          <div className="text-xs text-gray-500">{highestServiceValueModel?.modelDisplayName || 'N/A'}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        {viewType === 'pie' ? (
          <Doughnut data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>

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
    </div>
  );
}

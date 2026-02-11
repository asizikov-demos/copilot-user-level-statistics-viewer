'use client';

import { Pie } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface UserSummaryChartProps {
  usedChat: boolean;
  usedAgent: boolean;
  usedCli: boolean;
  ideChartData?: ChartData<'pie'>;
  languageChartData?: ChartData<'pie'>;
  modelChartData?: ChartData<'pie'>;
  chartOptions?: ChartOptions<'pie'>;
}

/**
 * Displays a summary of a user's usage across features, IDEs, languages, and models.
 * Expects pre-built Chart.js data objects for each pie chart. Each chart is optional.
 */
export default function UserSummaryChart({
  usedChat,
  usedAgent,
  usedCli,
  ideChartData,
  languageChartData,
  modelChartData,
  chartOptions
}: UserSummaryChartProps) {
  return (
    <ChartContainer title="Summary">
      {/* Features Used */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">Features Used</h4>
        <div className="flex flex-wrap gap-2">
          {usedChat && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Chat
            </span>
          )}
          {usedAgent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          )}
          {usedCli && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
              CLI
            </span>
          )}
          {!usedChat && !usedAgent && !usedCli && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Completion Only
            </span>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IDEs Chart */}
        {ideChartData && ideChartData.labels && ideChartData.labels.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">IDEs (Interactions)</h4>
            <div className="h-48">
              <Pie data={ideChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Languages Chart */}
        {languageChartData && languageChartData.labels && languageChartData.labels.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">Languages (Generations)</h4>
            <div className="h-48">
              <Pie data={languageChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Models Chart */}
        {modelChartData && modelChartData.labels && modelChartData.labels.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">Models (Interactions)</h4>
            <div className="h-48">
              <Pie data={modelChartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    </ChartContainer>
  );
}

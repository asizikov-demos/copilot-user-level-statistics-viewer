'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { createDistributionBarChartConfig, type DistributionBarEntry } from '../../../charts/utils/distributionBarChart';
import ChartContainer from '../../../ui/ChartContainer';

registerChartJS();

interface UserSummaryChartProps {
  usedChat: boolean;
  usedAgent: boolean;
  usedCli: boolean;
  usedCodingAgent: boolean;
  usedCodeReview: boolean;
  usedAutoMode: boolean;
  ideDistribution?: DistributionBarEntry[];
  languageDistribution?: DistributionBarEntry[];
  modelDistribution?: DistributionBarEntry[];
}

interface DistributionTileProps {
  title: string;
  entries: DistributionBarEntry[];
  datasetLabel: string;
  unit: string;
}

function DistributionTile({ title, entries, datasetLabel, unit }: DistributionTileProps) {
  const { chartData, options } = createDistributionBarChartConfig({ entries, datasetLabel, unit });

  return (
    <div className="bg-muted rounded-lg p-4">
      <h4 className="text-sm font-medium text-default mb-3 text-center">{title}</h4>
      <div className="h-48">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

/**
 * Displays a summary of a user's usage across features, IDEs, languages, and models.
 * Each distribution renders as a horizontal bar chart and is optional.
 */
export default function UserSummaryChart({
  usedChat,
  usedAgent,
  usedCli,
  usedCodingAgent,
  usedCodeReview,
  usedAutoMode,
  ideDistribution,
  languageDistribution,
  modelDistribution,
}: UserSummaryChartProps) {
  return (
    <ChartContainer title="Summary">
      {/* Features Used */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-default mb-3">Features Used</h4>
        <div className="flex flex-wrap gap-2">
          {usedChat && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Chat
            </span>
          )}
          {usedAgent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              IDE Agent Mode
            </span>
          )}
          {usedCli && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
              CLI
            </span>
          )}
          {usedCodingAgent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
              Cloud Agent
            </span>
          )}
          {usedCodeReview && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800">
              Code Review
            </span>
          )}
          {usedAutoMode && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800">
              Auto Mode
            </span>
          )}
          {!usedChat && !usedAgent && !usedCli && !usedCodingAgent && !usedCodeReview && !usedAutoMode && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-muted text-default">
              Completion Only
            </span>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ideDistribution && ideDistribution.length > 0 && (
          <DistributionTile
            title="Client Interactions"
            entries={ideDistribution}
            datasetLabel="Interactions"
            unit="interactions"
          />
        )}
        {languageDistribution && languageDistribution.length > 0 && (
          <DistributionTile
            title="Languages (Generations)"
            entries={languageDistribution}
            datasetLabel="Generations"
            unit="generations"
          />
        )}
        {modelDistribution && modelDistribution.length > 0 && (
          <DistributionTile
            title="Models (Interactions)"
            entries={modelDistribution}
            datasetLabel="Interactions"
            unit="interactions"
          />
        )}
      </div>
    </ChartContainer>
  );
}

'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { createDistributionBarChartConfig, type DistributionBarEntry } from '../../../charts/utils/distributionBarChart';
import ChartContainer from '../../../ui/ChartContainer';
import { Label } from '@primer/react';
import { FEATURE_LABEL_VARIANT } from '../../../ui/featureLabels';

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
          {usedChat && <Label size="large" variant={FEATURE_LABEL_VARIANT.chat}>Chat</Label>}
          {usedAgent && <Label size="large" variant={FEATURE_LABEL_VARIANT.ideAgent}>IDE Agent Mode</Label>}
          {usedCli && <Label size="large" variant={FEATURE_LABEL_VARIANT.cli}>CLI</Label>}
          {usedCodingAgent && <Label size="large" variant={FEATURE_LABEL_VARIANT.cloudAgent}>Cloud Agent</Label>}
          {usedCodeReview && <Label size="large" variant={FEATURE_LABEL_VARIANT.codeReview}>Code Review</Label>}
          {usedAutoMode && <Label size="large" variant={FEATURE_LABEL_VARIANT.autoMode}>Auto Mode</Label>}
          {!usedChat && !usedAgent && !usedCli && !usedCodingAgent && !usedCodeReview && !usedAutoMode && (
            <Label size="large" variant={FEATURE_LABEL_VARIANT.completions}>Completion Only</Label>
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

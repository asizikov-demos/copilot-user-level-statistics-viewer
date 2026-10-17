'use client';

import { Pie } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import { registerChartJS } from '../../../charts/utils/chartSetup';
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
  usedCodingAgent,
  usedCodeReview,
  usedAutoMode,
  ideChartData,
  languageChartData,
  modelChartData,
  chartOptions
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
        {/* IDEs Chart */}
        {ideChartData && ideChartData.labels && ideChartData.labels.length > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium text-default mb-3 text-center">Client Interactions</h4>
            <div className="h-48">
              <Pie data={ideChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Languages Chart */}
        {languageChartData && languageChartData.labels && languageChartData.labels.length > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium text-default mb-3 text-center">Languages (Generations)</h4>
            <div className="h-48">
              <Pie data={languageChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Models Chart */}
        {modelChartData && modelChartData.labels && modelChartData.labels.length > 0 && (
          <div className="bg-muted rounded-lg p-4">
            <h4 className="text-sm font-medium text-default mb-3 text-center">Models (Interactions)</h4>
            <div className="h-48">
              <Pie data={modelChartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    </ChartContainer>
  );
}

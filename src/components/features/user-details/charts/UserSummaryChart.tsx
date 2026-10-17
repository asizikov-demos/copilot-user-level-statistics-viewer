'use client';

import CompositionChart from '../../../charts/CompositionChart';
import { hasCompositionData, type CompositionEntry } from '../../../charts/utils/compositionChart';
import ChartContainer from '../../../ui/ChartContainer';
import { Label } from '@primer/react';
import { FEATURE_LABEL_VARIANT } from '../../../ui/featureLabels';

interface UserSummaryChartProps {
  usedChat: boolean;
  usedAgent: boolean;
  usedCli: boolean;
  usedCodingAgent: boolean;
  usedCodeReview: boolean;
  usedAutoMode: boolean;
  ideDistribution?: CompositionEntry[];
  languageDistribution?: CompositionEntry[];
  modelDistribution?: CompositionEntry[];
}

interface CompositionTileProps {
  title: string;
  entries?: CompositionEntry[];
  unit: string;
  /** Accessible name for the tile's breakdown list */
  label: string;
}

function CompositionTile({ title, entries, unit, label }: CompositionTileProps) {
  if (!entries || !hasCompositionData(entries)) return null;

  return (
    <div className="bg-muted rounded-lg p-4">
      <h4 className="text-sm font-medium text-default mb-3 text-center">{title}</h4>
      <CompositionChart variant="pie" entries={entries} unit={unit} label={label} surface="muted" />
    </div>
  );
}

/**
 * Displays a summary of a user's usage across features, IDEs, languages, and models.
 * Each distribution renders as an optional pie chart with a legend of values and shares.
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
    <ChartContainer title="Summary" chartHeight="h-auto">
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
        <CompositionTile
          title="Client Interactions"
          entries={ideDistribution}
          unit="interactions"
          label="Interactions by client"
        />
        <CompositionTile
          title="Languages (Generations)"
          entries={languageDistribution}
          unit="generations"
          label="Generations by language"
        />
        <CompositionTile
          title="Models (Interactions)"
          entries={modelDistribution}
          unit="interactions"
          label="Interactions by model"
        />
      </div>
    </ChartContainer>
  );
}

'use client';

import { useState } from 'react';
import CompositionChartCard from '../../../charts/CompositionChartCard';
import { hasCompositionData, type CompositionEntry } from '../../../charts/utils/compositionChart';
import { FormControl, Select } from '@primer/react';
import FeaturesUsed, { type FeaturePill } from '../FeaturesUsed';

interface UserSummaryChartProps {
  usedChat: boolean;
  usedAgent: boolean;
  usedCli: boolean;
  usedCopilotApp: boolean;
  usedCodingAgent: boolean;
  usedCodeReview: boolean;
  usedAutoMode: boolean;
  usedLocalByok: boolean;
  ideDistribution?: CompositionEntry[];
  clientRequestDistribution?: CompositionEntry[];
  languageDistribution?: CompositionEntry[];
  modelDistribution?: CompositionEntry[];
  modelRequestDistribution?: CompositionEntry[];
}

function SelectableCompositionTile({ kind, interactions, requests }: {
  kind: 'client' | 'model';
  interactions?: CompositionEntry[];
  requests?: CompositionEntry[];
}) {
  const [selectedMeasure, setSelectedMeasure] = useState<'interactions' | 'requests' | null>(null);
  const defaultMeasure = hasCompositionData(interactions) || !hasCompositionData(requests)
    ? 'interactions'
    : 'requests';
  const measure = selectedMeasure ?? defaultMeasure;
  const isRequests = measure === 'requests';
  const title = kind === 'client' ? 'Clients' : 'Models';

  return (
    <CompositionChartCard
      title={title}
      entries={(isRequests ? requests : interactions) ?? []}
      unit={measure}
      label={`${isRequests ? 'Requests' : 'Interactions'} by ${kind}`}
      headerActions={(
        <>
          <span className="hidden text-xs text-muted print:inline">{isRequests ? 'Model requests' : 'Interactions'}</span>
          <div className="print:hidden">
            <FormControl>
              <FormControl.Label visuallyHidden>{kind === 'client' ? 'Client summary measure' : 'Model summary measure'}</FormControl.Label>
              <Select size="small" value={measure} onChange={event => {
                const value = event.target.value;
                if (value === 'interactions' || value === 'requests') {
                  setSelectedMeasure(value);
                }
              }}>
                <Select.Option value="interactions">Interactions</Select.Option>
                <Select.Option value="requests">Model requests</Select.Option>
              </Select>
            </FormControl>
          </div>
        </>
      )}
    />
  );
}

/**
 * Displays a summary of a user's usage across features, IDEs, languages, and models.
 * Each distribution renders a doughnut chart with values and shares, or an empty state.
 */
export default function UserSummaryChart({
  usedChat,
  usedAgent,
  usedCli,
  usedCopilotApp,
  usedCodingAgent,
  usedCodeReview,
  usedAutoMode,
  usedLocalByok,
  ideDistribution,
  clientRequestDistribution,
  languageDistribution,
  modelDistribution,
  modelRequestDistribution,
}: UserSummaryChartProps) {
  const features: FeaturePill[] = [];
  if (usedChat) features.push({ label: 'Chat', feature: 'chat' });
  if (usedAgent) features.push({ label: 'IDE Agent Mode', feature: 'ideAgent' });
  if (usedCli) features.push({ label: 'CLI', feature: 'cli' });
  if (usedCopilotApp) features.push({ label: 'Copilot App', feature: 'copilotApp' });
  if (usedCodingAgent) features.push({ label: 'Cloud Agent', feature: 'cloudAgent' });
  if (usedCodeReview) features.push({ label: 'Code Review', feature: 'codeReview' });
  if (usedAutoMode) features.push({ label: 'Auto Mode', feature: 'autoMode' });
  if (usedLocalByok) features.push({ label: 'Local BYOK', feature: 'localByok' });
  if (features.length === 0) features.push({ label: 'Completion Only', feature: 'completions' });

  return (
    <section aria-label="User usage summary" className="space-y-6">
      <FeaturesUsed features={features} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SelectableCompositionTile
          kind="client"
          interactions={ideDistribution}
          requests={clientRequestDistribution}
        />
        <CompositionChartCard
          title="Languages"
          entries={languageDistribution ?? []}
          unit="generations"
          label="Generations by language"
          headerActions={<span className="text-xs text-muted">Generations</span>}
        />
        <SelectableCompositionTile
          kind="model"
          interactions={modelDistribution}
          requests={modelRequestDistribution}
        />
      </div>
    </section>
  );
}

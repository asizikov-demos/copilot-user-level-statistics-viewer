'use client';

import { useState, type ReactNode } from 'react';
import CompositionChart from '../../../charts/CompositionChart';
import { hasCompositionData, type CompositionEntry } from '../../../charts/utils/compositionChart';
import ChartContainer from '../../../ui/ChartContainer';
import EmptyState from '../../../ui/EmptyState';
import { GraphIcon } from '@primer/octicons-react';
import { FormControl, Label, Select } from '@primer/react';
import { FEATURE_LABEL_VARIANT } from '../../../ui/featureLabels';

interface UserSummaryChartProps {
  usedChat: boolean;
  usedAgent: boolean;
  usedCli: boolean;
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

interface CompositionTileProps {
  title: string;
  entries?: CompositionEntry[];
  unit: string;
  /** Accessible name for the tile's breakdown list */
  label: string;
  controls?: ReactNode;
}

function CompositionTile({ title, entries, unit, label, controls }: CompositionTileProps) {
  return (
    <div className="bg-muted rounded-lg p-4 flex min-w-0 flex-col">
      <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-default">{title}</h4>
        {controls}
      </div>
      {entries && hasCompositionData(entries) ? (
        <CompositionChart variant="doughnut" entries={entries} unit={unit} label={label} surface="muted" />
      ) : (
        <div className="flex h-52 items-center justify-center">
          <div className="w-full">
            <EmptyState icon={GraphIcon} heading="No data available" headingAs="h5" />
          </div>
        </div>
      )}
    </div>
  );
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
    <CompositionTile
      title={title}
      entries={isRequests ? requests : interactions}
      unit={measure}
      label={`${isRequests ? 'Requests' : 'Interactions'} by ${kind}`}
      controls={(
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
  return (
    <ChartContainer title="Summary" chartHeight="h-auto">
      {/* Features Used */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-default mb-3">Features Used</h4>
        <div className="flex flex-wrap gap-2">
          {usedChat && <Label size="large" variant={FEATURE_LABEL_VARIANT.chat}>Chat</Label>}
          {usedAgent && <Label size="large" variant={FEATURE_LABEL_VARIANT.ideAgent}>IDE Agent Mode</Label>}
          {usedCli && <Label size="large" variant={FEATURE_LABEL_VARIANT.cli}>CLI</Label>}
          {usedCodingAgent && <Label size="large" variant={FEATURE_LABEL_VARIANT.cloudAgent}>Cloud Agent</Label>}
          {usedCodeReview && <Label size="large" variant={FEATURE_LABEL_VARIANT.codeReview}>Code Review</Label>}
          {usedAutoMode && <Label size="large" variant={FEATURE_LABEL_VARIANT.autoMode}>Auto Mode</Label>}
          {usedLocalByok && <Label size="large" variant={FEATURE_LABEL_VARIANT.localByok}>Local BYOK</Label>}
          {!usedChat && !usedAgent && !usedCli && !usedCodingAgent && !usedCodeReview && !usedAutoMode && !usedLocalByok && (
            <Label size="large" variant={FEATURE_LABEL_VARIANT.completions}>Completion Only</Label>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SelectableCompositionTile
          kind="client"
          interactions={ideDistribution}
          requests={clientRequestDistribution}
        />
        <CompositionTile
          title="Languages"
          entries={languageDistribution}
          unit="generations"
          label="Generations by language"
          controls={<span className="text-xs text-muted">Generations</span>}
        />
        <SelectableCompositionTile
          kind="model"
          interactions={modelDistribution}
          requests={modelRequestDistribution}
        />
      </div>
    </ChartContainer>
  );
}

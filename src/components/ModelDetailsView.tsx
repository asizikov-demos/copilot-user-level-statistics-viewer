'use client';

import React, { useMemo } from 'react';
import ModelsUsageChart from './charts/ModelsUsageChart';
import AutoModeAdoptionTrendChart from './charts/AutoModeAdoptionTrendChart';
import type { ModelBreakdownData } from '../types/metrics';
import { ViewPanel } from './ui';
import { MODEL_DETAILS_SECTIONS } from './layout/contextSections';

interface ModelDetailsViewProps {
  modelBreakdownData: ModelBreakdownData;
}

export default function ModelDetailsView({ modelBreakdownData }: ModelDetailsViewProps) {
  const modelEntries = modelBreakdownData.allModels;
  const modelTotal = modelBreakdownData.modelTotal;
  const autoModels = modelBreakdownData.autoModels ?? [];
  const autoModeAdoptionTrend = modelBreakdownData.autoModeAdoptionTrend ?? [];

  const autoTotal = useMemo(
    () => autoModels.reduce((sum, entry) => sum + entry.total, 0),
    [autoModels]
  );
  const [allModelsSection, autoModelsSection, autoAdoptionSection] = MODEL_DETAILS_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Model Usage',
        description: 'Detailed model insights along with model usage trends.',
      }}
      contentClassName="space-y-6"
    >
      <div className="space-y-6">
        <div id={allModelsSection.id} className="scroll-mt-28">
          <ModelsUsageChart modelEntries={modelEntries} dates={modelBreakdownData.dates} totalInteractions={modelTotal} variant="all" />
        </div>
        <div id={autoModelsSection.id} className="scroll-mt-28">
          <ModelsUsageChart modelEntries={autoModels} dates={modelBreakdownData.dates} totalInteractions={autoTotal} variant="auto" />
        </div>
        <div id={autoAdoptionSection.id} className="scroll-mt-28">
          <AutoModeAdoptionTrendChart data={autoModeAdoptionTrend} />
        </div>
      </div>
    </ViewPanel>
  );
}

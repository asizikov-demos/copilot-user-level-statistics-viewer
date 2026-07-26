'use client';

import React from 'react';
import ModelsUsageChart from './charts/ModelsUsageChart';
import ModelCategoryDistributionChart from './charts/ModelCategoryDistributionChart';
import AutoModeAdoptionTrendChart from './charts/AutoModeAdoptionTrendChart';
import type { ModelDetailsReadModel } from '../read-models/models';
import { ViewPanel } from './ui';
import { MODEL_DETAILS_SECTIONS } from './layout/contextSections';

interface ModelDetailsViewProps {
  model: ModelDetailsReadModel;
}

export default function ModelDetailsView({ model }: ModelDetailsViewProps) {
  const {
    allModels,
    modelCategories,
    autoModels,
    autoModeAdoptionTrend,
    dates,
    modelTotal,
    autoTotal,
  } = model;
  const [allModelsSection, modelTypesSection, autoModelsSection, autoAdoptionSection] = MODEL_DETAILS_SECTIONS;

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
          <ModelsUsageChart modelEntries={allModels} dates={dates} totalInteractions={modelTotal} variant="all" />
        </div>
        <div id={modelTypesSection.id} className="scroll-mt-28">
          <ModelCategoryDistributionChart
            entries={modelCategories}
            dates={dates}
            totalInteractions={modelTotal}
          />
        </div>
        <div id={autoModelsSection.id} className="scroll-mt-28">
          <ModelsUsageChart modelEntries={autoModels} dates={dates} totalInteractions={autoTotal} variant="auto" />
        </div>
        <div id={autoAdoptionSection.id} className="scroll-mt-28">
          <AutoModeAdoptionTrendChart data={autoModeAdoptionTrend} />
        </div>
      </div>
    </ViewPanel>
  );
}

'use client';

import React from 'react';
import { ViewPanel } from '../../ui';
import { AI_ADOPTION_PHASE_SECTIONS } from '../../layout/contextSections';
import type { AiAdoptionPhaseReadModel } from '../../../read-models/aiAdoptionPhases';
import { PhaseAssignmentSection } from './sections/PhaseAssignmentSection';
import { PhaseComparisonSection } from './sections/PhaseComparisonSection';
import { PhaseDepthHeader } from './sections/PhaseDepthHeader';

interface AiAdoptionPhaseViewProps {
  model: AiAdoptionPhaseReadModel;
}

export default function AiAdoptionPhaseView({ model }: AiAdoptionPhaseViewProps) {
  const { aiAdoptionPhaseData } = model;
  const [comparisonSection, assignmentSection] = AI_ADOPTION_PHASE_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'AI Adoption Phases',
      }}
      afterHeader={<PhaseDepthHeader aiAdoptionPhaseData={aiAdoptionPhaseData} />}
      contentClassName="space-y-8"
    >
      <PhaseComparisonSection
        sectionId={comparisonSection.id}
        aiAdoptionPhaseData={aiAdoptionPhaseData}
      />
      <PhaseAssignmentSection sectionId={assignmentSection.id} />
    </ViewPanel>
  );
}

import { Label } from '@primer/react';
import type { AIAdoptionPhase } from '../../../types/metrics';
import { formatAiAdoptionPhase } from '../../../utils/formatters';
import { PHASE_LABEL_VARIANT } from './aiAdoptionPhaseMetadata';

interface AiAdoptionPhaseLabelProps {
  phase?: AIAdoptionPhase;
}

export default function AiAdoptionPhaseLabel({ phase }: AiAdoptionPhaseLabelProps) {
  return <Label variant={PHASE_LABEL_VARIANT}>{formatAiAdoptionPhase(phase)}</Label>;
}

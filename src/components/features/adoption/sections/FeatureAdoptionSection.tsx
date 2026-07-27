import FeatureAdoptionChart from '../../../charts/FeatureAdoptionChart';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';

interface FeatureAdoptionSectionProps {
  sectionId: string;
  data: NonNullable<CopilotAdoptionReadModel['featureAdoptionData']>;
}

export function FeatureAdoptionSection({ sectionId, data }: FeatureAdoptionSectionProps) {
  return (
    <div id={sectionId} className="scroll-mt-28">
      <FeatureAdoptionChart data={data} />
    </div>
  );
}

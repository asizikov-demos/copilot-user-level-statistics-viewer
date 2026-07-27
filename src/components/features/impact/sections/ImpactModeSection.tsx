import ModeImpactChart from '../../../charts/ModeImpactChart';
import type { ModeImpactData } from '../../../../domain/calculators/metricCalculators';
import type { ImpactModeConfig } from '../impactModeConfigs';

interface ImpactModeSectionProps {
  sectionId: string;
  data: ModeImpactData[];
  config: ImpactModeConfig;
}

export function ImpactModeSection({
  sectionId,
  data,
  config,
}: ImpactModeSectionProps) {
  return (
    <div id={sectionId} className="scroll-mt-28">
      <ModeImpactChart
        data={data}
        title={config.title}
        description={config.description}
        emptyStateMessage={config.emptyStateMessage}
        footer={'footer' in config ? config.footer : undefined}
      />
    </div>
  );
}

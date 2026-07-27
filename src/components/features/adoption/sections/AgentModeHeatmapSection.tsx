import AgentModeHeatmapChart from '../charts/AgentModeHeatmapChart';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';

interface AgentModeHeatmapSectionProps {
  sectionId: string;
  data: CopilotAdoptionReadModel['agentModeHeatmapData'];
}

export function AgentModeHeatmapSection({ sectionId, data }: AgentModeHeatmapSectionProps) {
  return (
    <div id={sectionId} className="scroll-mt-28">
      <AgentModeHeatmapChart data={data} />
    </div>
  );
}

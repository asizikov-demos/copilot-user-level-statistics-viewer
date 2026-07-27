import CloudAgentAdoptionChart from '../charts/CloudAgentAdoptionChart';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';

interface CloudAgentAdoptionSectionProps {
  data: CopilotAdoptionReadModel['dailyCloudAgentAdoptionData'];
  reportStartDay: string;
  reportEndDay: string;
}

export function CloudAgentAdoptionSection({
  data,
  reportStartDay,
  reportEndDay,
}: CloudAgentAdoptionSectionProps) {
  return (
    <CloudAgentAdoptionChart
      data={data}
      reportStartDay={reportStartDay}
      reportEndDay={reportEndDay}
    />
  );
}

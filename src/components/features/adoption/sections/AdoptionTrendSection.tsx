import AdoptionTrendChart from '../charts/AdoptionTrendChart';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';

interface AdoptionTrendSectionProps {
  sectionId: string;
  data: CopilotAdoptionReadModel['dailyAdoptionTrend'];
  reportStartDay: string;
  reportEndDay: string;
}

export function AdoptionTrendSection({
  sectionId,
  data,
  reportStartDay,
  reportEndDay,
}: AdoptionTrendSectionProps) {
  return (
    <div id={sectionId} className="scroll-mt-28">
      <AdoptionTrendChart
        data={data}
        reportStartDay={reportStartDay}
        reportEndDay={reportEndDay}
      />
    </div>
  );
}

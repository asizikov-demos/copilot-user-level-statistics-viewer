import CodeReviewAdoptionChart from '../charts/CodeReviewAdoptionChart';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';

interface CodeReviewAdoptionSectionProps {
  data: CopilotAdoptionReadModel['dailyCodeReviewAdoptionData'];
  reportStartDay: string;
  reportEndDay: string;
}

export function CodeReviewAdoptionSection({
  data,
  reportStartDay,
  reportEndDay,
}: CodeReviewAdoptionSectionProps) {
  return (
    <CodeReviewAdoptionChart
      data={data}
      reportStartDay={reportStartDay}
      reportEndDay={reportEndDay}
    />
  );
}

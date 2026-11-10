import type { ComponentProps } from 'react';
import { computeUserClientActivity } from '../../../../../../domain/calculators/userPresentationCalculator';
import ClientActivityChart from '../../ClientActivityChart';

type Props = Omit<ComponentProps<typeof ClientActivityChart>, 'activity'> & Pick<
  Parameters<typeof computeUserClientActivity>[0], 'ideAggregates' | 'days'
>;

export default function PreparedClientActivityChart({ ideAggregates, days, ...props }: Props) {
  const activity = computeUserClientActivity({
    ideAggregates,
    days,
    clientTraffic: props.traffic ?? {
      summary: { recordCount: 0, reportedRecords: 0, activeUsers: 0, clients: [] },
      daily: [],
    },
    reportStartDay: props.reportStartDay,
    reportEndDay: props.reportEndDay,
  });
  return <ClientActivityChart {...props} activity={activity} />;
}

import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import type { ViewMode } from '../../../types/navigation';
import { resolveStandardRouteAdapter } from './standardRouteRegistry';

interface StandardRouteOutletProps {
  view: ViewMode;
  aggregatedMetrics: AggregatedMetrics;
  enterpriseName: string | null;
  onUserSelect: (userLogin: string, userId: number) => void;
}

export default function StandardRouteOutlet({
  view,
  aggregatedMetrics,
  enterpriseName,
  onUserSelect,
}: StandardRouteOutletProps) {
  const RouteAdapter = resolveStandardRouteAdapter(view);

  return (
    <RouteAdapter
      aggregatedMetrics={aggregatedMetrics}
      enterpriseName={enterpriseName}
      onUserSelect={onUserSelect}
    />
  );
}

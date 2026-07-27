import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import {
  resolveStandardRouteAdapter,
  type StandardViewMode,
} from './standardRouteRegistry';

interface StandardRouteOutletProps {
  view: StandardViewMode;
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

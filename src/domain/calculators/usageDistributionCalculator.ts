import type {
  AiAdoptionPhaseAccumulator,
  AiAdoptionPhaseTopEntry,
  DimensionUsageTotals,
  UserPhaseAccumulatorEntry,
} from './aiAdoptionPhaseCalculator';
import { addUserDimensionsToPhase, computeTopEntries } from './aiAdoptionPhaseCalculator';

export type UsageDistributionBucketId = 'power' | 'heavy' | 'typical' | 'light';

export interface UsageDistributionBucket {
  id: UsageDistributionBucketId;
  label: string;
  description: string;
  userCount: number;
  totalAiCreditsUsed: number;
  avgAiCreditsUsed: number;
  avgDaysActive: number;
  totalLocAdded: number;
  totalLocDeleted: number;
  topModels: AiAdoptionPhaseTopEntry[];
  topClients: AiAdoptionPhaseTopEntry[];
}

interface BucketDefinition {
  id: UsageDistributionBucketId;
  label: string;
  description: string;
  /** Cumulative upper boundary as a fraction of the ranked population. */
  cumulativeFraction: number;
}

const BUCKET_DEFINITIONS: BucketDefinition[] = [
  { id: 'power', label: 'Power Users', description: 'Top 5% by AI credit consumption', cumulativeFraction: 0.05 },
  { id: 'heavy', label: 'Heavy Users', description: 'Next 15% by AI credit consumption', cumulativeFraction: 0.2 },
  { id: 'typical', label: 'Typical Users', description: 'Middle 55% by AI credit consumption', cumulativeFraction: 0.75 },
  { id: 'light', label: 'Light Users', description: 'Remaining 25% by AI credit consumption', cumulativeFraction: 1 },
];

function aggregateBucket(
  definition: BucketDefinition,
  users: UserPhaseAccumulatorEntry[]
): UsageDistributionBucket {
  const models: DimensionUsageTotals = new Map();
  const clients: DimensionUsageTotals = new Map();

  let totalAiCreditsUsed = 0;
  let totalDaysActive = 0;
  let totalLocAdded = 0;
  let totalLocDeleted = 0;

  for (const user of users) {
    totalAiCreditsUsed += user.totalAiCreditsUsed;
    totalDaysActive += user.activeDays.size;
    totalLocAdded += user.totalLocAdded;
    totalLocDeleted += user.totalLocDeleted;
    addUserDimensionsToPhase(models, user.models);
    addUserDimensionsToPhase(clients, user.clients);
  }

  const userCount = users.length;

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    userCount,
    totalAiCreditsUsed,
    avgAiCreditsUsed: userCount > 0 ? totalAiCreditsUsed / userCount : 0,
    avgDaysActive: userCount > 0 ? totalDaysActive / userCount : 0,
    totalLocAdded,
    totalLocDeleted,
    topModels: computeTopEntries(models),
    topClients: computeTopEntries(clients),
  };
}

export function computeUsageDistributionData(
  accumulator: AiAdoptionPhaseAccumulator
): UsageDistributionBucket[] {
  const rankedUsers = Array.from(accumulator.users.values()).sort(
    (a, b) => b.totalAiCreditsUsed - a.totalAiCreditsUsed || b.activeDays.size - a.activeDays.size
  );

  const totalUsers = rankedUsers.length;

  let cursor = 0;
  return BUCKET_DEFINITIONS.map((definition) => {
    const upperBound = Math.round(totalUsers * definition.cumulativeFraction);
    const end = Math.max(cursor, Math.min(upperBound, totalUsers));
    const bucketUsers = rankedUsers.slice(cursor, end);
    cursor = end;
    return aggregateBucket(definition, bucketUsers);
  });
}

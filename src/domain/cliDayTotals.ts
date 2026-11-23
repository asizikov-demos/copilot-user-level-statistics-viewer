import type { UserDayData } from '../types/metrics';
import { isCliFeature } from './featureCategories';

export interface CliFeatureTotals {
  interactions: number;
  generations: number;
  acceptances: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface CliDayTotals extends CliFeatureTotals {
  promptCount: number;
  interactionCount: number;
}

function createEmptyCliFeatureTotals(): CliFeatureTotals {
  return {
    interactions: 0,
    generations: 0,
    acceptances: 0,
    locAdded: 0,
    locDeleted: 0,
    locSuggestedToAdd: 0,
    locSuggestedToDelete: 0,
  };
}

export function computeCliFeatureTotals(totalsByFeature: UserDayData['totals_by_feature']): CliFeatureTotals {
  return totalsByFeature.reduce((acc, feature) => {
    if (!isCliFeature(feature.feature)) return acc;

    acc.interactions += feature.user_initiated_interaction_count;
    acc.generations += feature.code_generation_activity_count;
    acc.acceptances += feature.code_acceptance_activity_count;
    acc.locAdded += feature.loc_added_sum;
    acc.locDeleted += feature.loc_deleted_sum;
    acc.locSuggestedToAdd += feature.loc_suggested_to_add_sum;
    acc.locSuggestedToDelete += feature.loc_suggested_to_delete_sum;

    return acc;
  }, createEmptyCliFeatureTotals());
}

export function computeCliDayTotals(
  day?: Pick<UserDayData, 'totals_by_feature' | 'totals_by_cli'>
): CliDayTotals {
  const featureTotals = computeCliFeatureTotals(day?.totals_by_feature ?? []);
  const promptCount = day?.totals_by_cli?.prompt_count ?? 0;
  const interactionCount = featureTotals.interactions > 0 ? featureTotals.interactions : promptCount;

  return {
    ...featureTotals,
    promptCount,
    interactionCount,
  };
}

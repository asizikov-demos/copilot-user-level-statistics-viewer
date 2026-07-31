/** Fields shared by all aggregate types: code-generation, acceptance, and LOC. */
export interface AggMetricTotals {
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

/** Extends AggMetricTotals with user-initiated interaction count (used by Feature, IDE, ModelFeature). */
export interface InteractionAggMetricTotals extends AggMetricTotals {
  user_initiated_interaction_count: number;
  assumed_user_initiated_interaction_count: number;
}

/** Accumulates the 6 shared code-gen/acceptance/LOC fields in-place on `existing`. */
export function accumulateAggMetricTotals(existing: AggMetricTotals, incoming: AggMetricTotals): void {
  existing.code_generation_activity_count += incoming.code_generation_activity_count;
  existing.code_acceptance_activity_count += incoming.code_acceptance_activity_count;
  existing.loc_added_sum += incoming.loc_added_sum;
  existing.loc_deleted_sum += incoming.loc_deleted_sum;
  existing.loc_suggested_to_add_sum += incoming.loc_suggested_to_add_sum;
  existing.loc_suggested_to_delete_sum += incoming.loc_suggested_to_delete_sum;
}

/** Accumulates user-interaction count plus the 6 shared code-gen/acceptance/LOC fields in-place on `existing`. */
export function accumulateInteractionAggMetricTotals(
  existing: InteractionAggMetricTotals,
  incoming: InteractionAggMetricTotals
): void {
  existing.user_initiated_interaction_count += incoming.user_initiated_interaction_count;
  existing.assumed_user_initiated_interaction_count += incoming.assumed_user_initiated_interaction_count;
  accumulateAggMetricTotals(existing, incoming);
}

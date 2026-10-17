'use client';

import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { translateFeature } from '../../../../domain/featureTranslations';

interface UserDetailsFeatureActivitySectionProps {
  sectionId: string;
  featureAggregates: UserDetailedMetrics['featureAggregates'];
}

export default function UserDetailsFeatureActivitySection({
  sectionId,
  featureAggregates,
}: UserDetailsFeatureActivitySectionProps) {
  return (
    <div id={sectionId} className="mt-8 pt-6 border-t border-default scroll-mt-28">
      <h3 className="text-lg font-semibold text-default mb-4">Activity by Feature</h3>
      <div className="overflow-x-auto border border-default">
        <table className="w-full divide-y divide-default">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Feature</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Interactions</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Generation</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Acceptance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">LOC Added</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">LOC Deleted</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Suggested Add</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Suggested Delete</th>
            </tr>
          </thead>
          <tbody className="bg-default divide-y divide-default">
            {featureAggregates.map((feature) => (
              <tr key={feature.feature}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-default">{translateFeature(feature.feature)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{getTotalUserInitiatedInteractionCount(feature).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.code_generation_activity_count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.loc_added_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.loc_deleted_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.loc_suggested_to_add_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-default text-right">{feature.loc_suggested_to_delete_sum.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

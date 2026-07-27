'use client';

import type {
  DailyCliSessionData,
  DailyCliTokenData,
} from '../../../../domain/calculators/metricCalculators';
import CLISessionChart from '../../../charts/CLISessionChart';
import CLITokensChart from '../../../charts/CLITokensChart';

interface UserDetailsCliUsageSectionProps {
  tokenData: DailyCliTokenData[];
  sessionData: DailyCliSessionData[];
}

export default function UserDetailsCliUsageSection({
  tokenData,
  sessionData,
}: UserDetailsCliUsageSectionProps) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Copilot CLI Usage</h3>
      <div className="space-y-8">
        <CLITokensChart data={tokenData} />
        <CLISessionChart data={sessionData} />
      </div>
    </div>
  );
}

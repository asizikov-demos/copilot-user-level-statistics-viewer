'use client';

import type {
  DailyCliSessionData,
  DailyCliTokenData,
} from '../../../../domain/calculators/metricCalculators';
import CLISessionChart from '../../../charts/CLISessionChart';
import CLITokensChart from '../../../charts/CLITokensChart';

interface UserDetailsCliUsageSectionProps {
  cliTokenData: DailyCliTokenData[];
  appTokenData: DailyCliTokenData[];
  cliSessionData: DailyCliSessionData[];
  appSessionData: DailyCliSessionData[];
}

export default function UserDetailsCliUsageSection({
  cliTokenData,
  appTokenData,
  cliSessionData,
  appSessionData,
}: UserDetailsCliUsageSectionProps) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Copilot CLI &amp; App Usage</h3>
      <div className="space-y-8">
        <CLITokensChart data={cliTokenData} appData={appTokenData} />
        <CLISessionChart data={cliSessionData} appData={appSessionData} />
      </div>
    </div>
  );
}

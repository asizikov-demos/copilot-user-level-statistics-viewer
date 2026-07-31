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
  const hasAppActivity =
    appTokenData.some(day =>
      day.outputTokens > 0 || day.promptTokens > 0 || day.requestCount > 0
    )
    || appSessionData.some(day =>
      day.sessionCount > 0 || day.requestCount > 0 || day.promptCount > 0
    );

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {hasAppActivity ? 'Copilot CLI & App Usage' : 'Copilot CLI Usage'}
      </h3>
      <div className="space-y-8">
        <CLITokensChart data={cliTokenData} appData={hasAppActivity ? appTokenData : undefined} />
        <CLISessionChart data={cliSessionData} appData={hasAppActivity ? appSessionData : undefined} />
      </div>
    </div>
  );
}

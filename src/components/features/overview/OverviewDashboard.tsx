'use client';

import React from 'react';
import { MetricsStats } from '../../../types/metrics';
import { DailyEngagementData, DailyChatUsersData, DailyChatRequestsData, DailyAiCreditsData } from '../../../domain/calculators/metricCalculators';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import AiCreditsChart from '../../charts/AiCreditsChart';

interface OverviewDashboardProps {
  stats: MetricsStats;
  enterpriseName: string | null;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  dailyAiCreditsData: DailyAiCreditsData[];
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  enterpriseName,
  engagementData,
  chatUsersData,
  chatRequestsData,
  dailyAiCreditsData,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const hasAiCreditsData = dailyAiCreditsData.some(entry => entry.aiCreditsUsed > 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl text-gray-900">
          <span className="font-semibold">Metrics Overview</span>
          <br />
          <span className="text-sm font-normal text-gray-600">Data covers the period from <strong>{formatDate(stats.reportStartDay)}</strong> to <strong>{formatDate(stats.reportEndDay)}</strong>{enterpriseName && <> for Enterprise <strong>{enterpriseName}</strong></>}</span>
        </h2>
      </div>

      <div className="w-full">
        <EngagementChart data={engagementData} />
      </div>

      <div className="w-full">
        <ChatUsersChart data={chatUsersData} />
      </div>

      <div className="w-full">
        <ChatRequestsChart data={chatRequestsData} />
      </div>

      {hasAiCreditsData && (
        <div className="w-full">
          <AiCreditsChart
            data={dailyAiCreditsData}
            reportStartDay={stats.reportStartDay}
            reportEndDay={stats.reportEndDay}
          />
        </div>
      )}
    </div>
  );
};

export default OverviewDashboard;

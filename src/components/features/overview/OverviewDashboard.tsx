'use client';

import React from 'react';
import { MetricsStats } from '../../../types/metrics';
import { DailyEngagementData, DailyChatUsersData, DailyChatRequestsData } from '../../../domain/calculators/metricCalculators';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import { OVERVIEW_SECTIONS } from './overviewSections';

const [engagementSection, chatUsersSection, chatRequestsSection] = OVERVIEW_SECTIONS;

interface OverviewDashboardProps {
  stats: MetricsStats;
  enterpriseName: string | null;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  enterpriseName,
  engagementData,
  chatUsersData,
  chatRequestsData,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl text-gray-900">
          <span className="font-semibold">Metrics Overview</span>
          <br />
          <span className="text-sm font-normal text-gray-600">Data covers the period from <strong>{formatDate(stats.reportStartDay)}</strong> to <strong>{formatDate(stats.reportEndDay)}</strong>{enterpriseName && <> for Enterprise <strong>{enterpriseName}</strong></>}</span>
        </h2>
      </div>

      <div id={engagementSection.id} className="w-full scroll-mt-28">
        <EngagementChart data={engagementData} />
      </div>

      <div id={chatUsersSection.id} className="w-full scroll-mt-28">
        <ChatUsersChart data={chatUsersData} />
      </div>

      <div id={chatRequestsSection.id} className="w-full scroll-mt-28">
        <ChatRequestsChart data={chatRequestsData} />
      </div>
    </div>
  );
};

export default OverviewDashboard;

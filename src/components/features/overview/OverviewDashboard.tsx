'use client';

import React from 'react';
import type { OverviewReadModel } from '../../../read-models/overview';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import { OVERVIEW_SECTIONS } from './overviewSections';

const [engagementSection, chatUsersSection, chatRequestsSection] = OVERVIEW_SECTIONS;

interface OverviewDashboardProps {
  model: OverviewReadModel;
  enterpriseName: string | null;
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  model,
  enterpriseName,
}) => {
  const {
    reportStartDay,
    reportEndDay,
    engagementData,
    chatUsersData,
    chatRequestsData,
  } = model;
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
          <span className="text-sm font-normal text-gray-600">Data covers the period from <strong>{formatDate(reportStartDay)}</strong> to <strong>{formatDate(reportEndDay)}</strong>{enterpriseName && <> for Enterprise <strong>{enterpriseName}</strong></>}</span>
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

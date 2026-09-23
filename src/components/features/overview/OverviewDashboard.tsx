'use client';

import React from 'react';
import type { OverviewReadModel } from '../../../read-models/overview';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import OverviewHeader from './OverviewHeader';
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
    engagementData,
    chatUsersData,
    chatRequestsData,
    header,
  } = model;

  return (
    <div className="space-y-8">
      <OverviewHeader model={header} enterpriseName={enterpriseName} />

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

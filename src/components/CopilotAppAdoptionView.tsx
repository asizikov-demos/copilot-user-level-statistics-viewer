"use client";

import React from 'react';
import { ViewPanel } from './ui';
import CLIAdoptionTrendChart from './charts/CLIAdoptionTrendChart';
import CLIUsersChart from './charts/CLIUsersChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import ModelsUsageChart from './charts/ModelsUsageChart';
import { COPILOT_APP_ADOPTION_SECTIONS } from './layout/contextSections';
import type { CopilotAppAdoptionReadModel } from '../read-models/copilotAppAdoption';

interface CopilotAppAdoptionViewProps {
  model: CopilotAppAdoptionReadModel;
}

export default function CopilotAppAdoptionView({ model }: CopilotAppAdoptionViewProps) {
  const {
    stats,
    appUsers,
    dailySessionData,
    dailyTokenData,
    dailyAdoptionTrend,
    modelEntries,
    modelDates,
    modelTotal,
    appShare,
  } = model;
  const [trendSection, usersSection, sessionsSection, tokensSection, modelsSection] = COPILOT_APP_ADOPTION_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot App Adoption',
        description: (
          <p className="text-muted text-sm mt-1">
            This report contains <strong>{appUsers.toLocaleString()}</strong> GitHub Copilot App users out of <strong>{stats.uniqueUsers.toLocaleString()}</strong> (<strong>{appShare}%</strong>)
          </p>
        ),
      }}
      contentClassName="space-y-8"
    >

      <div id={trendSection.id} className="scroll-mt-28">
        <CLIAdoptionTrendChart data={dailyAdoptionTrend} stats={stats} client="Copilot App" clientUsers={appUsers} />
      </div>
      <div id={usersSection.id} className="scroll-mt-28">
        <CLIUsersChart data={dailySessionData} client="Copilot App" />
      </div>
      <div id={sessionsSection.id} className="scroll-mt-28">
        <CLISessionChart data={dailySessionData} client="Copilot App" />
      </div>
      <div id={tokensSection.id} className="scroll-mt-28">
        <CLITokensChart data={dailyTokenData} client="Copilot App" />
      </div>
      <div id={modelsSection.id} className="scroll-mt-28">
        <ModelsUsageChart modelEntries={modelEntries} dates={modelDates} totalInteractions={modelTotal} variant="app" />
      </div>
    </ViewPanel>
  );
}

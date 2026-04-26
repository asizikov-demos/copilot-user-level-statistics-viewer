'use client';

import React, { useEffect, useState } from 'react';
import { VIEW_MODES } from '../../types/navigation';
import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import { useNavigation } from '../../state/NavigationContext';
import { useMetrics } from '../MetricsContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useResetAppState } from '../../hooks/useResetAppState';
import { terminateWorker, computeUserDetailsInWorker } from '../../workers/metricsWorkerClient';
import { FileUploadArea } from '../features/file-upload';
import { OverviewDashboard } from '../features/overview';
import UniqueUsersView from '../UniqueUsersView';
import UserDetailsView from '../UserDetailsView';
import LanguagesView from '../LanguagesView';
import ClientsView from '../ClientsView';
import CopilotImpactView from '../CopilotImpactView';
import CopilotAdoptionView from '../CopilotAdoptionView';
import CLIAdoptionView from '../CLIAdoptionView';
import ModelDetailsView from '../ModelDetailsView';
import ExecutiveSummaryView from '../ExecutiveSummaryView';
import ClientVersionsView from '../ClientVersionsView';

const ViewRouter: React.FC = () => {
  const { 
    hasData, enterpriseName, aggregatedMetrics,
    isLoading, error
  } = useMetrics();
  const { 
    currentView, selectedUser,
    navigateTo, selectUser
  } = useNavigation();
  const { handleFileUpload, handleSampleLoad, uploadProgress } = useFileUpload();
  const resetAppState = useResetAppState();

  const [userDetails, setUserDetails] = useState<UserDetailedMetrics | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);

  useEffect(() => {
    setUserDetails(null);
    setUserDetailsLoading(false);
    setLoadedUserId(null);
  }, [aggregatedMetrics]);

  useEffect(() => {
    if (currentView === VIEW_MODES.USER_DETAILS && selectedUser && loadedUserId !== selectedUser.id) {
      setUserDetailsLoading(true);
      setUserDetails(null);
      computeUserDetailsInWorker(selectedUser.id)
        .then(details => {
          setUserDetails(details);
          setLoadedUserId(selectedUser.id);
          setUserDetailsLoading(false);
        })
        .catch(() => {
          setUserDetailsLoading(false);
          navigateTo(VIEW_MODES.USERS);
        });
    }
  }, [currentView, selectedUser, loadedUserId, navigateTo]);

  useEffect(() => {
    return () => { terminateWorker(); };
  }, []);

  const handleUserClick = (userLogin: string, userId: number) => {
    selectUser({ login: userLogin, id: userId });
  };

  if (error && hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to process metrics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={resetAppState}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <FileUploadArea
        onFileUpload={handleFileUpload}
        onSampleLoad={handleSampleLoad}
        isLoading={isLoading}
        error={error}
        uploadProgress={uploadProgress}
      />
    );
  }

  if (isLoading || !aggregatedMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Processing metrics...</p>
        </div>
      </div>
    );
  }

  const { 
    stats, 
    userSummaries, 
    engagementData, 
    chatUsersData, 
    chatRequestsData, 
    languageStats,
    modelUsageData,
    featureAdoptionData,
    agentModeHeatmapData,
    agentImpactData,
    codeCompletionImpactData,
    editModeImpactData,
    inlineModeImpactData,
    askModeImpactData,
    cliImpactData,
    planModeImpactData,
    joinedImpactData,
    ideStats,
    multiIDEUsersCount,
    totalUniqueIDEUsers,
    pluginVersionData,
    languageFeatureImpactData,
    dailyLanguageGenerationsData,
    dailyLanguageLocData,
    modelBreakdownData,
    dailyCliSessionData,
    dailyCliTokenData,
    dailyCliAdoptionTrend,
    dailyAdoptionTrend,
  } = aggregatedMetrics;

  switch (currentView) {
    case VIEW_MODES.EXECUTIVE_SUMMARY:
      return (
        <ExecutiveSummaryView
          stats={stats}
          enterpriseName={enterpriseName}
          joinedImpactData={joinedImpactData}
          modelUsageData={modelUsageData}
          agentImpactData={agentImpactData}
          codeCompletionImpactData={codeCompletionImpactData}
          featureAdoptionData={featureAdoptionData}
        />
      );

    case VIEW_MODES.CLIENT_VERSIONS:
      return (
        <ClientVersionsView
          pluginVersionData={pluginVersionData}
          stats={stats}
        />
      );

    case VIEW_MODES.LANGUAGES:
      return (
        <LanguagesView
          languages={languageStats}
          languageFeatureImpactData={languageFeatureImpactData}
          dailyLanguageGenerationsData={dailyLanguageGenerationsData}
          dailyLanguageLocData={dailyLanguageLocData}
        />
      );

    case VIEW_MODES.CLIENT_ANALYSIS:
      return (
        <ClientsView 
          ideStats={ideStats}
          multiIDEUsersCount={multiIDEUsersCount}
          totalUniqueIDEUsers={totalUniqueIDEUsers}
          cliUsers={stats.cliUsers}
          cliSessions={dailyCliSessionData.reduce((sum, d) => sum + d.sessionCount, 0)}
          cliLocAdded={cliImpactData.reduce((sum, d) => sum + d.locAdded, 0)}
          cliLocDeleted={cliImpactData.reduce((sum, d) => sum + d.locDeleted, 0)}
        />
      );

    case VIEW_MODES.COPILOT_IMPACT:
      return (
        <CopilotImpactView
          agentImpactData={agentImpactData}
          codeCompletionImpactData={codeCompletionImpactData}
          editModeImpactData={editModeImpactData}
          inlineModeImpactData={inlineModeImpactData}
          askModeImpactData={askModeImpactData}
          cliImpactData={cliImpactData}
          planModeImpactData={planModeImpactData}
          joinedImpactData={joinedImpactData}
        />
      );

    case VIEW_MODES.COPILOT_ADOPTION:
      return (
        <CopilotAdoptionView
          featureAdoptionData={featureAdoptionData}
          agentModeHeatmapData={agentModeHeatmapData}
          stats={stats}
          dailyAdoptionTrend={dailyAdoptionTrend}
        />
      );

    case VIEW_MODES.CLI_ADOPTION:
      return (
        <CLIAdoptionView
          stats={stats}
          dailyCliSessionData={dailyCliSessionData}
          dailyCliTokenData={dailyCliTokenData}
          dailyCliAdoptionTrend={dailyCliAdoptionTrend}
        />
      );

    case VIEW_MODES.USERS:
      return (
        <UniqueUsersView 
          users={userSummaries} 
          onUserClick={handleUserClick}
        />
      );

    case VIEW_MODES.USER_DETAILS:
      if (!selectedUser) {
        navigateTo(VIEW_MODES.USERS);
        return null;
      }
      {
        if (userDetailsLoading || !userDetails) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading user details...</p>
              </div>
            </div>
          );
        }
        const userSummary = userSummaries.find(u => u.user_id === selectedUser.id);
        if (!userSummary) {
          navigateTo(VIEW_MODES.USERS);
          return null;
        }
        return (
          <UserDetailsView
            userDetails={userDetails}
            userSummary={userSummary}
            userLogin={selectedUser.login}
            userId={selectedUser.id}
          />
        );
      }

    case VIEW_MODES.MODEL_DETAILS:
      return (
        <ModelDetailsView
          modelBreakdownData={modelBreakdownData}
        />
      );

    case VIEW_MODES.OVERVIEW:
    default:
      return (
        <OverviewDashboard
          stats={stats}
          enterpriseName={enterpriseName}
          engagementData={engagementData}
          chatUsersData={chatUsersData}
          chatRequestsData={chatRequestsData}
        />
      );
  }
};

export default ViewRouter;

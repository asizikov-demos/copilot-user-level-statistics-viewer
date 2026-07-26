'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VIEW_MODES } from '../../types/navigation';
import { useNavigation } from '../../state/NavigationContext';
import { useMetrics } from '../MetricsContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useResetAppState } from '../../hooks/useResetAppState';
import { terminateWorker, computeUserDetailsInWorker } from '../../workers/metricsWorkerClient';
import {
  resolveUserDetailsRouteState,
  type UserDetailsLoadState,
} from './userDetailsRouteState';
import { runUserDetailsRequest } from './userDetailsRequest';
import { FileUploadArea } from '../features/file-upload';
import { OverviewDashboard } from '../features/overview';
import UniqueUsersView from '../UniqueUsersView';
import UserDetailsView from '../UserDetailsView';
import LanguagesView from '../LanguagesView';
import ClientsView from '../ClientsView';
import CopilotImpactView from '../CopilotImpactView';
import CopilotAdoptionView from '../CopilotAdoptionView';
import AiAdoptionPhaseView from '../AiAdoptionPhaseView';
import CLIAdoptionView from '../CLIAdoptionView';
import ModelDetailsView from '../ModelDetailsView';
import ExecutiveSummaryView from '../ExecutiveSummaryView';
import AiCreditsView from '../AiCreditsView';
import ClientVersionsView from '../ClientVersionsView';
import AboutView from '../AboutView';

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

  const [userDetailsLoadState, setUserDetailsLoadState] = useState<UserDetailsLoadState>({
    status: 'idle',
  });
  const [userDetailsRetryKey, setUserDetailsRetryKey] = useState(0);
  const userDetailsRequestVersion = useRef(0);
  const userDetailsRouteState = resolveUserDetailsRouteState({
    currentView,
    selectedUser,
    userSummaries: aggregatedMetrics?.userSummaries ?? null,
    dataset: aggregatedMetrics,
    loadState: userDetailsLoadState,
  });

  useEffect(() => {
    userDetailsRequestVersion.current += 1;
    setUserDetailsLoadState({ status: 'idle' });
  }, [aggregatedMetrics, selectedUser]);

  useEffect(() => {
    if (userDetailsRouteState.status === 'redirect') {
      navigateTo(VIEW_MODES.USERS);
    }
  }, [userDetailsRouteState.status, navigateTo]);

  let userDetailsRequestUserId: number | null = null;
  let userDetailsRequestLogin: string | null = null;
  if (
    userDetailsRouteState.status === 'error'
    || userDetailsRouteState.status === 'ready'
    || (
      userDetailsRouteState.status === 'loading'
      && userDetailsRouteState.userSummary !== null
    )
  ) {
    userDetailsRequestUserId = userDetailsRouteState.selectedUser.id;
    userDetailsRequestLogin = userDetailsRouteState.selectedUser.login;
  }
  const userDetailsRequestDataset = userDetailsRequestUserId === null
    ? null
    : aggregatedMetrics;

  useEffect(() => {
    if (!userDetailsRequestDataset || userDetailsRequestUserId === null) {
      return;
    }

    const requestVersion = userDetailsRequestVersion.current + 1;
    userDetailsRequestVersion.current = requestVersion;
    setUserDetailsLoadState({
      status: 'loading',
      dataset: userDetailsRequestDataset,
      userId: userDetailsRequestUserId,
    });

    void runUserDetailsRequest({
      userId: userDetailsRequestUserId,
      load: computeUserDetailsInWorker,
      isCurrent: () => userDetailsRequestVersion.current === requestVersion,
      onSuccess: (details) => {
        setUserDetailsLoadState({
          status: 'ready',
          dataset: userDetailsRequestDataset,
          userId: userDetailsRequestUserId,
          details,
        });
      },
      onError: (message) => {
        setUserDetailsLoadState({
          status: 'error',
          dataset: userDetailsRequestDataset,
          userId: userDetailsRequestUserId,
          message,
        });
      },
    });

    return () => {
      if (userDetailsRequestVersion.current === requestVersion) {
        userDetailsRequestVersion.current += 1;
      }
    };
  }, [
    userDetailsRequestDataset,
    userDetailsRequestLogin,
    userDetailsRequestUserId,
    userDetailsRetryKey,
  ]);

  useEffect(() => {
    return () => { terminateWorker(); };
  }, []);

  const handleUserClick = (userLogin: string, userId: number) => {
    selectUser({ login: userLogin, id: userId });
  };

  const retryUserDetails = () => {
    setUserDetailsRetryKey((retryKey) => retryKey + 1);
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
    featureAdoptionData,
    agentModeHeatmapData,
    agentImpactData,
    codeCompletionImpactData,
    editModeImpactData,
    inlineModeImpactData,
    askModeImpactData,
    cliImpactData,
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
    dailyCloudAgentAdoptionData = [],
    dailyCodeReviewAdoptionData = [],
    aiAdoptionPhaseData = [],
    dailyAiCreditsData = [],
    usageDistributionData = [],
  } = aggregatedMetrics;

  switch (currentView) {
    case VIEW_MODES.EXECUTIVE_SUMMARY:
      return (
        <ExecutiveSummaryView
          stats={stats}
          enterpriseName={enterpriseName}
          joinedImpactData={joinedImpactData}
          agentImpactData={agentImpactData}
          codeCompletionImpactData={codeCompletionImpactData}
          featureAdoptionData={featureAdoptionData}
        />
      );

    case VIEW_MODES.AI_CREDITS:
      return (
        <AiCreditsView
          stats={stats}
          dailyAiCreditsData={dailyAiCreditsData}
          userSummaries={userSummaries}
          usageDistributionData={usageDistributionData}
          onUserClick={handleUserClick}
        />
      );

    case VIEW_MODES.ABOUT:
      return <AboutView />;

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
          dailyCloudAgentAdoptionData={dailyCloudAgentAdoptionData}
          dailyCodeReviewAdoptionData={dailyCodeReviewAdoptionData}
        />
      );

    case VIEW_MODES.AI_ADOPTION_PHASES:
      return (
        <AiAdoptionPhaseView
          phaseData={aiAdoptionPhaseData}
        />
      );

    case VIEW_MODES.CLI_ADOPTION:
      return (
        <CLIAdoptionView
          stats={stats}
          dailyCliSessionData={dailyCliSessionData}
          dailyCliTokenData={dailyCliTokenData}
          dailyCliAdoptionTrend={dailyCliAdoptionTrend}
          cliModelEntries={modelBreakdownData.cliModels ?? []}
          cliModelDates={
            dailyCliSessionData.length > 0
              ? dailyCliSessionData.map((entry) => entry.date)
              : modelBreakdownData.dates
          }
          cliModelTotal={modelBreakdownData.cliTotal ?? 0}
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
      if (
        userDetailsRouteState.status === 'inactive'
        || userDetailsRouteState.status === 'redirect'
      ) {
        return null;
      }

      if (userDetailsRouteState.status === 'loading') {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading user details...</p>
            </div>
          </div>
        );
      }

      if (userDetailsRouteState.status === 'error') {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Failed to load user details
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userDetailsRouteState.message}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={retryUserDetails}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigateTo(VIEW_MODES.USERS)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
                >
                  Back to Users
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <UserDetailsView
          userDetails={userDetailsRouteState.details}
          userSummary={userDetailsRouteState.userSummary}
          userLogin={userDetailsRouteState.selectedUser.login}
          userId={userDetailsRouteState.selectedUser.id}
        />
      );

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

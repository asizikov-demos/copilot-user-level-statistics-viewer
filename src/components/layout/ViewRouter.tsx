'use client';

import React, { useEffect } from 'react';
import { VIEW_MODES } from '../../types/navigation';
import { useNavigation } from '../../state/NavigationContext';
import { useRawMetrics } from '../MetricsContext';
import { useMetricsProcessing } from '../../hooks/useMetricsProcessing';
import { useFileUpload } from '../../hooks/useFileUpload';
import { FileUploadArea } from '../features/file-upload';
import { OverviewDashboard } from '../features/overview';
import UniqueUsersView from '../UniqueUsersView';
import UserDetailsView from '../UserDetailsView';
import LanguagesView from '../LanguagesView';
import IDEView from '../IDEView';
import CopilotImpactView from '../CopilotImpactView';
import PRUUsageAnalysisView from '../PRUUsageAnalysisView';
import CopilotAdoptionView from '../CopilotAdoptionView';
import ModelDetailsView from '../ModelDetailsView';
import ExecutiveSummaryView from '../ExecutiveSummaryView';

const ViewRouter: React.FC = () => {
  const { 
    rawMetrics, hasData, enterpriseName,
    clearRawMetrics, resetRawMetrics
  } = useRawMetrics();
  const { 
    currentView, selectedUser, selectedModel,
    navigateTo, selectUser, selectModel, clearSelectedModel, resetNavigation
  } = useNavigation();
  const { handleFileUpload, handleSampleLoad, isLoading, error, uploadProgress } = useFileUpload();

  const { aggregatedMetrics, isProcessing, processingError } = useMetricsProcessing(rawMetrics, hasData);

  useEffect(() => {
    if (aggregatedMetrics && rawMetrics.length > 0) {
      clearRawMetrics();
    }
  }, [aggregatedMetrics, rawMetrics.length, clearRawMetrics]);

  const resetData = () => {
    resetRawMetrics();
    resetNavigation();
  };

  const handleUserClick = (userLogin: string, userId: number) => {
    selectUser({ login: userLogin, id: userId });
  };

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

  if (processingError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to process metrics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{processingError}</p>
          <button
            onClick={resetData}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing || !aggregatedMetrics) {
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
    pruAnalysisData,
    agentModeHeatmapData,
    modelFeatureDistributionData,
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
    userDetailedMetrics,
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
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.LANGUAGES:
      return (
        <LanguagesView
          languages={languageStats}
          languageFeatureImpactData={languageFeatureImpactData}
          dailyLanguageGenerationsData={dailyLanguageGenerationsData}
          dailyLanguageLocData={dailyLanguageLocData}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.IDES:
      return (
        <IDEView 
          ideStats={ideStats}
          multiIDEUsersCount={multiIDEUsersCount}
          totalUniqueIDEUsers={totalUniqueIDEUsers}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)} 
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
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.PRU_USAGE:
      return (
        <PRUUsageAnalysisView
          modelUsageData={modelUsageData}
          pruAnalysisData={pruAnalysisData}
          modelFeatureDistributionData={modelFeatureDistributionData}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.COPILOT_ADOPTION:
      return (
        <CopilotAdoptionView
          featureAdoptionData={featureAdoptionData}
          agentModeHeatmapData={agentModeHeatmapData}
          stats={stats}
          pluginVersionData={pluginVersionData}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.USERS:
      return (
        <UniqueUsersView 
          users={userSummaries} 
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)} 
          onUserClick={handleUserClick}
        />
      );

    case VIEW_MODES.USER_DETAILS:
      if (!selectedUser) {
        navigateTo(VIEW_MODES.USERS);
        return null;
      }
      {
        const userDetails = userDetailedMetrics.get(selectedUser.id);
        const userSummary = userSummaries.find(u => u.user_id === selectedUser.id);
        if (!userDetails || !userSummary) {
          navigateTo(VIEW_MODES.USERS);
          return null;
        }
        return (
          <UserDetailsView
            userDetails={userDetails}
            userSummary={userSummary}
            userLogin={selectedUser.login}
            userId={selectedUser.id}
            onBack={() => navigateTo(VIEW_MODES.USERS)}
          />
        );
      }

    case VIEW_MODES.MODEL_DETAILS:
      if (!selectedModel) {
        navigateTo(VIEW_MODES.OVERVIEW);
        return null;
      }
      return (
        <ModelDetailsView
          modelBreakdownData={modelBreakdownData}
          onBack={() => {
            navigateTo(VIEW_MODES.OVERVIEW);
            clearSelectedModel();
          }}
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
          onNavigate={navigateTo}
          onModelSelect={selectModel}
          onReset={resetData}
        />
      );
  }
};

export default ViewRouter;

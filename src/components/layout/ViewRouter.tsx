'use client';

import React, { useState, useEffect } from 'react';
import { CopilotMetrics } from '../../types/metrics';
import { VIEW_MODES } from '../../types/navigation';
import { useNavigation } from '../../state/NavigationContext';
import { useFilters } from '../../state/FilterContext';
import { useMetricsData, useRawMetrics } from '../MetricsContext';
import { useMetricsProcessing } from '../../hooks/useMetricsProcessing';
import { useFileUpload } from '../../hooks/useFileUpload';
import { FileUploadArea } from '../features/file-upload';
import { OverviewDashboard } from '../features/overview';
import UniqueUsersView from '../UniqueUsersView';
import UserDetailsView from '../UserDetailsView';
import LanguagesView from '../LanguagesView';
import IDEView from '../IDEView';
import DataQualityAnalysisView from '../DataQualityAnalysisView';
import CopilotImpactView from '../CopilotImpactView';
import CustomerEmailView from '../CustomerEmailView';
import PRUUsageAnalysisView from '../PRUUsageAnalysisView';
import CopilotAdoptionView from '../CopilotAdoptionView';
import ModelDetailsView from '../ModelDetailsView';

const ViewRouter: React.FC = () => {
  const { setFilteredData } = useMetricsData();
  const { 
    rawMetrics, originalStats, enterpriseName,
    resetRawMetrics
  } = useRawMetrics();
  const { 
    currentView, selectedUser, selectedModel,
    navigateTo, selectUser, selectModel, clearSelectedModel, resetNavigation
  } = useNavigation();
  const { 
    dateRange, removeUnknownLanguages,
    setDateRange, setRemoveUnknownLanguages, resetFilters
  } = useFilters();
  const { handleFileUpload, isLoading, error } = useFileUpload();

  const [selectedUserMetrics, setSelectedUserMetrics] = useState<CopilotMetrics[]>([]);

  const filteredData = useMetricsProcessing(
    rawMetrics,
    originalStats,
    dateRange,
    removeUnknownLanguages
  );

  const { 
    metrics, 
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
    joinedImpactData
  } = filteredData;

  useEffect(() => {
    if (stats) {
      setFilteredData(filteredData);
    }
  }, [filteredData, stats, setFilteredData]);

  const resetData = () => {
    resetRawMetrics();
    resetNavigation();
    resetFilters();
    setSelectedUserMetrics([]);
  };

  const handleUserClick = (userLogin: string, userId: number, userMetrics: CopilotMetrics[]) => {
    setSelectedUserMetrics(userMetrics);
    selectUser({ login: userLogin, id: userId });
  };

  if (!stats) {
    return (
      <FileUploadArea
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  switch (currentView) {
    case VIEW_MODES.DATA_QUALITY:
      return (
        <DataQualityAnalysisView 
          metrics={metrics} 
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)} 
        />
      );

    case VIEW_MODES.LANGUAGES:
      return (
        <LanguagesView 
          languages={languageStats} 
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)} 
        />
      );

    case VIEW_MODES.IDES:
      return (
        <IDEView 
          metrics={metrics} 
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
          joinedImpactData={joinedImpactData}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.CUSTOMER_EMAIL:
      return (
        <CustomerEmailView
          metrics={metrics}
          featureAdoptionData={featureAdoptionData}
          joinedImpactData={joinedImpactData}
          agentImpactData={agentImpactData}
          codeCompletionImpactData={codeCompletionImpactData}
          askModeImpactData={askModeImpactData}
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
          metrics={metrics}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)}
        />
      );

    case VIEW_MODES.USERS:
      return (
        <UniqueUsersView 
          users={userSummaries} 
          rawMetrics={metrics}
          onBack={() => navigateTo(VIEW_MODES.OVERVIEW)} 
          onUserClick={handleUserClick}
        />
      );

    case VIEW_MODES.USER_DETAILS:
      if (!selectedUser) {
        navigateTo(VIEW_MODES.USERS);
        return null;
      }
      return (
        <UserDetailsView
          userMetrics={selectedUserMetrics}
          userLogin={selectedUser.login}
          userId={selectedUser.id}
          onBack={() => navigateTo(VIEW_MODES.USERS)}
        />
      );

    case VIEW_MODES.MODEL_DETAILS:
      if (!selectedModel) {
        navigateTo(VIEW_MODES.OVERVIEW);
        return null;
      }
      return (
        <ModelDetailsView
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
          originalStats={originalStats}
          enterpriseName={enterpriseName}
          engagementData={engagementData}
          chatUsersData={chatUsersData}
          chatRequestsData={chatRequestsData}
          dateRange={dateRange}
          removeUnknownLanguages={removeUnknownLanguages}
          onDateRangeChange={setDateRange}
          onRemoveUnknownLanguagesChange={setRemoveUnknownLanguages}
          onNavigate={navigateTo}
          onModelSelect={selectModel}
          onReset={resetData}
        />
      );
  }
};

export default ViewRouter;

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { UserDayData } from '../../../types/metrics';
import {
  selectUserDetailsHeaderReadModel,
  type UserDetailsViewModel,
} from '../../../read-models/userDetails';
import { GraphIcon } from '@primer/octicons-react';
import { formatIDEName } from '../../icons/IDEIcons';
import { formatModelDisplayName, generateDateRange } from '../../../utils/formatters';
import { mapReportRangeData, padReportRangeWithDefaults } from '../../../utils/timeSeries';
import ClientActivityChart from './charts/ClientActivityChart';
import CloudAgentsUsageChart from './charts/CloudAgentsUsageChart';
import AiCreditsChart from '../../charts/AiCreditsChart';
import ThirdPartyAgentActivityChart from '../../charts/ThirdPartyAgentActivityChart';
import EmptyState from '../../ui/EmptyState';
import ModeImpactChart from '../../charts/ModeImpactChart';
import UserSummaryChart from './charts/UserSummaryChart';
import UserActivityByLanguageAndFeatureChart from './charts/UserActivityByLanguageAndFeatureChart';
import UserActivityByModelAndFeatureChart from './charts/UserActivityByModelAndFeatureChart';
import DayDetailsModal from './day-details/DayDetailsModal';
import UserDetailsAgentUsageSection from './sections/UserDetailsAgentUsageSection';
import UserDetailsCustomizationsSection from './sections/UserDetailsCustomizationsSection';
import UserDetailsFeatureActivitySection from './sections/UserDetailsFeatureActivitySection';
import UserDetailsHeader from './sections/UserDetailsHeader';
import UserDetailsImpactBreakdownSection from './sections/UserDetailsImpactBreakdownSection';
import UserDetailsOverviewSection from './sections/UserDetailsOverviewSection';
import { ViewPanel } from '../../ui';
import { VIEW_MODES } from '../../../types/navigation';
import { useNavigation } from '../../../state/NavigationContext';
import type { ModeImpactData } from '../../../domain/calculators/metricCalculators';
import { registerChartJS } from '../../charts/utils/chartSetup';
import {
  getIdeColor,
  getLanguageColor,
  getSequentialColor,
} from '../../charts/utils/chartColors';
import type { CompositionEntry } from '../../charts/utils/compositionChart';
import { isActiveAutoModeFeature } from '../../../domain/autoMode';
import { isCliFeature } from '../../../domain/featureCategories';
import { USER_DETAILS_SECTIONS } from './userDetailsSections';
import { selectDayReportingQuality } from '../../../read-models/userDetails';

registerChartJS();

interface UserDetailsViewProps {
  model: UserDetailsViewModel;
}

function fillDateRange(data: ModeImpactData[], startDay: string, endDay: string): ModeImpactData[] {
  if (data.length === 0) return [];
  const totalUniqueUsers = data[0]?.totalUniqueUsers ?? 0;
  return padReportRangeWithDefaults(data, startDay, endDay, entry => entry.date, date => ({
    date,
    locAdded: 0,
    locDeleted: 0,
    netChange: 0,
    userCount: 0,
    totalUniqueUsers,
  }));
}

export default function UserDetailsView({ model }: UserDetailsViewProps) {
  const { userDetails, userSummary, userLogin, userId } = model;
  const { navigateTo } = useNavigation();
  const filledCombinedImpact = useMemo(() => fillDateRange(userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const hasCombinedImpactData = useMemo(() => filledCombinedImpact.some(entry => entry.locAdded !== 0 || entry.locDeleted !== 0), [filledCombinedImpact]);
  const filledAgentImpact = useMemo(() => fillDateRange(userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledAskModeImpact = useMemo(() => fillDateRange(userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCompletionImpact = useMemo(() => fillDateRange(userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCopilotAppImpact = useMemo(() => fillDateRange(userDetails.dailyCopilotAppImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCopilotAppImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCliImpact = useMemo(() => fillDateRange(userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay]);

  const [modalState, setModalState] = useState<{
    userId: number;
    isOpen: boolean;
    selectedDate: string;
    selectedMetrics?: UserDayData;
  }>({
    userId,
    isOpen: false,
    selectedDate: '',
    selectedMetrics: undefined,
  });
  if (modalState.userId !== userId) {
    setModalState({ userId, isOpen: false, selectedDate: '', selectedMetrics: undefined });
  }

  const [isImpactBreakdownExpanded, setIsImpactBreakdownExpanded] = useState(false);

  const handleDayClick = (date: string, dayData?: UserDayData) => {
    setModalState({
      userId,
      isOpen: true,
      selectedDate: date,
      selectedMetrics: dayData,
    });
  };

  const handleCloseModal = () => {
    setModalState({
      userId,
      isOpen: false,
      selectedDate: '',
      selectedMetrics: undefined,
    });
  };

  const reportDateRange = useMemo(
    () => generateDateRange(userDetails.reportStartDay, userDetails.reportEndDay),
    [userDetails.reportStartDay, userDetails.reportEndDay],
  );
  const dayMetricsMap = useMemo(
    () => new Map(userDetails.days.map(d => [d.day, d])),
    [userDetails.days],
  );

  const selectedDayIndex = modalState.isOpen ? reportDateRange.indexOf(modalState.selectedDate) : -1;
  const canNavigatePrevDay = selectedDayIndex > 0;
  const canNavigateNextDay = selectedDayIndex >= 0 && selectedDayIndex < reportDateRange.length - 1;

  const handleNavigateDay = useCallback((direction: -1 | 1) => {
    setModalState(prev => {
      if (!prev.isOpen) return prev;
      const idx = reportDateRange.indexOf(prev.selectedDate);
      if (idx === -1) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= reportDateRange.length) return prev;
      const nextDate = reportDateRange[nextIdx];
      return {
        ...prev,
        isOpen: true,
        selectedDate: nextDate,
        selectedMetrics: dayMetricsMap.get(nextDate),
      };
    });
  }, [reportDateRange, dayMetricsMap]);

  const handleCopyUserLogin = () => {
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(userLogin).catch((error: unknown) => {
        console.error('Failed to copy username to clipboard:', error);
      });
      return;
    }

    // Fallback for environments where the Clipboard API is not available
    try {
      const textArea = document.createElement('textarea');
      textArea.value = userLogin;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      if (!successful) {
        throw new Error('document.execCommand("copy") failed');
      }
      document.body.removeChild(textArea);
    } catch (error) {
      console.error('Failed to copy username to clipboard: Clipboard API not available and fallback failed.', error);
    }
  };

  const { presentationSummary } = userDetails;
  const headerSummary = useMemo(() => selectUserDetailsHeaderReadModel(model), [model]);
  const usedAgent = userSummary.used_agent;
  const usedChat = userSummary.used_chat;
  const usedCli = userSummary.used_cli;
  const usedCodingAgent = userSummary.used_copilot_coding_agent;
  const usedCodeReviewActive = userSummary.used_copilot_code_review_active;
  const usedCodeReviewPassive = userSummary.used_copilot_code_review_passive;
  const usedCodeReview = usedCodeReviewActive || usedCodeReviewPassive;
  const usedLocalByok = userSummary.used_local_byok === true;

  const { featureAggregates, ideAggregates, languageFeatureAggregates, modelFeatureAggregates } = userDetails;
  const usedAutoMode = userSummary.used_auto_mode ?? modelFeatureAggregates.some(isActiveAutoModeFeature);

  const agentInteractions = presentationSummary.featureInteractions.chat_panel_agent_mode ?? 0;
  const planInteractions = presentationSummary.featureInteractions.chat_panel_plan_mode ?? 0;
  const askModeInteractions = presentationSummary.featureInteractions.chat_panel_ask_mode ?? 0;
  const editModeInteractions = presentationSummary.featureInteractions.chat_panel_edit_mode ?? 0;
  const completionInteractions = presentationSummary.featureInteractions.code_completion ?? 0;
  const cliInteractions = presentationSummary.totalCliPrompts;

  // Client identities keep their colors when ranks change.
  const { ideDistribution, clientRequestDistribution } = useMemo(() => {
    const toDistribution = (clients: typeof presentationSummary.clientInteractions): CompositionEntry[] =>
      clients.map(({ key, value }) => ({
        clientKey: key, label: formatIDEName(key), value, color: getIdeColor(key),
      }));
    return {
      ideDistribution: toDistribution(presentationSummary.clientInteractions),
      clientRequestDistribution: toDistribution(presentationSummary.clientRequests),
    };
  }, [presentationSummary]);

  const languageDistribution = useMemo<CompositionEntry[]>(() => {
    return presentationSummary.languageGenerations.map(({ key: language, value }, rank) => ({
      label: language,
      value,
      color: getLanguageColor(language, rank),
    }));
  }, [presentationSummary]);

  const { modelDistribution, modelRequestDistribution } = useMemo(() => {
    const toDistribution = (totals: typeof presentationSummary.modelInteractions): CompositionEntry[] =>
      totals.map(({ key: model, value }, rank) => ({
        label: formatModelDisplayName(model),
        value,
        color: getSequentialColor(rank),
      }));
    return {
      modelDistribution: toDistribution(presentationSummary.modelInteractions),
      modelRequestDistribution: toDistribution(presentationSummary.modelRequests),
    };
  }, [presentationSummary]);

  const cloudAgentsUsageData = useMemo(() => {
    return mapReportRangeData(
      userDetails.days,
      userDetails.reportStartDay,
      userDetails.reportEndDay,
      day => day.day,
      (date, day) => ({
        date,
        cloudAgent: day?.used_copilot_coding_agent ? 1 : 0,
        codeReviewActive: day?.used_copilot_code_review_active ? 1 : 0,
        codeReviewPassive: day?.used_copilot_code_review_passive ? 1 : 0,
      }),
    );
  }, [userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay]);

  const hasClientActivity = ideAggregates.length > 0
    || userDetails.clientTraffic.summary.reportedRecords > 0
    || userDetails.days.some(day => day.totals_by_cli != null)
    || featureAggregates.some(feature => isCliFeature(feature.feature));
  const hasDetailedActivity = hasClientActivity
    || featureAggregates.length > 0
    || languageFeatureAggregates.length > 0
    || modelFeatureAggregates.length > 0;
  const showCloudAgentsUsage = usedCodingAgent || usedCodeReview;
  const dailyAiCreditsData = presentationSummary.dailyAiCredits;
  const [
    overviewSection,
    summarySection,
    aiCreditsSection,
    customizationsSection,
    combinedImpactSection,
    impactBreakdownSection,
    agentActivitySection,
    thirdPartyAgentActivitySection,
    clientActivitySection,
    featureActivitySection,
    languageActivitySection,
    modelActivitySection,
  ] = USER_DETAILS_SECTIONS;

  return (
    <ViewPanel
      header={(
        <UserDetailsHeader
          userLogin={userLogin}
          userId={userId}
          aiAdoptionPhase={userSummary.ai_adoption_phase}
          summary={headerSummary}
          onBackToUsers={() => navigateTo(VIEW_MODES.USERS)}
          onCopyUserLogin={handleCopyUserLogin}
        />
      )}
      contentClassName="space-y-8"
    >
      <UserDetailsOverviewSection
        key={userId}
        sectionId={overviewSection.id}
        days={userDetails.days}
        reportStartDay={userDetails.reportStartDay}
        reportEndDay={userDetails.reportEndDay}
        activityCalendar={userDetails.activityCalendar}
        reportingQuality={userDetails.reportingQuality}
        onDayClick={handleDayClick}
        agentInteractions={agentInteractions}
        planInteractions={planInteractions}
        cliInteractions={cliInteractions}
        askModeInteractions={askModeInteractions}
        editModeInteractions={editModeInteractions}
        completionInteractions={completionInteractions}
      />

      <div id={summarySection.id} className="scroll-mt-28">
        <UserSummaryChart
          key={userId}
          usedChat={usedChat}
          usedAgent={usedAgent}
          usedCli={usedCli}
          usedCopilotApp={userSummary.used_copilot_app}
          usedCodingAgent={usedCodingAgent}
          usedCodeReview={usedCodeReview}
          usedAutoMode={usedAutoMode}
          usedLocalByok={usedLocalByok}
          ideDistribution={ideDistribution}
          clientRequestDistribution={clientRequestDistribution}
          languageDistribution={languageDistribution}
          modelDistribution={modelDistribution}
          modelRequestDistribution={modelRequestDistribution}
        />
      </div>

      <div id={aiCreditsSection.id} className="scroll-mt-28">
        <AiCreditsChart
          data={dailyAiCreditsData}
          reportStartDay={userDetails.reportStartDay}
          reportEndDay={userDetails.reportEndDay}
          description="AI credits consumed by this user each day during the reporting period"
          showUsers={false}
        />
      </div>

      <UserDetailsCustomizationsSection
        key={`${customizationsSection.id}-${userId}`}
        sectionId={customizationsSection.id}
        summaries={userDetails.cliCustomizations}
      />

      <div id={combinedImpactSection.id} className="scroll-mt-28">
        {hasCombinedImpactData ? (
          <ModeImpactChart
            data={filledCombinedImpact}
            title="Combined Copilot Impact"
            description="Daily lines of code added and deleted across Code Completion, Ask Mode, Agent Mode, Edit Mode, Inline Mode, Copilot App, and CLI activities."
          />
        ) : (
          <div className="bg-default border border-default rounded-md h-[400px] flex items-center justify-center p-6 overflow-auto">
            <div className="w-full max-w-md">
              <EmptyState
                icon={GraphIcon}
                heading="No Copilot impact data"
                description="No lines of code were added or deleted by Copilot for this user in the selected period. Make sure client-side telemetry is enabled in the IDE, CLI, and Copilot App this user works with, then check back after new activity."
                data-testid="combined-impact-empty-state"
              />
            </div>
          </div>
        )}
      </div>

      <UserDetailsImpactBreakdownSection
        sectionId={impactBreakdownSection.id}
        isExpanded={isImpactBreakdownExpanded}
        onToggle={() => setIsImpactBreakdownExpanded(!isImpactBreakdownExpanded)}
        agentImpact={filledAgentImpact}
        askModeImpact={filledAskModeImpact}
        completionImpact={filledCompletionImpact}
        copilotAppImpact={filledCopilotAppImpact}
        cliImpact={filledCliImpact}
      />

      <UserDetailsAgentUsageSection
        key={`${agentActivitySection.id}-${userId}`}
        sectionId={agentActivitySection.id}
        activity={userDetails.agentActivity}
        reportStartDay={userDetails.reportStartDay}
        reportEndDay={userDetails.reportEndDay}
      />

      {userDetails.thirdPartyAgentActivity?.agents.length ? (
        <div id={thirdPartyAgentActivitySection.id} className="scroll-mt-28">
          <ThirdPartyAgentActivityChart
            data={userDetails.thirdPartyAgentActivity}
            reportStartDay={userDetails.reportStartDay}
            reportEndDay={userDetails.reportEndDay}
          />
        </div>
      ) : null}

      {showCloudAgentsUsage && (
        <CloudAgentsUsageChart data={cloudAgentsUsageData} />
      )}

      {!hasDetailedActivity && (
        <EmptyState
          border
          icon={GraphIcon}
          heading="No detailed activity data"
          description="This user has no client, feature, language, or model activity in the selected report to break down."
          data-testid="user-details-empty-state"
        />
      )}

      {hasClientActivity && (
        <div id={clientActivitySection.id} className="scroll-mt-28">
          <ClientActivityChart
            key={userId}
            traffic={userDetails.clientTraffic}
            activity={presentationSummary.clientActivity}
            reportStartDay={userDetails.reportStartDay}
            reportEndDay={userDetails.reportEndDay}
            pluginVersions={userDetails.pluginVersions}
            cliVersions={userDetails.cliVersions}
          />
        </div>
      )}

      {featureAggregates.length > 0 && (
        <UserDetailsFeatureActivitySection
          sectionId={featureActivitySection.id}
          featureAggregates={featureAggregates}
        />
      )}

      {languageFeatureAggregates.length > 0 && (
        <div id={languageActivitySection.id} className="scroll-mt-28">
          <UserActivityByLanguageAndFeatureChart
            languageFeatureAggregates={languageFeatureAggregates}
            days={userDetails.days}
            reportStartDay={userDetails.reportStartDay}
            reportEndDay={userDetails.reportEndDay}
          />
        </div>
      )}

      {modelFeatureAggregates.length > 0 && (
        <div id={modelActivitySection.id} className="scroll-mt-28">
          <UserActivityByModelAndFeatureChart
            modelFeatureAggregates={modelFeatureAggregates}
            days={userDetails.days}
            reportStartDay={userDetails.reportStartDay}
            reportEndDay={userDetails.reportEndDay}
          />
        </div>
      )}

      <DayDetailsModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        date={modalState.selectedDate}
        dayMetrics={modalState.selectedMetrics}
        reportingQuality={selectDayReportingQuality(userDetails, modalState.selectedDate)}
        userLogin={userLogin}
        onNavigateDay={handleNavigateDay}
        canNavigatePrevDay={canNavigatePrevDay}
        canNavigateNextDay={canNavigateNextDay}
      />
    </ViewPanel>
  );
}

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { UserDayData } from '../../../types/metrics';
import type { UserDetailsViewModel } from '../../../read-models/userDetails';
import { formatIDEName } from '../../icons/IDEIcons';
import { formatAiAdoptionPhase, formatAiCreditCost, generateDateRange } from '../../../utils/formatters';
import { mapReportRangeData, padReportRangeWithDefaults } from '../../../utils/timeSeries';
import ClientActivityChart from './charts/ClientActivityChart';
import CloudAgentsUsageChart from './charts/CloudAgentsUsageChart';
import AiCreditsChart from '../../charts/AiCreditsChart';
import ModeImpactChart from '../../charts/ModeImpactChart';
import UserSummaryChart from './charts/UserSummaryChart';
import UserActivityByLanguageAndFeatureChart from './charts/UserActivityByLanguageAndFeatureChart';
import UserActivityByModelAndFeatureChart from './charts/UserActivityByModelAndFeatureChart';
import DayDetailsModal from './day-details/DayDetailsModal';
import UserDetailsCliUsageSection from './sections/UserDetailsCliUsageSection';
import UserDetailsFeatureActivitySection from './sections/UserDetailsFeatureActivitySection';
import UserDetailsHeader from './sections/UserDetailsHeader';
import UserDetailsImpactBreakdownSection from './sections/UserDetailsImpactBreakdownSection';
import UserDetailsOverviewSection from './sections/UserDetailsOverviewSection';
import { ViewPanel } from '../../ui';
import { VIEW_MODES } from '../../../types/navigation';
import { useNavigation } from '../../../state/NavigationContext';
import type { ModeImpactData } from '../../../domain/calculators/metricCalculators';
import type { DailyAiCreditsData } from '../../../domain/calculators/metricCalculators';
import { registerChartJS } from '../../charts/utils/chartSetup';
import { isActiveAutoModeFeature } from '../../../domain/autoMode';
import { getTotalUserInitiatedInteractionCount } from '../../../domain/assumedInteractions';
import { USER_DETAILS_SECTIONS } from './userDetailsSections';

registerChartJS();

interface UserDetailsViewProps {
  model: UserDetailsViewModel;
}

type UserDayWithCliTotals = UserDayData & {
  totals_by_cli: NonNullable<UserDayData['totals_by_cli']>;
};

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

function buildDailyCliSeries<T>(
  days: UserDayData[],
  startDay: string,
  endDay: string,
  buildItem: (date: string, cli: NonNullable<UserDayData['totals_by_cli']> | undefined) => T,
): T[] {
  return mapReportRangeData(
    days.filter((day): day is UserDayWithCliTotals => Boolean(day.totals_by_cli)),
    startDay,
    endDay,
    day => day.day,
    (date, day) => buildItem(date, day?.totals_by_cli),
  );
}

export default function UserDetailsView({ model }: UserDetailsViewProps) {
  const { userDetails, userSummary, userLogin, userId } = model;
  const { navigateTo } = useNavigation();
  const filledCombinedImpact = useMemo(() => fillDateRange(userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledAgentImpact = useMemo(() => fillDateRange(userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledAskModeImpact = useMemo(() => fillDateRange(userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCompletionImpact = useMemo(() => fillDateRange(userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCliImpact = useMemo(() => fillDateRange(userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    selectedDate: string;
    selectedMetrics?: UserDayData;
  }>({
    isOpen: false,
    selectedDate: '',
    selectedMetrics: undefined,
  });

  const [isImpactBreakdownExpanded, setIsImpactBreakdownExpanded] = useState(false);

  const handleDayClick = (date: string, dayData?: UserDayData) => {
    setModalState({
      isOpen: true,
      selectedDate: date,
      selectedMetrics: dayData,
    });
  };

  const handleCloseModal = () => {
    setModalState({
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

  const totalCliPrompts = userDetails.days.reduce((sum, day) => sum + (day.totals_by_cli?.prompt_count ?? 0), 0);
  const daysActive = userSummary.days_active;
  const aiCreditsUsed = userDetails.total_ai_credits_used;
  const aiAdoptionPhaseLabel = formatAiAdoptionPhase(userSummary.ai_adoption_phase);
  const usedAgent = userSummary.used_agent;
  const usedChat = userSummary.used_chat;
  const usedCli = userSummary.used_cli;
  const usedCodingAgent = userSummary.used_copilot_coding_agent;
  const usedCodeReviewActive = userSummary.used_copilot_code_review_active;
  const usedCodeReviewPassive = userSummary.used_copilot_code_review_passive;
  const usedCodeReview = usedCodeReviewActive || usedCodeReviewPassive;

  const { featureAggregates, ideAggregates, languageFeatureAggregates, modelFeatureAggregates } = userDetails;
  const usedAutoMode = userSummary.used_auto_mode ?? modelFeatureAggregates.some(isActiveAutoModeFeature);

  const agentInteractions = featureAggregates
    .filter(f => f.feature === 'chat_panel_agent_mode')
    .reduce((sum, f) => sum + f.user_initiated_interaction_count, 0);
  const planInteractions = featureAggregates
    .filter(f => f.feature === 'chat_panel_plan_mode')
    .reduce((sum, f) => sum + f.user_initiated_interaction_count, 0);
  const askModeInteractions = featureAggregates
    .filter(f => f.feature === 'chat_panel_ask_mode')
    .reduce((sum, f) => sum + f.user_initiated_interaction_count, 0);
  const editModeInteractions = featureAggregates
    .filter(f => f.feature === 'chat_panel_edit_mode')
    .reduce((sum, f) => sum + f.user_initiated_interaction_count, 0);
  const completionInteractions = featureAggregates
    .filter(f => f.feature === 'code_completion')
    .reduce((sum, f) => sum + getTotalUserInitiatedInteractionCount(f), 0);
  const cliInteractions = totalCliPrompts;

  const ideChartData = useMemo(() => {
    const labels = ideAggregates.map(ide => formatIDEName(ide.ide));
    const data = ideAggregates.map(getTotalUserInitiatedInteractionCount);

    if (totalCliPrompts > 0) {
      labels.push('Copilot CLI');
      data.push(totalCliPrompts);
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316',
          '#6E40C9', '#06B6D4', '#84CC16', '#EC4899',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      }]
    };
  }, [ideAggregates, totalCliPrompts]);

  const { languageGenerations, languageChartData } = useMemo(() => {
    const generations = languageFeatureAggregates.reduce((acc, item) => {
      if (item.language && item.language !== '' && item.language !== 'unknown') {
        acc[item.language] = (acc[item.language] || 0) + item.code_generation_activity_count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      languageGenerations: generations,
      languageChartData: {
        labels: Object.keys(generations),
        datasets: [{
          data: Object.values(generations),
          backgroundColor: [
            '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#8B5CF6', '#10B981', '#F97316', '#EF4444',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        }]
      }
    };
  }, [languageFeatureAggregates]);

  const { modelInteractions, modelChartData } = useMemo(() => {
    const interactions = modelFeatureAggregates.reduce((acc, item) => {
      if (item.model && item.model !== '') {
        acc[item.model] = (acc[item.model] || 0) + getTotalUserInitiatedInteractionCount(item);
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      modelInteractions: interactions,
      modelChartData: {
        labels: Object.keys(interactions),
        datasets: [{
          data: Object.values(interactions),
          backgroundColor: [
            '#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        }]
      }
    };
  }, [modelFeatureAggregates]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { label: string; parsed: number; dataset: { data: number[] } }) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const dailyCliTokenData = useMemo(
    () => buildDailyCliSeries(userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay, (date, cli) => ({
      date,
      outputTokens: cli?.token_usage.output_tokens_sum ?? 0,
      promptTokens: cli?.token_usage.prompt_tokens_sum ?? 0,
      requestCount: cli?.request_count ?? 0,
    })),
    [userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay],
  );

  const dailyCliSessionData = useMemo(
    () => buildDailyCliSeries(userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay, (date, cli) => ({
      date,
      sessionCount: cli?.session_count ?? 0,
      requestCount: cli?.request_count ?? 0,
      promptCount: cli?.prompt_count ?? 0,
      uniqueUsers: cli ? 1 : 0,
    })),
    [userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay],
  );

  const hasCliActivity = userDetails.days.some(d => d.totals_by_cli);

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

  const showCloudAgentsUsage = usedCodingAgent || usedCodeReview;
  const dailyAiCreditsData = useMemo<DailyAiCreditsData[]>(() => {
    const creditsByDay = new Map<string, number>();
    for (const day of userDetails.days) {
      creditsByDay.set(day.day, (creditsByDay.get(day.day) ?? 0) + day.ai_credits_used);
    }

    return Array.from(creditsByDay.entries())
      .map(([date, aiCreditsUsed]) => ({
        date,
        aiCreditsUsed,
        users: aiCreditsUsed > 0 ? 1 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [userDetails.days]);
  const [
    overviewSection,
    aiCreditsSection,
    combinedImpactSection,
    impactBreakdownSection,
    summarySection,
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
          aiAdoptionPhaseLabel={aiAdoptionPhaseLabel}
          aiCreditCost={formatAiCreditCost(aiCreditsUsed)}
          onBackToUsers={() => navigateTo(VIEW_MODES.USERS)}
          onCopyUserLogin={handleCopyUserLogin}
        />
      )}
      contentClassName="space-y-8"
    >
      <UserDetailsOverviewSection
        sectionId={overviewSection.id}
        days={userDetails.days}
        reportStartDay={userDetails.reportStartDay}
        reportEndDay={userDetails.reportEndDay}
        daysActive={daysActive}
        onDayClick={handleDayClick}
        agentInteractions={agentInteractions}
        planInteractions={planInteractions}
        cliInteractions={cliInteractions}
        askModeInteractions={askModeInteractions}
        editModeInteractions={editModeInteractions}
        completionInteractions={completionInteractions}
      />

      <div id={aiCreditsSection.id} className="scroll-mt-28">
        <AiCreditsChart
          data={dailyAiCreditsData}
          reportStartDay={userDetails.reportStartDay}
          reportEndDay={userDetails.reportEndDay}
          description="AI credits consumed by this user each day during the reporting period"
          showUsers={false}
        />
      </div>

      <div id={combinedImpactSection.id} className="scroll-mt-28">
        <ModeImpactChart
          data={filledCombinedImpact}
          title="Combined Copilot Impact"
          description="Daily lines of code added and deleted across Code Completion, Ask Mode, Agent Mode, Edit Mode, and Inline Mode activities."
          emptyStateMessage="No combined impact data available."
        />
      </div>

      <UserDetailsImpactBreakdownSection
        sectionId={impactBreakdownSection.id}
        isExpanded={isImpactBreakdownExpanded}
        onToggle={() => setIsImpactBreakdownExpanded(!isImpactBreakdownExpanded)}
        agentImpact={filledAgentImpact}
        askModeImpact={filledAskModeImpact}
        completionImpact={filledCompletionImpact}
        cliImpact={filledCliImpact}
      />

      {hasCliActivity && (
        <UserDetailsCliUsageSection
          tokenData={dailyCliTokenData}
          sessionData={dailyCliSessionData}
        />
      )}

      <div id={summarySection.id} className="scroll-mt-28">
        <UserSummaryChart
          usedChat={usedChat}
          usedAgent={usedAgent}
          usedCli={usedCli}
          usedCodingAgent={usedCodingAgent}
          usedCodeReview={usedCodeReview}
          usedAutoMode={usedAutoMode}
          ideChartData={ideAggregates.length > 0 || totalCliPrompts > 0 ? ideChartData : undefined}
          languageChartData={Object.keys(languageGenerations).length > 0 ? languageChartData : undefined}
          modelChartData={Object.keys(modelInteractions).length > 0 ? modelChartData : undefined}
          chartOptions={chartOptions}
        />
      </div>

      {showCloudAgentsUsage && (
        <CloudAgentsUsageChart data={cloudAgentsUsageData} />
      )}

      <div id={clientActivitySection.id} className="scroll-mt-28">
        <ClientActivityChart
          ideAggregates={ideAggregates}
          days={userDetails.days}
          reportStartDay={userDetails.reportStartDay}
          reportEndDay={userDetails.reportEndDay}
          pluginVersions={userDetails.pluginVersions}
          cliVersions={userDetails.cliVersions}
        />
      </div>

      <UserDetailsFeatureActivitySection
        sectionId={featureActivitySection.id}
        featureAggregates={featureAggregates}
      />

      <div id={languageActivitySection.id} className="scroll-mt-28">
        <UserActivityByLanguageAndFeatureChart
          languageFeatureAggregates={languageFeatureAggregates}
          days={userDetails.days}
          reportStartDay={userDetails.reportStartDay}
          reportEndDay={userDetails.reportEndDay}
        />
      </div>

      <div id={modelActivitySection.id} className="scroll-mt-28">
        <UserActivityByModelAndFeatureChart
          modelFeatureAggregates={modelFeatureAggregates}
          days={userDetails.days}
          reportStartDay={userDetails.reportStartDay}
          reportEndDay={userDetails.reportEndDay}
        />
      </div>

      <DayDetailsModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        date={modalState.selectedDate}
        dayMetrics={modalState.selectedMetrics}
        userLogin={userLogin}
        onNavigateDay={handleNavigateDay}
        canNavigatePrevDay={canNavigatePrevDay}
        canNavigateNextDay={canNavigateNextDay}
      />
    </ViewPanel>
  );
}

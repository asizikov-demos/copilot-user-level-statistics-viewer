'use client';

import React, { useState, useMemo } from 'react';
import type { UserSummary, UserDayData } from '../types/metrics';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import { translateFeature } from '../domain/featureTranslations';
import { formatIDEName } from './icons/IDEIcons';
import { formatShortDate, generateDateRange } from '../utils/formatters';
import ClientActivityChart from './charts/ClientActivityChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import FeatureAdoptionRadarChart from './charts/FeatureAdoptionRadarChart';
import ModeImpactChart from './charts/ModeImpactChart';
import PRUModelUsageChart from './charts/PRUModelUsageChart';
import UserSummaryChart from './charts/UserSummaryChart';
import UserActivityByLanguageAndFeatureChart from './charts/UserActivityByLanguageAndFeatureChart';
import UserActivityByModelAndFeatureChart from './charts/UserActivityByModelAndFeatureChart';
import ActivityCalendar from './ui/ActivityCalendar';
import DayDetailsModal from './ui/DayDetailsModal';
import { DashboardStatsCardGroup, ViewPanel } from './ui';
import { VIEW_MODES } from '../types/navigation';
import { useNavigation } from '../state/NavigationContext';
import type { ModeImpactData, DailyModelUsageData } from '../domain/calculators/metricCalculators';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './charts/utils/chartSetup';

registerChartJS();

function fillModelUsage(data: DailyModelUsageData[], startDay: string, endDay: string): DailyModelUsageData[] {
  const dataMap = new Map(data.map(d => [d.date, d]));
  return generateDateRange(startDay, endDay).map(date =>
    dataMap.get(date) ?? { date, pruModels: 0, standardModels: 0, unknownModels: 0, totalPRUs: 0, serviceValue: 0 }
  );
}

interface UserDetailsViewProps {
  userDetails: UserDetailedMetrics;
  userSummary: UserSummary;
  userLogin: string;
  userId: number;
}

function fillDateRange(data: ModeImpactData[], startDay: string, endDay: string): ModeImpactData[] {
  if (data.length === 0) return [];
  const dataMap = new Map(data.map(d => [d.date, d]));
  const start = new Date(startDay + 'T00:00:00Z');
  const end = new Date(endDay + 'T00:00:00Z');
  const result: ModeImpactData[] = [];
  for (const cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
    const date = cur.toISOString().split('T')[0];
    result.push(dataMap.get(date) ?? {
      date,
      locAdded: 0,
      locDeleted: 0,
      netChange: 0,
      userCount: 0,
      totalUniqueUsers: data[0]?.totalUniqueUsers ?? 0,
    });
  }
  return result;
}

function buildDailyCliSeries<T>(
  days: UserDayData[],
  startDay: string,
  endDay: string,
  buildItem: (date: string, cli: NonNullable<UserDayData['totals_by_cli']> | undefined) => T,
): T[] {
  const cliMap = new Map<string, NonNullable<UserDayData['totals_by_cli']>>(
    days
      .filter(d => d.totals_by_cli)
      .map(d => [d.day, d.totals_by_cli as NonNullable<UserDayData['totals_by_cli']>]),
  );
  const start = new Date(startDay + 'T00:00:00Z');
  const end = new Date(endDay + 'T00:00:00Z');
  const result: T[] = [];
  for (const cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
    const date = cur.toISOString().split('T')[0];
    result.push(buildItem(date, cliMap.get(date)));
  }
  return result;
}

export default function UserDetailsView({ userDetails, userSummary, userLogin, userId }: UserDetailsViewProps) {
  const { navigateTo } = useNavigation();
  const filledCombinedImpact = useMemo(() => fillDateRange(userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCombinedImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledAgentImpact = useMemo(() => fillDateRange(userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAgentImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledAskModeImpact = useMemo(() => fillDateRange(userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyAskModeImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCompletionImpact = useMemo(() => fillDateRange(userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCompletionImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledCliImpact = useMemo(() => fillDateRange(userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyCliImpact, userDetails.reportStartDay, userDetails.reportEndDay]);
  const filledModelUsage = useMemo(() => fillModelUsage(userDetails.dailyModelUsage, userDetails.reportStartDay, userDetails.reportEndDay), [userDetails.dailyModelUsage, userDetails.reportStartDay, userDetails.reportEndDay]);

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
  const totalStandardModelRequests = userDetails.totalStandardModelRequests;
  const totalPremiumModelRequests = userDetails.totalPremiumModelRequests;
  const daysActive = userSummary.days_active;
  const usedAgent = userSummary.used_agent;
  const usedChat = userSummary.used_chat;
  const usedCli = userSummary.used_cli;
  const usedCodingAgent = userSummary.used_copilot_coding_agent;

  const { featureAggregates, ideAggregates, languageFeatureAggregates, modelFeatureAggregates } = userDetails;
  const usedAutoMode = userSummary.used_auto_mode ?? modelFeatureAggregates.some(item => {
    const activityCount =
      item.user_initiated_interaction_count +
      item.code_generation_activity_count +
      item.code_acceptance_activity_count;

    return item.model.trim().toLowerCase() === 'auto' && activityCount > 0;
  });

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
    .reduce((sum, f) => sum + f.code_acceptance_activity_count, 0);
  const cliInteractions = totalCliPrompts;

  const ideChartData = useMemo(() => {
    const labels = ideAggregates.map(ide => formatIDEName(ide.ide));
    const data = ideAggregates.map(ide => ide.user_initiated_interaction_count);

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
        acc[item.model] = (acc[item.model] || 0) + item.user_initiated_interaction_count;
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

  const languageBarChartData = useMemo(() => {
    const allLanguages = Array.from(
      new Set(userDetails.days.flatMap(day => day.totals_by_language_feature.map(item => item.language)))
    ).filter(lang => lang && lang !== '' && lang !== 'unknown').sort();

    const allDays = generateDateRange(userDetails.reportStartDay, userDetails.reportEndDay);
    const dayMap = new Map(userDetails.days.map(d => [d.day, d]));

    const languageColors: Record<string, string> = {
      'javascript': '#F7DF1E',
      'typescript': '#3178C6',
      'python': '#3776AB',
      'java': '#ED8B00',
      'csharp': '#239120',
      'cpp': '#00599C',
      'c': '#A8B9CC',
      'go': '#00ADD8',
      'rust': '#000000',
      'php': '#777BB4',
      'ruby': '#CC342D',
      'swift': '#FA7343',
      'kotlin': '#7F52FF',
      'scala': '#DC322F',
      'dart': '#0175C2',
      'html': '#E34F26',
      'css': '#1572B6',
      'scss': '#CF649A',
      'less': '#1D365D',
      'json': '#000000',
      'xml': '#0060AC',
      'yaml': '#CB171E',
      'markdown': '#083FA1',
      'shell': '#89E051',
      'bash': '#4EAA25',
      'powershell': '#5391FE',
      'sql': '#E38C00',
      'r': '#276DC3',
      'matlab': '#E16737',
      'perl': '#39457E',
      'lua': '#2C2D72',
      'haskell': '#5E5086',
      'elixir': '#6E4A7E',
      'erlang': '#B83998',
      'clojure': '#5881D8',
      'fsharp': '#378BBA',
      'ocaml': '#EC6813',
      'elm': '#60B5CC',
      'solidity': '#363636',
      'assembly': '#6E4C13',
    };

    const fallbackColors = [
      '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#8B5CF6', 
      '#10B981', '#F97316', '#EF4444', '#3B82F6', '#14B8A6'
    ];

    const datasets = allLanguages.map((language, index) => {
      const data = allDays.map(dayStr => {
        const dayData = dayMap.get(dayStr);
        const languageData = dayData?.totals_by_language_feature
          .filter(item => item.language === language)
          .reduce((sum, item) => sum + item.code_generation_activity_count, 0) || 0;
        return languageData;
      });

      return {
        label: language.charAt(0).toUpperCase() + language.slice(1),
        data: data,
        backgroundColor: languageColors[language.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderColor: languageColors[language.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0));

    return {
      labels: allDays.map(day => formatShortDate(day)),
      datasets: datasets,
    };
  }, [userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay]);

  const modelBarChartData = useMemo(() => {
    const allModels = Array.from(
      new Set(userDetails.days.flatMap(day => day.totals_by_model_feature.map(item => item.model)))
    ).filter(model => model && model !== '' && model !== 'unknown').sort();

    const allDays = generateDateRange(userDetails.reportStartDay, userDetails.reportEndDay);
    const dayMap = new Map(userDetails.days.map(d => [d.day, d]));

    const modelColors: Record<string, string> = {
      'gpt-4': '#10A37F',
      'gpt-4o': '#0066CC',
      'gpt-4-turbo': '#0052A3',
      'gpt-3.5': '#74AA9C',
      'gpt-3.5-turbo': '#5D8A7A',
      'gemini-pro': '#1A73E8',
    };

    const fallbackColors = [
      '#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#10B981', '#F97316', '#06B6D4', '#84CC16', '#EC4899'
    ];

    const datasets = allModels.map((model, index) => {
      const data = allDays.map(dayStr => {
        const dayData = dayMap.get(dayStr);
        const modelData = dayData?.totals_by_model_feature
          .filter(item => item.model === model)
          .reduce((sum, item) => sum + item.user_initiated_interaction_count, 0) || 0;
        return modelData;
      });

      return {
        label: model.charAt(0).toUpperCase() + model.slice(1),
        data: data,
        backgroundColor: modelColors[model.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderColor: modelColors[model.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0));

    return {
      labels: allDays.map(day => formatShortDate(day)),
      datasets: datasets,
    };
  }, [userDetails.days, userDetails.reportStartDay, userDetails.reportEndDay]);

  const languageBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value.toLocaleString()} generations`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        },
        stacked: true,
      },
      y: {
        title: {
          display: true,
          text: 'Generations'
        },
        beginAtZero: true,
        stacked: true,
      }
    }
  };

  const modelBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value.toLocaleString()} interactions`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        },
        stacked: true,
      },
      y: {
        title: {
          display: true,
          text: 'Interactions'
        },
        beginAtZero: true,
        stacked: true,
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

  const hasFlags = userSummary.flags.length > 0;

  const summaryCards = [
    ...(hasFlags ? [{
      value: 'Requires Attention',
      label: userSummary.flags.map(f => f.label).join('; '),
      accent: 'orange' as const,
      tone: 'tint' as const,
      size: 'md' as const,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
    }] : []),
    {
      value: totalStandardModelRequests,
      label: 'Standard Model Requests',
      accent: 'amber' as const,
    },
    {
      value: totalPremiumModelRequests,
      label: 'Premium Model Requests',
      accent: 'rose' as const,
    },
    {
      value: daysActive,
      label: 'Days Active',
      accent: 'indigo' as const,
    },
  ];


  return (
    <ViewPanel
      header={(
        <div>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => navigateTo(VIEW_MODES.USERS)}
                  className="text-2xl font-semibold tracking-tight text-[#0969da] hover:underline focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                >
                  users
                </button>
              </li>
              <li aria-hidden="true" className="text-2xl font-semibold tracking-tight text-[#8c959f]">/</li>
              <li aria-current="page">
                <button
                  type="button"
                  onClick={handleCopyUserLogin}
                  title="Click to copy username"
                  aria-label={`Copy username ${userLogin}`}
                  className="group inline-flex items-center gap-2 rounded-sm text-2xl font-semibold tracking-tight text-[#1f2328] transition-colors duration-150 hover:text-indigo-600 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <span>{userLogin}</span>
                  <svg
                    className="h-5 w-5 text-[#636c76] transition-colors duration-150 group-hover:text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                </button>
              </li>
            </ol>
          </nav>
          <p className="mt-1 text-sm text-gray-600">User ID: {userId}</p>
        </div>
      )}
      contentClassName="space-y-8"
    >
      {/* Summary Stats */}
      <DashboardStatsCardGroup
        className="mb-6"
        columns={{ base: 1, md: hasFlags ? 4 : 3 }}
        gapClassName="gap-4"
        items={summaryCards}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityCalendar days={userDetails.days} reportStartDay={userDetails.reportStartDay} reportEndDay={userDetails.reportEndDay} onDayClick={handleDayClick} />
        </div>
        <div className="lg:col-span-1">
          <FeatureAdoptionRadarChart
            agentInteractions={agentInteractions}
            planInteractions={planInteractions}
            cliInteractions={cliInteractions}
            askModeInteractions={askModeInteractions}
            editModeInteractions={editModeInteractions}
            completionInteractions={completionInteractions}
          />
        </div>
      </div>

      <ModeImpactChart
        data={filledCombinedImpact}
        title="Combined Copilot Impact"
        description="Daily lines of code added and deleted across Code Completion, Ask Mode, Agent Mode, Edit Mode, and Inline Mode activities."
        emptyStateMessage="No combined impact data available."
      />

      {/* Copilot CLI Usage */}
      {hasCliActivity && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Copilot CLI Usage</h3>
          <div className="space-y-8">
            <CLITokensChart data={dailyCliTokenData} />
            <CLISessionChart data={dailyCliSessionData} />
          </div>
        </div>
      )}

      {/* Impact Breakdown Section */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Impact Breakdown</h3>
            <p className="text-sm text-gray-600 mt-1">View detailed impact by mode</p>
          </div>
          <button
            onClick={() => setIsImpactBreakdownExpanded(!isImpactBreakdownExpanded)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            {isImpactBreakdownExpanded ? 'Hide Breakdown' : 'Show Breakdown'}
          </button>
        </div>
        
        {isImpactBreakdownExpanded && (
          <div className="space-y-8 mt-6">
            <ModeImpactChart
              data={filledAgentImpact}
              title="Copilot Agent Mode Impact"
              description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
              emptyStateMessage="No agent mode impact data available."
            />
            <ModeImpactChart
              data={filledAskModeImpact}
              title="Ask Mode Impact"
              description="Daily lines of code added and deleted through Copilot Chat Ask Mode sessions."
              emptyStateMessage="No Ask Mode impact data available."
            />
            <ModeImpactChart
              data={filledCompletionImpact}
              title="Completions Impact"
              description="Daily lines of code added and deleted when developers accept Copilot code completions."
              emptyStateMessage="No code completion impact data available."
            />
            <ModeImpactChart
              data={filledCliImpact}
              title="CLI Impact"
              description="Daily lines of code added and deleted through Copilot CLI sessions."
              emptyStateMessage="No CLI impact data available."
            />
          </div>
        )}
      </div>
      
      <UserSummaryChart
        usedChat={usedChat}
        usedAgent={usedAgent}
        usedCli={usedCli}
        usedCodingAgent={usedCodingAgent}
        usedAutoMode={usedAutoMode}
        ideChartData={ideAggregates.length > 0 || totalCliPrompts > 0 ? ideChartData : undefined}
        languageChartData={Object.keys(languageGenerations).length > 0 ? languageChartData : undefined}
        modelChartData={Object.keys(modelInteractions).length > 0 ? modelChartData : undefined}
        chartOptions={chartOptions}
      />

      <ClientActivityChart
        ideAggregates={ideAggregates}
        days={userDetails.days}
        reportStartDay={userDetails.reportStartDay}
        reportEndDay={userDetails.reportEndDay}
        pluginVersions={userDetails.pluginVersions}
        cliVersions={userDetails.cliVersions}
        />

      {/* Totals by Feature */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h3>
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Add</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Delete</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {featureAggregates.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(feature.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.loc_added_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.loc_deleted_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.loc_suggested_to_add_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{feature.loc_suggested_to_delete_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserActivityByLanguageAndFeatureChart
        languageFeatureAggregates={languageFeatureAggregates}
        languageBarChartData={languageBarChartData}
        languageBarChartOptions={languageBarChartOptions}
        />

      <PRUModelUsageChart data={filledModelUsage} />

      <UserActivityByModelAndFeatureChart
        modelFeatureAggregates={modelFeatureAggregates}
        modelBarChartData={modelBarChartData}
        modelBarChartOptions={modelBarChartOptions}
      />

      <DayDetailsModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        date={modalState.selectedDate}
        dayMetrics={modalState.selectedMetrics}
        userLogin={userLogin}
      />
    </ViewPanel>
  );
}

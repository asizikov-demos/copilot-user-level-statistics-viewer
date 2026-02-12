'use client';

import React, { useState, useMemo } from 'react';
import type { UserSummary, UserDayData } from '../types/metrics';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import { translateFeature } from '../domain/featureTranslations';
import { formatIDEName } from './icons/IDEIcons';
import IDEActivityChart from './charts/IDEActivityChart';
import ModeImpactChart from './charts/ModeImpactChart';
import PRUCostAnalysisChart from './charts/PRUCostAnalysisChart';
import PRUModelUsageChart from './charts/PRUModelUsageChart';
import UserSummaryChart from './charts/UserSummaryChart';
import UserActivityByLanguageAndFeatureChart from './charts/UserActivityByLanguageAndFeatureChart';
import UserActivityByModelAndFeatureChart from './charts/UserActivityByModelAndFeatureChart';
import ActivityCalendar from './ui/ActivityCalendar';
import DayDetailsModal from './ui/DayDetailsModal';
import { DashboardStatsCardGroup, ViewPanel } from './ui';
import type { VoidCallback } from '../types/events';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler, TooltipItem } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

interface UserDetailsViewProps {
  userDetails: UserDetailedMetrics;
  userSummary: UserSummary;
  userLogin: string;
  userId: number;
  onBack: VoidCallback;
}

export default function UserDetailsView({ userDetails, userSummary, userLogin, userId, onBack }: UserDetailsViewProps) {
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

  const totalInteractions = userSummary.total_user_initiated_interactions;
  const totalGeneration = userSummary.total_code_generation_activities;
  const totalAcceptance = userSummary.total_code_acceptance_activities;
  const totalStandardModelRequests = userDetails.totalStandardModelRequests;
  const totalPremiumModelRequests = userDetails.totalPremiumModelRequests;
  const daysActive = userSummary.days_active;
  const usedAgent = userSummary.used_agent;
  const usedChat = userSummary.used_chat;
  const usedCli = userSummary.used_cli;

  const { featureAggregates, ideAggregates, languageFeatureAggregates, modelFeatureAggregates } = userDetails;

  const ideChartData = useMemo(() => ({
    labels: ideAggregates.map(ide => formatIDEName(ide.ide)),
    datasets: [{
      data: ideAggregates.map(ide => ide.user_initiated_interaction_count),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316',
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  }), [ideAggregates]);

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

    const allDays = userDetails.days.map(d => d.day).sort();
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
      labels: allDays.map(day => new Date(day).toLocaleDateString()),
      datasets: datasets,
    };
  }, [userDetails.days]);

  const modelBarChartData = useMemo(() => {
    const allModels = Array.from(
      new Set(userDetails.days.flatMap(day => day.totals_by_model_feature.map(item => item.model)))
    ).filter(model => model && model !== '' && model !== 'unknown').sort();

    const allDays = userDetails.days.map(d => d.day).sort();
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
      labels: allDays.map(day => new Date(day).toLocaleDateString()),
      datasets: datasets,
    };
  }, [userDetails.days]);

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
  const summaryCards = [
    {
      value: totalInteractions,
      label: 'Total Interactions',
      accent: 'blue' as const,
    },
    {
      value: totalGeneration,
      label: 'Code Generation',
      accent: 'green' as const,
    },
    {
      value: totalAcceptance,
      label: 'Code Acceptance',
      accent: 'purple' as const,
    },
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
      headerProps={{
        title: userLogin,
        description: <p className="text-gray-600">User ID: {userId}</p>,
        onBack,
        titleClassName: 'text-2xl font-bold text-gray-900',
        backButtonLabel: '← Back to Users',
      }}
      contentClassName="space-y-8"
    >
      {/* Summary Stats */}
      <DashboardStatsCardGroup
        className="mb-6"
        columns={{ base: 2, md: 6 }}
        gapClassName="gap-4"
        items={summaryCards}
      />

      <ModeImpactChart
        data={userDetails.dailyCombinedImpact}
        title="Combined Copilot Impact"
        description="Daily lines of code added and deleted across Code Completion, Ask Mode, Agent Mode, Edit Mode, and Inline Mode activities."
        emptyStateMessage="No combined impact data available."
      />

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
              data={userDetails.dailyAgentImpact}
              title="Copilot Agent Mode Impact"
              description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
              emptyStateMessage="No agent mode impact data available."
            />
            <ModeImpactChart
              data={userDetails.dailyAskModeImpact}
              title="Ask Mode Impact"
              description="Daily lines of code added and deleted through Copilot Chat Ask Mode sessions."
              emptyStateMessage="No Ask Mode impact data available."
            />
            <ModeImpactChart
              data={userDetails.dailyCompletionImpact}
              title="Completions Impact"
              description="Daily lines of code added and deleted when developers accept Copilot code completions."
              emptyStateMessage="No code completion impact data available."
            />
            <ModeImpactChart
              data={userDetails.dailyCliImpact}
              title="CLI Impact"
              description="Daily lines of code added and deleted through Copilot CLI sessions."
              emptyStateMessage="No CLI impact data available."
            />
          </div>
        )}
      </div>
      
      <ActivityCalendar days={userDetails.days} reportStartDay={userDetails.reportStartDay} reportEndDay={userDetails.reportEndDay} onDayClick={handleDayClick} />

      <UserSummaryChart
        usedChat={usedChat}
        usedAgent={usedAgent}
        usedCli={usedCli}
        ideChartData={ideAggregates.length > 0 ? ideChartData : undefined}
        languageChartData={Object.keys(languageGenerations).length > 0 ? languageChartData : undefined}
        modelChartData={Object.keys(modelInteractions).length > 0 ? modelChartData : undefined}
        chartOptions={chartOptions}
      />

      <IDEActivityChart
        ideAggregates={ideAggregates}
        days={userDetails.days}
        pluginVersions={userDetails.pluginVersions}
        />

      {/* Totals by Feature */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h3>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Add</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Delete</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {featureAggregates.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(feature.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.loc_added_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.loc_deleted_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.loc_suggested_to_add_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.loc_suggested_to_delete_sum.toLocaleString()}</td>
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

      <PRUCostAnalysisChart data={userDetails.dailyPRUAnalysis} />

      <PRUModelUsageChart data={userDetails.dailyModelUsage} />

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

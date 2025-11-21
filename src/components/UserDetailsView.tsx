'use client';

import React, { useState } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { translateFeature } from '../utils/featureTranslations';
import { formatIDEName } from '../utils/ideIcons';
import IDEActivityChart from './charts/IDEActivityChart';
import ModeImpactChart from './charts/ModeImpactChart';
import PRUCostAnalysisChart from './charts/PRUCostAnalysisChart';
import { calculateDailyPRUAnalysis, calculateJoinedImpactData } from '../utils/metricsParser';
import { SERVICE_VALUE_RATE, getModelMultiplier } from '../domain/modelConfig';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler, TooltipItem } from 'chart.js';
import PRUModelUsageChart from './charts/PRUModelUsageChart';
import UserSummaryChart from './charts/UserSummaryChart';
import UserActivityByLanguageAndFeatureChart from './charts/UserActivityByLanguageAndFeatureChart';
import UserActivityByModelAndFeatureChart from './charts/UserActivityByModelAndFeatureChart';
import SectionHeader from './ui/SectionHeader';
import DashboardStatsCard from './ui/DashboardStatsCard';
import ActivityCalendar from './ui/ActivityCalendar';
import DayDetailsModal from './ui/DayDetailsModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

interface UserDetailsViewProps {
  userMetrics: CopilotMetrics[];
  userLogin: string;
  userId: number;
  onBack: () => void;
}

export default function UserDetailsView({ userMetrics, userLogin, userId, onBack }: UserDetailsViewProps) {
  // State for day details modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    selectedDate: string;
    selectedMetrics?: CopilotMetrics;
  }>({
    isOpen: false,
    selectedDate: '',
    selectedMetrics: undefined,
  });

  const handleDayClick = (date: string, dayMetrics?: CopilotMetrics) => {
    setModalState({
      isOpen: true,
      selectedDate: date,
      selectedMetrics: dayMetrics,
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      selectedDate: '',
      selectedMetrics: undefined,
    });
  };

  // Calculate aggregated stats for this user
  const totalInteractions = userMetrics.reduce((sum, metric) => sum + metric.user_initiated_interaction_count, 0);
  const totalGeneration = userMetrics.reduce((sum, metric) => sum + metric.code_generation_activity_count, 0);
  const totalAcceptance = userMetrics.reduce((sum, metric) => sum + metric.code_acceptance_activity_count, 0);
  const totalStandardModelRequests = userMetrics.reduce((sum, metric) => {
    return sum + metric.totals_by_model_feature
      .filter(modelFeature => {
        const model = modelFeature.model.toLowerCase();
        const multiplier = getModelMultiplier(model);
        return model !== 'unknown' && model !== '' && multiplier === 0;
      })
      .reduce((innerSum, modelFeature) => innerSum + modelFeature.user_initiated_interaction_count, 0);
  }, 0);

  const totalPremiumModelRequests = userMetrics.reduce((sum, metric) => {
    return sum + metric.totals_by_model_feature
      .filter(modelFeature => {
        const model = modelFeature.model.toLowerCase();
        const multiplier = getModelMultiplier(model);
        return model !== 'unknown' && model !== '' && multiplier > 0;
      })
      .reduce((innerSum, modelFeature) => innerSum + modelFeature.user_initiated_interaction_count, 0);
  }, 0);


  const daysActive = userMetrics.length;
  const usedAgent = userMetrics.some(metric => metric.used_agent);
  const usedChat = userMetrics.some(metric => metric.used_chat);

  // Get unique plugin versions ordered by date descending
  const uniquePluginVersions = userMetrics
    .flatMap(metric => metric.totals_by_ide)
    .filter(ide => ide.last_known_plugin_version)
    .map(ide => ide.last_known_plugin_version!)
    .reduce((acc, plugin) => {
      const key = `${plugin.plugin}-${plugin.plugin_version}`;
      const existing = acc.find(p => `${p.plugin}-${p.plugin_version}` === key);
      
      if (!existing) {
        acc.push(plugin);
      } else {
        // Keep the one with the latest date
        if (new Date(plugin.sampled_at).getTime() > new Date(existing.sampled_at).getTime()) {
          const index = acc.indexOf(existing);
          acc[index] = plugin;
        }
      }
      
      return acc;
    }, [] as NonNullable<typeof userMetrics[0]['totals_by_ide'][0]['last_known_plugin_version']>[])
    .sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime());

  // Aggregate totals by feature
  const featureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_feature)
    .reduce((acc, feature) => {
      const existing = acc.find(f => f.feature === feature.feature);
      if (existing) {
        existing.user_initiated_interaction_count += feature.user_initiated_interaction_count;
        existing.code_generation_activity_count += feature.code_generation_activity_count;
        existing.code_acceptance_activity_count += feature.code_acceptance_activity_count;
        existing.loc_added_sum += feature.loc_added_sum;
        existing.loc_deleted_sum += feature.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += feature.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += feature.loc_suggested_to_delete_sum;
      } else {
        acc.push({ ...feature });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_feature']);

  // Aggregate totals by IDE
  const ideAggregates = userMetrics
    .flatMap(metric => metric.totals_by_ide)
    .reduce((acc, ide) => {
      const existing = acc.find(i => i.ide === ide.ide);
      if (existing) {
        existing.user_initiated_interaction_count += ide.user_initiated_interaction_count;
        existing.code_generation_activity_count += ide.code_generation_activity_count;
        existing.code_acceptance_activity_count += ide.code_acceptance_activity_count;
        existing.loc_added_sum += ide.loc_added_sum;
        existing.loc_deleted_sum += ide.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += ide.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += ide.loc_suggested_to_delete_sum;
      } else {
        acc.push({ ...ide });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_ide']);

  // Aggregate totals by language and feature
  const languageFeatureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_language_feature)
    .reduce((acc, item) => {
      const key = `${item.language}-${item.feature}`;
      const existing = acc.find(i => `${i.language}-${i.feature}` === key);
      if (existing) {
        existing.code_generation_activity_count += item.code_generation_activity_count;
        existing.code_acceptance_activity_count += item.code_acceptance_activity_count;
        existing.loc_added_sum += item.loc_added_sum;
        existing.loc_deleted_sum += item.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += item.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += item.loc_suggested_to_delete_sum;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_language_feature']);

  // Aggregate totals by model and feature
  const modelFeatureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_model_feature)
    .reduce((acc, item) => {
      const key = `${item.model}-${item.feature}`;
      const existing = acc.find(i => `${i.model}-${i.feature}` === key);
      if (existing) {
        existing.user_initiated_interaction_count += item.user_initiated_interaction_count;
        existing.code_generation_activity_count += item.code_generation_activity_count;
        existing.code_acceptance_activity_count += item.code_acceptance_activity_count;
        existing.loc_added_sum += item.loc_added_sum;
        existing.loc_deleted_sum += item.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += item.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += item.loc_suggested_to_delete_sum;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_model_feature']);

  // Helper functions for new charts

  // Calculate daily model usage data for single user
  const calculateUserModelUsage = () => {
    return userMetrics.map(metric => {
      let pruModels = 0;
      let standardModels = 0;
      let unknownModels = 0;
      let totalPRUs = 0;

      for (const modelFeature of metric.totals_by_model_feature) {
        const model = modelFeature.model.toLowerCase();
        const interactions = modelFeature.user_initiated_interaction_count;
        const multiplier = getModelMultiplier(model);
        const prus = interactions * multiplier;

        totalPRUs += prus;

        if (model === 'unknown' || model === '') {
          unknownModels += interactions;
        } else if (multiplier === 0) {
          standardModels += interactions;
        } else {
          pruModels += interactions;
        }
      }

      return {
        date: metric.day,
        pruModels,
        standardModels,
        unknownModels,
        totalPRUs: Math.round(totalPRUs * 100) / 100,
  serviceValue: Math.round(totalPRUs * SERVICE_VALUE_RATE * 100) / 100
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const userPRUAnalysisData = calculateDailyPRUAnalysis(userMetrics);
  const userCombinedImpactData = calculateJoinedImpactData(userMetrics);
  const userModelUsageData = calculateUserModelUsage();

  // Prepare chart data
  // 1. IDEs chart data (based on interactions)
  const ideChartData = {
    labels: ideAggregates.map(ide => formatIDEName(ide.ide)),
    datasets: [{
      data: ideAggregates.map(ide => ide.user_initiated_interaction_count),
      backgroundColor: [
        '#3B82F6', // blue
        '#10B981', // green
        '#F59E0B', // yellow
        '#EF4444', // red
        '#8B5CF6', // purple
        '#F97316', // orange
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

  // 2. Programming Languages chart data (based on generations)
  const languageGenerations = languageFeatureAggregates.reduce((acc, item) => {
    if (item.language && item.language !== '' && item.language !== 'unknown') {
      acc[item.language] = (acc[item.language] || 0) + item.code_generation_activity_count;
    }
    return acc;
  }, {} as Record<string, number>);

  const languageChartData = {
    labels: Object.keys(languageGenerations),
    datasets: [{
      data: Object.values(languageGenerations),
      backgroundColor: [
        '#06B6D4', // cyan
        '#84CC16', // lime
        '#F59E0B', // amber
        '#EC4899', // pink
        '#8B5CF6', // violet
        '#10B981', // emerald
        '#F97316', // orange
        '#EF4444', // red
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

  // 3. Models chart data (based on interactions regardless of feature)
  const modelInteractions = modelFeatureAggregates.reduce((acc, item) => {
    if (item.model && item.model !== '') {
      acc[item.model] = (acc[item.model] || 0) + item.user_initiated_interaction_count;
    }
    return acc;
  }, {} as Record<string, number>);

  const modelChartData = {
    labels: Object.keys(modelInteractions),
    datasets: [{
      data: Object.values(modelInteractions),
      backgroundColor: [
        '#6366F1', // indigo
        '#14B8A6', // teal
        '#F59E0B', // amber
        '#EF4444', // red
        '#8B5CF6', // purple
        '#10B981', // green
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

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

  // Prepare bar chart data for IDE activity by day
  const createIDEBarChartData = () => {
    // Get all unique IDEs across all days
    const allIDEs = Array.from(
      new Set(
        userMetrics.flatMap(metric => 
          metric.totals_by_ide.map(ide => ide.ide)
        )
      )
    ).sort();

    // Get all days and sort them
    const allDays = userMetrics.map(metric => metric.day).sort();

    // Define colors for each IDE
    const ideColors: Record<string, string> = {
      'vscode': '#007ACC',
      'visual_studio': '#5C2D91',
      'jetbrains': '#FE315D',
      'vim': '#019733',
      'neovim': '#57A143',
      'emacs': '#7F5AB6',
      'eclipse': '#66595C',
      'sublime_text': '#FF9800',
      'xcode': '#1575F9',
      'intellij': '#FE315D',
    };

    // Create datasets for each IDE
    const datasets = allIDEs.map((ide, index) => {
      const data = allDays.map(day => {
        const dayMetric = userMetrics.find(m => m.day === day);
        const ideData = dayMetric?.totals_by_ide.find(i => i.ide === ide);
        return ideData?.user_initiated_interaction_count || 0;
      });

      const fallbackColors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
        '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#14B8A6'
      ];

      return {
        label: formatIDEName(ide),
        data: data,
        backgroundColor: ideColors[ide] || fallbackColors[index % fallbackColors.length],
        borderColor: ideColors[ide] || fallbackColors[index % fallbackColors.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0)); // Only include IDEs with data

    return {
      labels: allDays.map(day => new Date(day).toLocaleDateString()),
      datasets: datasets,
    };
  };

  const ideBarChartData = createIDEBarChartData();

  // Prepare bar chart data for language activity by day
  const createLanguageBarChartData = () => {
    // Get all unique languages across all days
    const allLanguages = Array.from(
      new Set(
        userMetrics.flatMap(metric => 
          metric.totals_by_language_feature.map(item => item.language)
        )
      )
    ).filter(lang => lang && lang !== '' && lang !== 'unknown').sort();

    // Get all days and sort them
    const allDays = userMetrics.map(metric => metric.day).sort();

    // Define colors for each language
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

    // Create datasets for each language
    const datasets = allLanguages.map((language, index) => {
      const data = allDays.map(day => {
        const dayMetric = userMetrics.find(m => m.day === day);
        const languageData = dayMetric?.totals_by_language_feature
          .filter(item => item.language === language)
          .reduce((sum, item) => sum + item.code_generation_activity_count, 0) || 0;
        return languageData;
      });

      const fallbackColors = [
        '#06B6D4', '#84CC16', '#F59E0B', '#EC4899', '#8B5CF6', 
        '#10B981', '#F97316', '#EF4444', '#3B82F6', '#14B8A6'
      ];

      return {
        label: language.charAt(0).toUpperCase() + language.slice(1),
        data: data,
        backgroundColor: languageColors[language.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderColor: languageColors[language.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0)); // Only include languages with data

    return {
      labels: allDays.map(day => new Date(day).toLocaleDateString()),
      datasets: datasets,
    };
  };

  const languageBarChartData = createLanguageBarChartData();

  // Prepare bar chart data for model activity by day
  const createModelBarChartData = () => {
    // Get all unique models across all days
    const allModels = Array.from(
      new Set(
        userMetrics.flatMap(metric => 
          metric.totals_by_model_feature.map(item => item.model)
        )
      )
    ).filter(model => model && model !== '' && model !== 'unknown').sort();

    // Get all days and sort them
    const allDays = userMetrics.map(metric => metric.day).sort();

    // Define colors for each model
    const modelColors: Record<string, string> = {
      'gpt-4': '#10A37F',
      'gpt-4o': '#0066CC',
      'gpt-4-turbo': '#0052A3',
      'gpt-3.5': '#74AA9C',
      'gpt-3.5-turbo': '#5D8A7A',
      'gemini-pro': '#1A73E8',
    };

    // Create datasets for each model
    const datasets = allModels.map((model, index) => {
      const data = allDays.map(day => {
        const dayMetric = userMetrics.find(m => m.day === day);
        const modelData = dayMetric?.totals_by_model_feature
          .filter(item => item.model === model)
          .reduce((sum, item) => sum + item.user_initiated_interaction_count, 0) || 0;
        return modelData;
      });

      const fallbackColors = [
        '#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', 
        '#10B981', '#F97316', '#06B6D4', '#84CC16', '#EC4899'
      ];

      return {
        label: model.charAt(0).toUpperCase() + model.slice(1),
        data: data,
        backgroundColor: modelColors[model.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderColor: modelColors[model.toLowerCase()] || fallbackColors[index % fallbackColors.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0)); // Only include models with data

    return {
      labels: allDays.map(day => new Date(day).toLocaleDateString()),
      datasets: datasets,
    };
  };

  const modelBarChartData = createModelBarChartData();

  const barChartOptions = {
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
        }
      },
      y: {
        title: {
          display: true,
          text: 'Interactions'
        },
        beginAtZero: true
      }
    }
  };

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



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SectionHeader
          title={userLogin}
          description={<p className="text-gray-600">User ID: {userId}</p>}
          onBack={onBack}
          titleClassName="text-2xl font-bold text-gray-900"
          backButtonLabel="← Back to Users"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <DashboardStatsCard
          value={totalInteractions}
          label="Total Interactions"
          accent="blue"
        />
        <DashboardStatsCard
          value={totalGeneration}
          label="Code Generation"
          accent="green"
        />
        <DashboardStatsCard
          value={totalAcceptance}
          label="Code Acceptance"
          accent="purple"
        />
        <DashboardStatsCard
          value={totalStandardModelRequests}
          label="Standard Model Requests"
          accent="amber"
        />
        <DashboardStatsCard
          value={totalPremiumModelRequests}
          label="Premium Model Requests"
          accent="rose"
        />
        <DashboardStatsCard
          value={daysActive}
          label="Days Active"
          accent="indigo"
        />
      </div>
      
      <ModeImpactChart
        data={userCombinedImpactData}
        title="Combined Copilot Impact"
        description="Daily lines of code added and deleted across Code Completion, Ask Mode, Agent Mode, Edit Mode, and Inline Mode activities."
        emptyStateMessage="No combined impact data available."
      />

      <ActivityCalendar userMetrics={userMetrics} onDayClick={handleDayClick} />

      <UserSummaryChart
        usedChat={usedChat}
        usedAgent={usedAgent}
        ideChartData={ideAggregates.length > 0 ? ideChartData : undefined}
        languageChartData={Object.keys(languageGenerations).length > 0 ? languageChartData : undefined}
        modelChartData={Object.keys(modelInteractions).length > 0 ? modelChartData : undefined}
        chartOptions={chartOptions}
      />

      {/* Totals by IDE */}
      <IDEActivityChart
        ideAggregates={ideAggregates}
        barChartData={ideBarChartData}
        barChartOptions={barChartOptions}
        pluginVersions={uniquePluginVersions}
      />

      {/* Totals by Feature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

      <PRUCostAnalysisChart data={userPRUAnalysisData} />

      <PRUModelUsageChart data={userModelUsageData} />

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
      />
    </div>
  );
}

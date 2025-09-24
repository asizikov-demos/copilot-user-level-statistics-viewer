'use client';

import React, { useState } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { translateFeature } from '../utils/featureTranslations';
import { getIDEIcon, formatIDEName } from '../utils/ideIcons';
import PRUCostAnalysisChart from './charts/PRUCostAnalysisChart';
import { calculateDailyPRUAnalysis } from '../utils/metricsParser';
import { MODEL_MULTIPLIERS, SERVICE_VALUE_RATE } from '../domain/modelConfig';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler, TooltipItem } from 'chart.js';
import { Pie, Bar, Chart } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

interface UserDetailsViewProps {
  userMetrics: CopilotMetrics[];
  userLogin: string;
  userId: number;
  onBack: () => void;
}

export default function UserDetailsView({ userMetrics, userLogin, userId, onBack }: UserDetailsViewProps) {
  // State for collapsible sections
  const [isLanguageTableExpanded, setIsLanguageTableExpanded] = useState(false);
  const [isModelTableExpanded, setIsModelTableExpanded] = useState(false);
  const [isPluginTableExpanded, setIsPluginTableExpanded] = useState(false);

  // State for chart view types
  const [pruModelChartType, setPruModelChartType] = useState<'area' | 'bar'>('area');
  const [agentHeatmapChartType, setAgentHeatmapChartType] = useState<'heatmap' | 'line' | 'bar'>('heatmap');

  // Calculate aggregated stats for this user
  const totalInteractions = userMetrics.reduce((sum, metric) => sum + metric.user_initiated_interaction_count, 0);
  const totalGeneration = userMetrics.reduce((sum, metric) => sum + metric.code_generation_activity_count, 0);
  const totalAcceptance = userMetrics.reduce((sum, metric) => sum + metric.code_acceptance_activity_count, 0);
  // New LOC totals (replacing legacy Generated/Accepted LOC)
  const totalLocAdded = userMetrics.reduce((sum, metric) => sum + metric.loc_added_sum, 0);
  const totalLocDeleted = userMetrics.reduce((sum, metric) => sum + metric.loc_deleted_sum, 0);
  const totalLocSuggestedToAdd = userMetrics.reduce((sum, metric) => sum + metric.loc_suggested_to_add_sum, 0);
  const totalLocSuggestedToDelete = userMetrics.reduce((sum, metric) => sum + metric.loc_suggested_to_delete_sum, 0);
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

  const getModelMultiplier = (modelName: string): number => {
    const normalizedModel = modelName.toLowerCase();
    if (MODEL_MULTIPLIERS[normalizedModel] !== undefined) {
      return MODEL_MULTIPLIERS[normalizedModel];
    }
    for (const [key, multiplier] of Object.entries(MODEL_MULTIPLIERS)) {
      if (normalizedModel.includes(key)) return multiplier;
    }
    return MODEL_MULTIPLIERS.unknown;
  };

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

  // Calculate agent mode heatmap data for single user
  const calculateUserAgentModeHeatmap = () => {
    const data = userMetrics.map(metric => {
      let agentModeRequests = 0;
      let unknownModeRequests = 0;
      let totalPRUs = 0;

      // Check for agent mode and unknown mode usage in features
      for (const feature of metric.totals_by_feature) {
        if (feature.feature === 'chat_panel_agent_mode' && feature.user_initiated_interaction_count > 0) {
          agentModeRequests += feature.user_initiated_interaction_count;
        }
        if (feature.feature === 'chat_panel_unknown_mode' && feature.user_initiated_interaction_count > 0) {
          unknownModeRequests += feature.user_initiated_interaction_count;
        }
      }

      // Calculate PRUs from agent mode interactions
      for (const modelFeature of metric.totals_by_model_feature) {
        if (modelFeature.feature === 'chat_panel_agent_mode') {
          const multiplier = getModelMultiplier(modelFeature.model);
          totalPRUs += modelFeature.user_initiated_interaction_count * multiplier;
        }
      }

      return {
        date: metric.day,
        agentModeRequests,
        unknownModeRequests,
        totalPRUs,
  serviceValue: Math.round(totalPRUs * SERVICE_VALUE_RATE * 100) / 100
      };
    });

    const allRequests = data.map(d => d.agentModeRequests + d.unknownModeRequests);
    const maxRequests = Math.max(...allRequests, 1);

    return data.map(d => ({
      date: d.date,
      agentModeRequests: d.agentModeRequests,
      unknownModeRequests: d.unknownModeRequests,
      uniqueUsers: (d.agentModeRequests + d.unknownModeRequests) > 0 ? 1 : 0, // For single user, it's either 0 or 1
      intensity: Math.ceil(((d.agentModeRequests + d.unknownModeRequests) / maxRequests) * 5),
      serviceValue: d.serviceValue
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const userPRUAnalysisData = calculateDailyPRUAnalysis(userMetrics);
  const userModelUsageData = calculateUserModelUsage();
  const userAgentHeatmapData = calculateUserAgentModeHeatmap();

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
      'atom': '#66595C',
      'sublime_text': '#FF9800',
      'xcode': '#1575F9',
      'android_studio': '#3DDC84',
      'intellij': '#FE315D',
      'pycharm': '#21D789',
      'webstorm': '#00CDD7',
      'phpstorm': '#B345F1',
      'rubymine': '#FE315D',
      'clion': '#21D789',
      'goland': '#00ADD8',
      'datagrip': '#9775FA',
      'rider': '#C21456',
      'appcode': '#1575F9',
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
      'claude-3': '#FF6B35',
      'claude-3-opus': '#E55934',
      'claude-3-sonnet': '#CC4125',
      'claude-3-haiku': '#B8301F',
      'claude-2': '#A02318',
      'gemini': '#4285F4',
      'gemini-pro': '#1A73E8',
      'codegen': '#8B5CF6',
      'codellama': '#F59E0B',
      'starcoder': '#EC4899',
      'copilot': '#24292e',
      'github-copilot': '#24292e',
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

  // Model Usage Chart functions
  const modelUsageChartData = {
    labels: userModelUsageData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Premium Models (PRU)',
        data: userModelUsageData.map(d => d.pruModels),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        fill: pruModelChartType === 'area',
        tension: 0.4
      },
      {
        label: 'Standard Models (GPT-4.1/4o)',
        data: userModelUsageData.map(d => d.standardModels),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        fill: pruModelChartType === 'area',
        tension: 0.4
      },
      {
        label: 'Unknown Models',
        data: userModelUsageData.map(d => d.unknownModels),
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
        fill: pruModelChartType === 'area',
        tension: 0.4
      }
    ]
  };

  const modelUsageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line' | 'bar'>) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            return `${datasetLabel}: ${value} requests`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Requests',
        },
        beginAtZero: true,
      },
    },
  };

  // Agent Heatmap Chart functions
  const getIntensityColor = (intensity: number) => {
    const colors = [
      'rgb(243, 244, 246)', // intensity 0 - very light gray
      'rgb(254, 202, 202)', // intensity 1 - very light red
      'rgb(252, 165, 165)', // intensity 2 - light red
      'rgb(248, 113, 113)', // intensity 3 - medium red
      'rgb(239, 68, 68)',   // intensity 4 - red
      'rgb(220, 38, 38)'    // intensity 5 - dark red
    ];
    return colors[Math.min(intensity, 5)];
  };

  const agentHeatmapChartData = agentHeatmapChartType === 'heatmap' ? {
    labels: userAgentHeatmapData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Agent Mode Requests',
        data: userAgentHeatmapData.map(d => d.agentModeRequests),
        backgroundColor: userAgentHeatmapData.map(d => getIntensityColor(d.intensity)),
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      },
      {
        label: 'Unknown Mode Requests',
        data: userAgentHeatmapData.map(d => d.unknownModeRequests),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 1
      }
    ]
  } : {
    labels: userAgentHeatmapData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Agent Mode Requests',
        data: userAgentHeatmapData.map(d => d.agentModeRequests),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Unknown Mode Requests',
        data: userAgentHeatmapData.map(d => d.unknownModeRequests),
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgb(107, 114, 128)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y'
      }
    ]
  };

  const agentHeatmapChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: agentHeatmapChartType === 'heatmap' ? {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Requests'
        },
        beginAtZero: true
      }
    } : {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Number of Requests'
        },
        beginAtZero: true
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Chat Panel Usage: Agent Mode vs Unknown Mode'
      },
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          afterBody: function(context: TooltipItem<'bar' | 'line'>[]) {
            const dataIndex = context[0].dataIndex;
            const dayData = userAgentHeatmapData[dataIndex];
            return [
              '',
              `Agent Mode Requests: ${dayData.agentModeRequests}`,
              `Unknown Mode Requests: ${dayData.unknownModeRequests}`,
              `Intensity Level: ${dayData.intensity}/5`,
              `Service Value: $${dayData.serviceValue}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{userLogin}</h2>
            <p className="text-gray-600">User ID: {userId}</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
          >
            ← Back to Users
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalInteractions.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Interactions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{totalGeneration.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Generation</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalAcceptance.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Acceptance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{totalLocAdded.toLocaleString()}</div>
          <div className="text-sm text-gray-600">LOC Added</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-rose-600">{totalLocDeleted.toLocaleString()}</div>
          <div className="text-sm text-gray-600">LOC Deleted</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalLocSuggestedToAdd.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Suggested Add</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{totalLocSuggestedToDelete.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Suggested Delete</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{daysActive}</div>
          <div className="text-sm text-gray-600">Days Active</div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Summary</h3>
        
        {/* Features Used */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Features Used</h4>
          <div className="flex flex-wrap gap-2">
            {usedChat && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Chat
              </span>
            )}
            {usedAgent && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Agent
              </span>
            )}
            {!usedChat && !usedAgent && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Completion Only
              </span>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* IDEs Chart */}
          {ideAggregates.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">IDEs (Interactions)</h4>
              <div className="h-48">
                <Pie data={ideChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Programming Languages Chart */}
          {Object.keys(languageGenerations).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">Languages (Generations)</h4>
              <div className="h-48">
                <Pie data={languageChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Models Chart */}
          {Object.keys(modelInteractions).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3 text-center">Models (Interactions)</h4>
              <div className="h-48">
                <Pie data={modelChartData} options={chartOptions} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plugin Versions */}
      {uniquePluginVersions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plugin Versions</h3>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plugin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(isPluginTableExpanded ? uniquePluginVersions : uniquePluginVersions.slice(0, 1)).map((plugin, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plugin.plugin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plugin.plugin_version}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(plugin.sampled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {uniquePluginVersions.length > 1 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsPluginTableExpanded(!isPluginTableExpanded)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
              >
                {isPluginTableExpanded ? 'Show Less' : `Show All ${uniquePluginVersions.length} Plugin Versions`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Totals by IDE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by IDE</h3>
        
        {/* Bar Chart */}
        {ideBarChartData.datasets.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-4 text-center">Daily IDE Interactions</h4>
              <div className="h-64">
                <Bar data={ideBarChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDE</th>
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
              {ideAggregates.map((ide) => (
                <tr key={ide.ide}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {React.createElement(getIDEIcon(ide.ide))}
                      <span>{formatIDEName(ide.ide)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.loc_added_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.loc_deleted_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.loc_suggested_to_add_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.loc_suggested_to_delete_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Totals by Language and Feature - Grouped by Language */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language and Feature</h3>
        
        {/* Bar Chart */}
        {languageBarChartData.datasets.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-4 text-center">Daily Language Generations</h4>
              <div className="h-64">
                <Bar data={languageBarChartData} options={languageBarChartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Table Section */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setIsLanguageTableExpanded(!isLanguageTableExpanded)}
            className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Detailed Language and Feature Breakdown
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                isLanguageTableExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isLanguageTableExpanded && (
            <div className="mt-4 overflow-x-auto">
              {(() => {
                // Group language feature data by language
                const groupedByLanguage = languageFeatureAggregates.reduce((acc, item) => {
                  if (!acc[item.language]) {
                    acc[item.language] = [];
                  }
                  acc[item.language].push(item);
                  return acc;
                }, {} as Record<string, typeof languageFeatureAggregates>);

                // Sort languages by total generation activity (descending), but put "unknown" and empty strings at the end
                const sortedLanguages = Object.keys(groupedByLanguage).sort((a, b) => {
                  if (a === 'unknown' || a === '') return 1;
                  if (b === 'unknown' || b === '') return -1;
                  
                  const totalGenerationA = groupedByLanguage[a].reduce((sum, item) => sum + item.code_generation_activity_count, 0);
                  const totalGenerationB = groupedByLanguage[b].reduce((sum, item) => sum + item.code_generation_activity_count, 0);
                  
                  return totalGenerationB - totalGenerationA; // Descending order
                });

                return (
                  <div className="space-y-6">
                    {sortedLanguages.map((language) => (
                      <div key={language} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-3 capitalize">
                          {language === 'unknown' || language === '' ? 'Unknown Language' : language}
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            ({groupedByLanguage[language].reduce((sum, item) => sum + item.code_generation_activity_count, 0).toLocaleString()} total generations)
                          </span>
                        </h4>
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Add</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Delete</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupedByLanguage[language].map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(item.feature)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_added_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_deleted_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_suggested_to_add_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_suggested_to_delete_sum.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* PRU Service Value Analysis */}
      {userPRUAnalysisData.some(d => d.pruRequests > 0 || d.standardRequests > 0) && (
        <PRUCostAnalysisChart data={userPRUAnalysisData} />
      )}

      {/* Daily PRU vs Standard Model Usage */}
      {userModelUsageData.some(d => d.pruModels > 0 || d.standardModels > 0 || d.unknownModels > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Daily PRU vs Standard Model Usage</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPruModelChartType('area')}
                className={`px-3 py-1 text-sm rounded ${
                  pruModelChartType === 'area' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setPruModelChartType('bar')}
                className={`px-3 py-1 text-sm rounded ${
                  pruModelChartType === 'bar' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {(() => {
              const totalPRURequests = userModelUsageData.reduce((sum, d) => sum + d.pruModels, 0);
              const totalStandardRequests = userModelUsageData.reduce((sum, d) => sum + d.standardModels, 0);
              const totalUnknownRequests = userModelUsageData.reduce((sum, d) => sum + d.unknownModels, 0);
              const totalPRUs = userModelUsageData.reduce((sum, d) => sum + d.totalPRUs, 0);
              const totalCost = userModelUsageData.reduce((sum, d) => sum + d.serviceValue, 0);
              const grandTotal = totalPRURequests + totalStandardRequests + totalUnknownRequests;

              return (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{totalPRURequests}</div>
                    <div className="text-sm text-gray-600">PRU Requests</div>
                    <div className="text-xs text-gray-500">
                      {grandTotal > 0 ? `${Math.round((totalPRURequests / grandTotal) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{totalStandardRequests}</div>
                    <div className="text-sm text-gray-600">Standard Requests</div>
                    <div className="text-xs text-gray-500">
                      {grandTotal > 0 ? `${Math.round((totalStandardRequests / grandTotal) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{totalUnknownRequests}</div>
                    <div className="text-sm text-gray-600">Unknown Requests</div>
                    <div className="text-xs text-gray-500">
                      {grandTotal > 0 ? `${Math.round((totalUnknownRequests / grandTotal) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(totalPRUs * 100) / 100}</div>
                    <div className="text-sm text-gray-600">Total PRUs</div>
                    <div className="text-xs text-gray-500">
                      Avg: {userModelUsageData.length > 0 ? Math.round((totalPRUs / userModelUsageData.length) * 100) / 100 : 0}/day
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">${Math.round(totalCost * 100) / 100}</div>
                    <div className="text-sm text-gray-600">Service Value</div>
                    <div className="text-xs text-gray-500">
                      Avg: ${userModelUsageData.length > 0 ? Math.round((totalCost / userModelUsageData.length) * 100) / 100 : 0}/day
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Chart */}
          <div className="h-96">
            <Chart type={pruModelChartType === 'area' ? 'line' : 'bar'} data={modelUsageChartData} options={modelUsageChartOptions} />
          </div>

          {/* Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>PRU Models:</strong> Premium models like Claude and Gemini that consume Premium Request Units (PRUs). 
              <strong className="ml-2">Standard Models:</strong> GPT-4.1 and GPT-4o included with paid plans at no additional cost.
            </p>
          </div>
        </div>
      )}

      {/* Chat Panel Usage: Agent Mode vs Unknown Mode */}
      {userAgentHeatmapData.some(d => d.agentModeRequests > 0 || d.unknownModeRequests > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Chat Panel Usage: Agent Mode vs Unknown Mode</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setAgentHeatmapChartType('heatmap')}
                className={`px-3 py-1 text-sm rounded ${
                  agentHeatmapChartType === 'heatmap' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setAgentHeatmapChartType('line')}
                className={`px-3 py-1 text-sm rounded ${
                  agentHeatmapChartType === 'line' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setAgentHeatmapChartType('bar')}
                className={`px-3 py-1 text-sm rounded ${
                  agentHeatmapChartType === 'bar' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Bar
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(() => {
              const totalRequests = userAgentHeatmapData.reduce((sum, d) => sum + d.agentModeRequests, 0);
              const totalCost = userAgentHeatmapData.reduce((sum, d) => sum + d.serviceValue, 0);
              const peakDay = userAgentHeatmapData.reduce((max, d) => d.agentModeRequests > max.agentModeRequests ? d : max, userAgentHeatmapData[0] || {agentModeRequests: 0, date: ''});
              const avgRequestsPerDay = userAgentHeatmapData.length > 0 ? Math.round((totalRequests / userAgentHeatmapData.length) * 100) / 100 : 0;
              const maxIntensity = Math.max(...userAgentHeatmapData.map(d => d.intensity));

              return (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{totalRequests}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                    <div className="text-xs text-gray-500">{avgRequestsPerDay}/day avg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">${Math.round(totalCost * 100) / 100}</div>
                    <div className="text-sm text-gray-600">PRU Cost</div>
                    <div className="text-xs text-gray-500">Estimated total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{peakDay?.agentModeRequests || 0}</div>
                    <div className="text-sm text-gray-600">Peak Day</div>
                    <div className="text-xs text-gray-500">{peakDay?.date ? new Date(peakDay.date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{maxIntensity}</div>
                    <div className="text-sm text-gray-600">Max Intensity</div>
                    <div className="text-xs text-gray-500">Scale 1-5</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Chart */}
          <div className="h-96">
            {agentHeatmapChartType === 'heatmap' && <Bar data={agentHeatmapChartData} options={agentHeatmapChartOptions} />}
            {agentHeatmapChartType === 'line' && <Chart type="line" data={agentHeatmapChartData} options={agentHeatmapChartOptions} />}
            {agentHeatmapChartType === 'bar' && <Bar data={agentHeatmapChartData} options={agentHeatmapChartOptions} />}
          </div>

          {/* Intensity Legend for Heatmap */}
          {agentHeatmapChartType === 'heatmap' && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Intensity Scale:</h4>
              <div className="flex items-center gap-2 text-xs">
                {[0, 1, 2, 3, 4, 5].map(level => (
                  <div key={level} className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 border border-gray-300 rounded"
                      style={{ backgroundColor: getIntensityColor(level) }}
                    ></div>
                    <span className="text-gray-600">{level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const totalRequests = userAgentHeatmapData.reduce((sum, d) => sum + d.agentModeRequests, 0);
              const totalCost = userAgentHeatmapData.reduce((sum, d) => sum + d.serviceValue, 0);

              return (
                <>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Agent Mode Insights</h4>
                    <p className="text-sm text-red-700">
                      Agent Mode is a premium feature that creates autonomous coding sessions. 
                      {totalRequests > 100 ? ' High usage indicates strong adoption of advanced AI features.' : ' Consider using Agent Mode for complex coding tasks.'}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Cost Analysis</h4>
                    <p className="text-sm text-purple-700">
                      Total estimated PRU cost: ${Math.round(totalCost * 100) / 100}. 
                      Average cost per request: ${totalRequests > 0 ? Math.round((totalCost / totalRequests) * 100) / 100 : 0}.
                      {totalCost > 50 ? ' Significant investment in premium AI features.' : ' Moderate premium feature usage.'}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Totals by Model and Feature - Grouped by Model */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Model and Feature</h3>
        
        {/* Bar Chart */}
        {modelBarChartData.datasets.length > 0 && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-4 text-center">Daily Model Interactions</h4>
              <div className="h-64">
                <Bar data={modelBarChartData} options={modelBarChartOptions} />
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Table Section */}
        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setIsModelTableExpanded(!isModelTableExpanded)}
            className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Detailed Model and Feature Breakdown
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                isModelTableExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isModelTableExpanded && (
            <div className="mt-4 overflow-x-auto">
              {(() => {
                // Group model feature data by model
                const groupedByModel = modelFeatureAggregates.reduce((acc, item) => {
                  if (!acc[item.model]) {
                    acc[item.model] = [];
                  }
                  acc[item.model].push(item);
                  return acc;
                }, {} as Record<string, typeof modelFeatureAggregates>);

                // Sort models by total interactions (descending), but put "unknown" at the end
                const sortedModels = Object.keys(groupedByModel).sort((a, b) => {
                  if (a === 'unknown') return 1;
                  if (b === 'unknown') return -1;
                  
                  const totalInteractionsA = groupedByModel[a].reduce((sum, item) => sum + item.user_initiated_interaction_count, 0);
                  const totalInteractionsB = groupedByModel[b].reduce((sum, item) => sum + item.user_initiated_interaction_count, 0);
                  
                  return totalInteractionsB - totalInteractionsA; // Descending order
                });

                return (
                  <div className="space-y-6">
                    {sortedModels.map((model) => (
                      <div key={model} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-3 capitalize">
                          {model === 'unknown' ? 'Unknown Model' : model}
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            ({groupedByModel[model].reduce((sum, item) => sum + item.user_initiated_interaction_count, 0).toLocaleString()} total interactions)
                          </span>
                        </h4>
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Add</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Delete</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupedByModel[model].map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(item.feature)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.user_initiated_interaction_count.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_added_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_deleted_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_suggested_to_add_sum.toLocaleString()}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.loc_suggested_to_delete_sum.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { CopilotMetrics } from '../types/metrics';
import { translateFeature } from '../utils/featureTranslations';
import { getIDEIcon, formatIDEName } from '../utils/ideIcons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface UserDetailsViewProps {
  userMetrics: CopilotMetrics[];
  userLogin: string;
  userId: number;
  onBack: () => void;
}

export default function UserDetailsView({ userMetrics, userLogin, userId, onBack }: UserDetailsViewProps) {
  // Calculate aggregated stats for this user
  const totalInteractions = userMetrics.reduce((sum, metric) => sum + metric.user_initiated_interaction_count, 0);
  const totalGeneration = userMetrics.reduce((sum, metric) => sum + metric.code_generation_activity_count, 0);
  const totalAcceptance = userMetrics.reduce((sum, metric) => sum + metric.code_acceptance_activity_count, 0);
  const totalGeneratedLoc = userMetrics.reduce((sum, metric) => sum + metric.generated_loc_sum, 0);
  const totalAcceptedLoc = userMetrics.reduce((sum, metric) => sum + metric.accepted_loc_sum, 0);
  const daysActive = userMetrics.length;
  const usedAgent = userMetrics.some(metric => metric.used_agent);
  const usedChat = userMetrics.some(metric => metric.used_chat);

  // Get latest plugin version info
  const latestPluginInfo = userMetrics
    .flatMap(metric => metric.totals_by_ide)
    .filter(ide => ide.last_known_plugin_version)
    .sort((a, b) => new Date(b.last_known_plugin_version!.sampled_at).getTime() - new Date(a.last_known_plugin_version!.sampled_at).getTime())[0];

  // Aggregate totals by feature
  const featureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_feature)
    .reduce((acc, feature) => {
      const existing = acc.find(f => f.feature === feature.feature);
      if (existing) {
        existing.user_initiated_interaction_count += feature.user_initiated_interaction_count;
        existing.code_generation_activity_count += feature.code_generation_activity_count;
        existing.code_acceptance_activity_count += feature.code_acceptance_activity_count;
        existing.generated_loc_sum += feature.generated_loc_sum;
        existing.accepted_loc_sum += feature.accepted_loc_sum;
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
        existing.generated_loc_sum += ide.generated_loc_sum;
        existing.accepted_loc_sum += ide.accepted_loc_sum;
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
        existing.generated_loc_sum += item.generated_loc_sum;
        existing.accepted_loc_sum += item.accepted_loc_sum;
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
        existing.generated_loc_sum += item.generated_loc_sum;
        existing.accepted_loc_sum += item.accepted_loc_sum;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_model_feature']);

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
          label: function(context: any) {
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
          label: function(context: any) {
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div className="text-2xl font-bold text-orange-600">{totalGeneratedLoc.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Generated LOC</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalAcceptedLoc.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Accepted LOC</div>
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

      {/* Latest Plugin Version */}
      {latestPluginInfo?.last_known_plugin_version && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Plugin Version</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Plugin</div>
              <div className="font-medium">{latestPluginInfo.last_known_plugin_version.plugin}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Version</div>
              <div className="font-medium">{latestPluginInfo.last_known_plugin_version.plugin_version}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Seen</div>
              <div className="font-medium">{new Date(latestPluginInfo.last_known_plugin_version.sampled_at).toLocaleDateString()}</div>
            </div>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.accepted_loc_sum.toLocaleString()}</td>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {featureAggregates.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(feature.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.accepted_loc_sum.toLocaleString()}</td>
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

        <div className="overflow-x-auto">
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
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedByLanguage[language].map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(item.feature)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.generated_loc_sum.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.accepted_loc_sum.toLocaleString()}</td>
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
      </div>

      {/* Totals by Model and Feature - Grouped by Model */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Model and Feature</h3>
        <div className="overflow-x-auto">
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
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedByModel[model].map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(item.feature)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.user_initiated_interaction_count.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.generated_loc_sum.toLocaleString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.accepted_loc_sum.toLocaleString()}</td>
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
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { UserDayData } from '../../types/metrics';
import { computeCliDayTotals } from '../../domain/calculators/cliUsageCalculator';
import { formatIDEName, getIDEIcon } from '../icons/IDEIcons';
import MetricsTable, { type TableColumn } from './MetricsTable';
import DayImpactCard from './DayImpactCard';
import DayFeatureBreakdown from './DayFeatureBreakdown';
import DayClientDistributionChart from '../charts/DayClientDistributionChart';
import type { VoidCallback } from '../../types/events';
import { getTotalUserInitiatedInteractionCount } from '../../domain/assumedInteractions';
import { isAgentFeature, isCliFeature, isCodeCompletionFeature } from '../../domain/featureCategories';
import { formatAiCreditCost } from '../../utils/formatters';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: VoidCallback;
  date: string;
  dayMetrics?: UserDayData;
  userLogin?: string;
}

type LanguageModelRow = UserDayData['totals_by_language_model'][number];

interface ClientRow {
  name: string;
  iconName: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  plugin_version: string;
}

const cellLeft = 'px-4 py-3 text-sm font-medium text-gray-900';
const cellRight = 'px-4 py-3 text-sm text-gray-900 text-right';
const headerLeft = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const headerRight = 'px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';

const pillBase = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

interface FeaturePill {
  label: string;
  className: string;
}

function buildFeaturePills(dayMetrics: UserDayData, hasCliActivity: boolean): FeaturePill[] {
  const features = dayMetrics.totals_by_feature ?? [];
  const usedCompletions = features.some(
    (f) => isCodeCompletionFeature(f.feature) && f.code_generation_activity_count > 0
  );
  const usedIdeAgent = features.some(
    (f) => isAgentFeature(f.feature) && !isCliFeature(f.feature) && f.user_initiated_interaction_count > 0
  );

  const reviewActive = dayMetrics.used_copilot_code_review_active;
  const reviewPassive = dayMetrics.used_copilot_code_review_passive;
  const reviewMode = reviewActive && reviewPassive
    ? 'Active & Passive'
    : reviewActive
      ? 'Active'
      : reviewPassive
        ? 'Passive'
        : null;

  const pills: FeaturePill[] = [];
  if (dayMetrics.used_copilot_coding_agent) {
    pills.push({ label: 'Cloud Agent', className: `${pillBase} bg-purple-100 text-purple-800` });
  }
  if (reviewMode) {
    pills.push({ label: `Code Review (${reviewMode})`, className: `${pillBase} bg-pink-100 text-pink-800` });
  }
  if (hasCliActivity) {
    pills.push({ label: 'CLI', className: `${pillBase} bg-teal-100 text-teal-800` });
  }
  if (usedCompletions) {
    pills.push({ label: 'Completions', className: `${pillBase} bg-blue-100 text-blue-800` });
  }
  if (usedIdeAgent) {
    pills.push({ label: 'IDE Agent', className: `${pillBase} bg-cyan-100 text-cyan-800` });
  }
  return pills;
}

const clientColumns: TableColumn<ClientRow>[] = [
  {
    id: 'name',
    header: 'Client',
    headerClassName: headerLeft,
    className: cellLeft,
    renderCell: (r) => {
      const ClientIcon = getIDEIcon(r.iconName);
      return (
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0" aria-hidden="true">
            <ClientIcon />
          </span>
          <span>{r.name}</span>
        </div>
      );
    },
  },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
  { id: 'pluginVersion', header: 'Plugin Version', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.plugin_version },
];

const languageModelColumns: TableColumn<LanguageModelRow>[] = [
  { id: 'language', header: 'Language', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.language || 'Unknown' },
  { id: 'model', header: 'Model', headerClassName: headerLeft, className: 'px-4 py-3 text-sm text-gray-900', renderCell: (r) => r.model || 'Unknown' },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
];

export default function DayDetailsModal({ isOpen, onClose, date, dayMetrics, userLogin }: DayDetailsModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasData = !!dayMetrics;
  const cliDayTotals = computeCliDayTotals(dayMetrics);
  const hasCliActivity = cliDayTotals.promptCount > 0 || cliDayTotals.interactions > 0;
  const cliInteractionCount = cliDayTotals.interactionCount;

  const featurePills = hasData ? buildFeaturePills(dayMetrics!, hasCliActivity) : [];

  const clientRows: ClientRow[] = hasData ? [
    ...dayMetrics!.totals_by_ide.map((ide) => ({
      name: formatIDEName(ide.ide),
      iconName: ide.ide,
      user_initiated_interaction_count: getTotalUserInitiatedInteractionCount(ide),
      code_generation_activity_count: ide.code_generation_activity_count,
      code_acceptance_activity_count: ide.code_acceptance_activity_count,
      loc_added_sum: ide.loc_added_sum,
      loc_deleted_sum: ide.loc_deleted_sum,
      plugin_version: ide.last_known_plugin_version
        ? `${ide.last_known_plugin_version.plugin} v${ide.last_known_plugin_version.plugin_version}`
        : 'Unknown',
    })),
    ...(hasCliActivity ? [{
      name: 'Copilot CLI',
      iconName: 'copilot_cli',
      user_initiated_interaction_count: cliInteractionCount,
      code_generation_activity_count: cliDayTotals.generations,
      code_acceptance_activity_count: cliDayTotals.acceptances,
      loc_added_sum: cliDayTotals.locAdded,
      loc_deleted_sum: cliDayTotals.locDeleted,
      plugin_version: dayMetrics!.totals_by_cli?.last_known_cli_version
        ? `v${dayMetrics!.totals_by_cli.last_known_cli_version.cli_version}`
        : 'Unknown',
    }] : []),
  ] : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{formatDate(date)}</h2>
            {hasData && userLogin && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span>User: {userLogin}</span>
                <span aria-hidden="true" className="text-gray-300">•</span>
                <span>AI cost: {formatAiCreditCost(dayMetrics?.ai_credits_used ?? 0)}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!hasData ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity recorded</h3>
              <p className="text-gray-600">There was no GitHub Copilot activity on this date.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Features used pills */}
              {featurePills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Features used:</span>
                  {featurePills.map((pill) => (
                    <span key={pill.label} className={pill.className}>{pill.label}</span>
                  ))}
                </div>
              )}

              {/* Clients & Impact cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <DayClientDistributionChart
                  dayMetrics={dayMetrics}
                  cliInteractionCount={cliInteractionCount}
                />
                <DayImpactCard
                  locAdded={dayMetrics.loc_added_sum}
                  locDeleted={dayMetrics.loc_deleted_sum}
                />
              </div>

              {/* Features Section */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">Activity by Feature</h4>
                <p className="text-sm text-gray-600 mb-4">Expand a feature to see the languages and models used.</p>
                <DayFeatureBreakdown
                  totalsByFeature={dayMetrics.totals_by_feature}
                  totalsByLanguageFeature={dayMetrics.totals_by_language_feature}
                  totalsByModelFeature={dayMetrics.totals_by_model_feature}
                />
              </div>

              {/* Activity by Client section (includes IDE & CLI clients) */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Client</h4>
                <MetricsTable
                  data={clientRows}
                  columns={clientColumns}
                  tableClassName="w-full divide-y divide-gray-200"
                  tableContainerClassName="overflow-x-auto"
                  theadClassName="bg-gray-50"
                  tbodyClassName="bg-white divide-y divide-gray-200"
                  rowClassName={() => 'hover:bg-gray-50'}
                  getRowKey={(_, idx) => idx}
                  initialCount={5}
                />
              </div>

              {/* Language + Model Section */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language &amp; Model</h4>
                <MetricsTable
                  data={dayMetrics.totals_by_language_model}
                  columns={languageModelColumns}
                  tableClassName="w-full divide-y divide-gray-200"
                  tableContainerClassName="overflow-x-auto"
                  theadClassName="bg-gray-50"
                  tbodyClassName="bg-white divide-y divide-gray-200"
                  rowClassName={() => 'hover:bg-gray-50'}
                  getRowKey={(_, idx) => idx}
                  initialCount={10}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

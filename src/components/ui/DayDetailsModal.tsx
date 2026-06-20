'use client';

import React from 'react';
import type { UserDayData } from '../../types/metrics';
import { computeCliDayTotals } from '../../domain/calculators/cliUsageCalculator';
import { translateFeature } from '../../domain/featureTranslations';
import { formatIDEName } from '../icons/IDEIcons';
import MetricsTable, { type TableColumn } from './MetricsTable';
import type { VoidCallback } from '../../types/events';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: VoidCallback;
  date: string;
  dayMetrics?: UserDayData;
  userLogin?: string;
}

type FeatureRow = UserDayData['totals_by_feature'][number];
type LanguageFeatureRow = UserDayData['totals_by_language_feature'][number];
type LanguageModelRow = UserDayData['totals_by_language_model'][number];
type ModelFeatureRow = UserDayData['totals_by_model_feature'][number];

interface ClientRow {
  name: string;
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

const featureColumns: TableColumn<FeatureRow>[] = [
  { id: 'feature', header: 'Feature', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => translateFeature(r.feature) },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
];

const clientColumns: TableColumn<ClientRow>[] = [
  { id: 'name', header: 'Client', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.name },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
  { id: 'pluginVersion', header: 'Plugin Version', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.plugin_version },
];

const languageFeatureColumns: TableColumn<LanguageFeatureRow>[] = [
  { id: 'language', header: 'Language', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.language || 'Unknown' },
  { id: 'feature', header: 'Feature', headerClassName: headerLeft, className: 'px-4 py-3 text-sm text-gray-900', renderCell: (r) => translateFeature(r.feature) },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
];

const languageModelColumns: TableColumn<LanguageModelRow>[] = [
  { id: 'language', header: 'Language', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.language || 'Unknown' },
  { id: 'model', header: 'Model', headerClassName: headerLeft, className: 'px-4 py-3 text-sm text-gray-900', renderCell: (r) => r.model || 'Unknown' },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
];

const modelFeatureColumns: TableColumn<ModelFeatureRow>[] = [
  { id: 'model', header: 'Model', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.model || 'Unknown' },
  { id: 'feature', header: 'Feature', headerClassName: headerLeft, className: 'px-4 py-3 text-sm text-gray-900', renderCell: (r) => translateFeature(r.feature) },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
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

  const clientRows: ClientRow[] = hasData ? [
    ...dayMetrics!.totals_by_ide.map((ide) => ({
      name: formatIDEName(ide.ide),
      user_initiated_interaction_count: ide.user_initiated_interaction_count,
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
              <p className="text-sm text-gray-600 mt-1">
                Activity Details • User: {userLogin}
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
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {(dayMetrics.user_initiated_interaction_count + cliInteractionCount).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-blue-800">Interactions</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {dayMetrics.code_generation_activity_count.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-green-800">Code Generation</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {dayMetrics.code_acceptance_activity_count.toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-purple-800">Code Acceptance</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {(dayMetrics.loc_added_sum + dayMetrics.loc_deleted_sum).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-orange-800">Total LOC Changed</div>
                </div>
              </div>

              {/* Features Section */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h4>
                <MetricsTable
                  data={dayMetrics.totals_by_feature}
                  columns={featureColumns}
                  tableClassName="w-full divide-y divide-gray-200"
                  tableContainerClassName="overflow-x-auto"
                  theadClassName="bg-gray-50"
                  tbodyClassName="bg-white divide-y divide-gray-200"
                  rowClassName={() => 'hover:bg-gray-50'}
                  getRowKey={(_, idx) => idx}
                  initialCount={5}
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

              {/* Language + Feature Section */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language &amp; Feature</h4>
                <MetricsTable
                  data={dayMetrics.totals_by_language_feature}
                  columns={languageFeatureColumns}
                  tableClassName="w-full divide-y divide-gray-200"
                  tableContainerClassName="overflow-x-auto"
                  theadClassName="bg-gray-50"
                  tbodyClassName="bg-white divide-y divide-gray-200"
                  rowClassName={() => 'hover:bg-gray-50'}
                  getRowKey={(_, idx) => idx}
                  initialCount={10}
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

              {/* Model + Feature Section */}
              <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Model &amp; Feature</h4>
                <MetricsTable
                  data={dayMetrics.totals_by_model_feature}
                  columns={modelFeatureColumns}
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

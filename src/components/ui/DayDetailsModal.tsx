'use client';

import React from 'react';
import type { UserDayData } from '../../types/metrics';
import { translateFeature } from '../../domain/featureTranslations';
import { formatIDEName } from '../icons/IDEIcons';
import ExpandableTableSection from './ExpandableTableSection';
import type { VoidCallback } from '../../types/events';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: VoidCallback;
  date: string;
  dayMetrics?: UserDayData;
  userLogin?: string;
}

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
                    {dayMetrics.user_initiated_interaction_count.toLocaleString()}
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h4>
                <ExpandableTableSection
                  items={dayMetrics.totals_by_feature}
                  initialCount={5}
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleItems.map((feature, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{translateFeature(feature.feature)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{feature.user_initiated_interaction_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{feature.code_generation_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{feature.loc_added_sum.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{feature.loc_deleted_sum.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableTableSection>
              </div>

              {/* IDEs Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by IDE</h4>
                <ExpandableTableSection
                  items={dayMetrics.totals_by_ide}
                  initialCount={5}
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDE</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plugin Version</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleItems.map((ide, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatIDEName(ide.ide)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{ide.user_initiated_interaction_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{ide.code_generation_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{ide.code_acceptance_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{ide.loc_added_sum.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {ide.last_known_plugin_version ? 
                                  `${ide.last_known_plugin_version.plugin} v${ide.last_known_plugin_version.plugin_version}` : 
                                  'Unknown'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableTableSection>
              </div>

              {/* Language + Feature Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language & Feature</h4>
                <ExpandableTableSection
                  items={dayMetrics.totals_by_language_feature}
                  initialCount={10}
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.language || 'Unknown'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{translateFeature(item.feature)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.loc_added_sum.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.loc_deleted_sum.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableTableSection>
              </div>

              {/* Language + Model Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language & Model</h4>
                <ExpandableTableSection
                  items={dayMetrics.totals_by_language_model}
                  initialCount={10}
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.language || 'Unknown'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.model || 'Unknown'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.loc_added_sum.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.loc_deleted_sum.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableTableSection>
              </div>

              {/* Model + Feature Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Activity by Model & Feature</h4>
                <ExpandableTableSection
                  items={dayMetrics.totals_by_model_feature}
                  initialCount={10}
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.model || 'Unknown'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{translateFeature(item.feature)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.user_initiated_interaction_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.loc_added_sum.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ExpandableTableSection>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
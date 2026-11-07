"use client";

import { useMemo } from 'react';
import { Details } from '@primer/react';
import { ViewPanel } from '../../ui';
import { usePluginVersions } from '../../../hooks/usePluginVersions';
import { CLIENT_VERSIONS_SECTIONS } from '../../layout/contextSections';
import type { ClientVersionsReadModel } from '../../../read-models/clients';
import ClientVersionsDashboard from './ClientVersionsDashboard';
import ClientTelemetryNotice from '../../ClientTelemetryNotice';
import ReportingQualitySection from './ReportingQualitySection';
import {
  analyzeJetBrainsHealth,
  analyzeVsCodeHealth,
} from './clientVersionAnalysis';

interface FleetHealthViewProps {
  model: ClientVersionsReadModel;
  onUserClick: (userLogin: string, userId: number) => void;
}

export default function FleetHealthView({ model, onUserClick }: FleetHealthViewProps) {
  const { pluginVersionData, reportStartDay } = model;
  const { versions: jetbrainsUpdates, isLoading: jbLoading, error: jbError } = usePluginVersions('jetbrains');
  const {
    stableReleases: vsCodeStableReleases,
    isLoading: vsLoading,
    error: vsError,
    currentStableMinor,
    currentPreviewMinor,
    updatedAt: vsUpdatedAt,
  } = usePluginVersions('vscode');
  const [reportingSection, trendSection, requirementsSection, usersSection, healthSection, driftSection, methodologySection] = CLIENT_VERSIONS_SECTIONS;
  const platforms = useMemo(
    () => [
      analyzeJetBrainsHealth({
        versionAnalysis: pluginVersionData.jetbrains,
        totalUsers: pluginVersionData.totalUniqueIntellijUsers,
        releases: jetbrainsUpdates,
        isLoading: jbLoading,
        error: jbError,
      }),
      analyzeVsCodeHealth({
        versionAnalysis: pluginVersionData.vscode,
        totalUsers: pluginVersionData.totalUniqueVsCodeUsers,
        stableReleases: vsCodeStableReleases,
        isLoading: vsLoading,
        error: vsError,
        currentStableMinor,
        currentPreviewMinor,
        reportStartDay,
      }),
    ],
    [
      currentPreviewMinor,
      currentStableMinor,
      jbError,
      jbLoading,
      jetbrainsUpdates,
      pluginVersionData,
      reportStartDay,
      vsCodeStableReleases,
      vsError,
      vsLoading,
    ],
  );

  return (
    <ViewPanel
      headerProps={{
        title: 'Fleet Health',
        description: 'Review reported telemetry and minimum requirements alongside observed plugin and extension versions.',
      }}
      contentClassName="space-y-6"
    >
      <ReportingQualitySection
        quality={model.reportingQuality}
        onUserClick={onUserClick}
        sectionIds={{
          summary: reportingSection.id,
          trend: trendSection.id,
          requirements: requirementsSection.id,
          users: usersSection.id,
        }}
      />
      <p className="text-sm text-muted">
        The version comparison below uses release metadata, not API-reported minimum requirements.
        An outdated version is not proof of missing telemetry or an unmet requirement.
      </p>
      <ClientVersionsDashboard
        platforms={platforms}
        reportStartDay={reportStartDay}
        vsCodeUpdatedAt={vsUpdatedAt}
        sectionIds={{
          health: healthSection.id,
          drift: driftSection.id,
          methodology: methodologySection.id,
        }}
      />
      {model.reportingQuality.summary.telemetryReportedRecords === 0
        && model.reportingQuality.summary.requirementsReportedRecords === 0
        && model.telemetryWarnings.length > 0 && (
          <Details className="rounded-md border border-default p-4">
            <Details.Summary>Historical October guidance for older exports</Details.Summary>
            <div className="mt-4">
              <ClientTelemetryNotice warnings={model.telemetryWarnings} historicalGuidance />
            </div>
          </Details>
        )}
    </ViewPanel>
  );
}

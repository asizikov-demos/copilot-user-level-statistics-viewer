"use client";

import { useMemo } from 'react';
import { ViewPanel } from '../../ui';
import { usePluginVersions } from '../../../hooks/usePluginVersions';
import { CLIENT_VERSIONS_SECTIONS } from '../../layout/contextSections';
import type { ClientVersionsReadModel } from '../../../read-models/clients';
import ClientVersionsDashboard from './ClientVersionsDashboard';
import {
  analyzeJetBrainsHealth,
  analyzeVsCodeHealth,
} from './clientVersionAnalysis';

interface ClientVersionsViewProps {
  model: ClientVersionsReadModel;
}

export default function ClientVersionsView({ model }: ClientVersionsViewProps) {
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
  const [healthSection, driftSection, methodologySection] = CLIENT_VERSIONS_SECTIONS;
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
        title: 'Client Versions',
        description: 'Prioritize plugin and extension upgrades that can affect Copilot feature availability and telemetry quality.',
      }}
    >
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
    </ViewPanel>
  );
}

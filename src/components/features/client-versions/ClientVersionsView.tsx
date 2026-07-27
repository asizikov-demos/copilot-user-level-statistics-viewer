"use client";

import { ViewPanel } from '../../ui';
import { usePluginVersions } from '../../../hooks/usePluginVersions';
import { CLIENT_VERSIONS_SECTIONS } from '../../layout/contextSections';
import type { ClientVersionsReadModel } from '../../../read-models/clients';
import JetBrainsVersionsSection from './sections/JetBrainsVersionsSection';
import VsCodeVersionsSection from './sections/VsCodeVersionsSection';

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
  const [jetbrainsSection, vsCodeSection] = CLIENT_VERSIONS_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Client Versions',
        description: 'Analyze plugin and extension versions across your organization to identify users with outdated clients that may be missing important features and bug fixes.',
      }}
      contentClassName="space-y-10"
    >
      <div className="space-y-4">
        <JetBrainsVersionsSection
          sectionId={jetbrainsSection.id}
          pluginVersionAnalysis={pluginVersionData.jetbrains}
          totalUniqueIntellijUsers={pluginVersionData.totalUniqueIntellijUsers}
          jetbrainsUpdates={jetbrainsUpdates}
          isLoading={jbLoading}
          error={jbError}
        />
        <VsCodeVersionsSection
          sectionId={vsCodeSection.id}
          versionAnalysis={pluginVersionData.vscode}
          totalUniqueVsCodeUsers={pluginVersionData.totalUniqueVsCodeUsers}
          stableReleases={vsCodeStableReleases}
          isLoading={vsLoading}
          error={vsError}
          currentStableMinor={currentStableMinor}
          currentPreviewMinor={currentPreviewMinor}
          updatedAt={vsUpdatedAt}
          reportStartDay={reportStartDay}
        />
      </div>
    </ViewPanel>
  );
}

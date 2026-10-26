'use client';

import { ViewPanel } from '../../ui';
import { CUSTOMIZATIONS_SECTIONS } from '../../layout/contextSections';
import type { CustomizationsReadModel } from '../../../read-models/customizations';
import { CustomizationsSummaryCards, CustomizationsTopCharts } from './CustomizationsOverview';
import ExplorerTable from './ExplorerTable';
import { formatNumber } from './shared';

export default function CustomizationsView({ model }: { model: CustomizationsReadModel }) {
  const [overviewSection, topSection, explorerSection] = CUSTOMIZATIONS_SECTIONS;
  const hasData = Object.values(model.types).some(type => type.items.length > 0);

  return (
    <ViewPanel
      headerProps={{
        title: 'Customizations',
        description: (
          <p className="text-muted text-sm mt-1">
            Skills, custom agents, MCP servers, slash commands and plugins reported by Copilot CLI across <strong>{formatNumber(model.totalUsers)}</strong> users ({formatNumber(model.cliUsers)} CLI users).
          </p>
        ),
      }}
      contentClassName="space-y-8"
    >
      {hasData ? (
        <>
          <div id={overviewSection.id} className="scroll-mt-28"><CustomizationsSummaryCards model={model} /></div>
          <div id={topSection.id} className="scroll-mt-28"><CustomizationsTopCharts model={model} /></div>
          <div id={explorerSection.id} className="scroll-mt-28"><ExplorerTable model={model} /></div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--borderColor-default)] p-10 text-center text-sm text-muted">
          No customization data in this report.
        </p>
      )}
    </ViewPanel>
  );
}

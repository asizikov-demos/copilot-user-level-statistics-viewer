'use client';

import React from 'react';
import { Button } from '@primer/react';
import { ArrowRightIcon } from '@primer/octicons-react';
import type { OverviewReadModel } from '../../../read-models/overview';
import { useNavigation } from '../../../state/NavigationContext';
import { VIEW_MODES } from '../../../types/navigation';
import { formatNumber, formatPercentage } from '../../../utils/formatters';
import ChartContainer from '../../ui/ChartContainer';
import EmptyState from '../../ui/EmptyState';
import { formatIDEName, getIDEIcon } from '../../icons/IDEIcons';
import OverviewHeader from './OverviewHeader';
import WorkingPatternsSection from './WorkingPatternsSection';
import { OVERVIEW_SECTIONS } from './overviewSections';

const [workingPatternsSection, clientSection, workflowSection] = OVERVIEW_SECTIONS;
const CLIENT_PREVIEW_SIZE = 6;

interface ReachRow {
  key: string;
  label: string;
  users: number;
}

function ReachList({ rows, totalUsers, clients = false }: {
  rows: ReachRow[];
  totalUsers: number;
  clients?: boolean;
}) {
  return (
    <ul className="space-y-4" aria-label={clients ? 'Observed users by client' : 'Observed users by workflow'}>
      {rows.map(row => {
        const percentage = totalUsers > 0 ? row.users / totalUsers * 100 : null;
        const Icon = clients ? getIDEIcon(row.key) : undefined;
        return (
          <li key={row.key}>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {Icon && <span className="shrink-0" aria-hidden="true"><Icon size={16} /></span>}
                <span className="min-w-0 break-words" title={clients ? row.key : undefined}>{row.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatNumber(row.users)} <span className="sr-only">users</span>
                <span className="ml-2 text-xs text-muted">
                  {percentage === null ? 'N/A' : formatPercentage(percentage)}
                </span>
              </span>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${clients ? 'bg-[var(--data-blue-color-emphasis)]' : 'bg-[var(--data-purple-color-emphasis)]'}`}
                style={{ width: `${percentage ?? 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface OverviewDashboardProps {
  model: OverviewReadModel;
  enterpriseName: string | null;
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  model,
  enterpriseName,
}) => {
  const { clientReachData, featureAdoptionData, clientTrafficSummary, header } = model;
  const { navigateTo } = useNavigation();
  const clients = clientReachData.slice(0, CLIENT_PREVIEW_SIZE).map(row => ({
    key: row.client, label: formatIDEName(row.client), users: row.users,
  }));
  const workflows: ReachRow[] = [
    { key: 'completions', label: 'Code completions', users: featureAdoptionData.completionUsers },
    { key: 'agent', label: 'Editor Agent Mode', users: featureAdoptionData.agentModeUsers },
    { key: 'ask', label: 'Ask Mode', users: featureAdoptionData.askModeUsers },
    { key: 'plan', label: 'Plan Mode', users: featureAdoptionData.planModeUsers },
    { key: 'review', label: 'Code review', users: featureAdoptionData.codeReviewUsers },
    { key: 'coding-agent', label: 'Coding agent', users: featureAdoptionData.codingAgentUsers },
  ].sort((a, b) => b.users - a.users);
  const hasWorkflowUsage = workflows.some(row => row.users > 0);

  return (
    <div className="space-y-6">
      <OverviewHeader model={header} enterpriseName={enterpriseName} />

      <WorkingPatternsSection data={model.workingPatterns} sectionId={workingPatternsSection.id} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section id={clientSection.id} className="min-w-0 scroll-mt-28" aria-label={clientSection.label}>
          <ChartContainer
            title="Where people work"
            description="Observed users by client across the uploaded period."
            chartHeight="h-auto"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-muted pt-4">
                <span className="text-xs text-muted">
                  {clientReachData.length > CLIENT_PREVIEW_SIZE
                    ? `Top ${CLIENT_PREVIEW_SIZE} of ${formatNumber(clientReachData.length)} clients`
                    : `${formatNumber(clientReachData.length)} clients observed`}
                </span>
                <Button variant="invisible" size="small" trailingVisual={ArrowRightIcon} onClick={() => navigateTo(VIEW_MODES.CLIENT_ANALYSIS)}>
                  Explore Clients
                </Button>
              </div>
            }
          >
            {clients.length > 0 ? (
              <ReachList rows={clients} totalUsers={header.uniqueUsers} clients />
            ) : (
              <EmptyState heading="No client usage observed" headingAs="h4" description="The uploaded records do not identify active clients." />
            )}
          </ChartContainer>
        </section>

        <section id={workflowSection.id} className="min-w-0 scroll-mt-28" aria-label={workflowSection.label}>
          <ChartContainer
            title="How Copilot is used"
            description="Observed users by workflow across the uploaded period."
            chartHeight="h-auto"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-muted pt-4">
                <span className="text-xs text-muted">CLI and App reach appear by client.</span>
                <Button variant="invisible" size="small" trailingVisual={ArrowRightIcon} onClick={() => navigateTo(VIEW_MODES.COPILOT_ADOPTION)}>
                  Explore Adoption
                </Button>
              </div>
            }
          >
            {hasWorkflowUsage ? (
              <ReachList rows={workflows} totalUsers={header.uniqueUsers} />
            ) : (
              <EmptyState heading="No usage observed for these workflows" headingAs="h4" description="Explore Adoption for other reported usage, including CLI and App." />
            )}
          </ChartContainer>
        </section>
      </div>

      <p className="text-xs text-muted">
        Reach uses {formatNumber(header.uniqueUsers)} distinct users in the uploaded records, not licensed seats.
        Users may appear in multiple rows; percentages are not additive.
        The workflow preview is not exhaustive; editor Agent Mode is distinct from the VS Code Agents window.
      </p>
      <p className="text-xs text-muted">
        Client reach combines observed IDE activity, CLI/App usage signals, and positive client traffic.
        {clientTrafficSummary.reportedRecords > 0
          ? ` Client traffic fields were reported in ${formatNumber(clientTrafficSummary.reportedRecords)} of ${formatNumber(clientTrafficSummary.recordCount)} uploaded records.`
          : ' Client traffic fields were not reported in the uploaded records.'}
        {' '}Unreported activity is not zero; requests, sessions, and workflow interactions remain separate measures.
      </p>
    </div>
  );
};

export default OverviewDashboard;

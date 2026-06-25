'use client';

import React from 'react';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import { ViewPanel } from './ui';
import { AI_ADOPTION_PHASE_SECTIONS } from './layout/contextSections';
import type { AiAdoptionPhaseData, AiAdoptionPhaseTopEntry } from '../domain/calculators/metricCalculators';
import { formatAiAdoptionPhase, formatAiCreditCost, formatModelDisplayName, formatNumber } from '../utils/formatters';
import { formatIDEName, getIDEIcon } from './icons/IDEIcons';
import { getModelIcon } from './icons/ModelIcons';

interface AiAdoptionPhaseViewProps {
  phaseData: AiAdoptionPhaseData[];
}

const AI_ADOPTION_PHASE_BLOG_URL = 'https://github.blog/changelog/2026-05-29-copilot-usage-metrics-api-adds-cohorts-for-ai-adoption/#whats-new';
const PHASE_PILL_CLASS = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';

const PHASE_DEFINITIONS = [
  {
    phaseNumber: 0,
    phase: 'No cohort',
    description: 'User did not meet the engagement criteria for any phase.',
  },
  {
    phaseNumber: 1,
    phase: 'Phase 1',
    description: 'User engaged with code completion and/or IDE agent mode.',
  },
  {
    phaseNumber: 2,
    phase: 'Phase 2',
    description:
      'User engaged with a single GitHub-based agent surface, such as Copilot cloud agent, Copilot code review, or Copilot CLI.',
  },
  {
    phaseNumber: 3,
    phase: 'Phase 3',
    description: 'User engaged with two or more GitHub-based agent surfaces, or with the GitHub Copilot app.',
  },
] as const;

function formatAverage(value: number): string {
  return formatNumber(value, 1);
}

function renderTopEntries(
  entries: AiAdoptionPhaseTopEntry[],
  formatName: (name: string) => string = (name) => name
) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-gray-900" title={entry.name}>
            {formatName(entry.name)}
          </span>
          <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
            {entry.total.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderTopClientEntries(entries: AiAdoptionPhaseTopEntry[]) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const ClientIcon = getIDEIcon(entry.name);
        return (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex-shrink-0">
                <ClientIcon />
              </div>
              <span className="truncate text-gray-900" title={entry.name}>
                {formatIDEName(entry.name)}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderTopModelEntries(entries: AiAdoptionPhaseTopEntry[]) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const ModelIcon = getModelIcon(entry.name);
        return (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex-shrink-0">
                <ModelIcon />
              </div>
              <span className="truncate text-gray-900" title={entry.name}>
                {formatModelDisplayName(entry.name)}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AiAdoptionPhaseView({ phaseData }: AiAdoptionPhaseViewProps) {
  const rightHeaderClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
  const rightCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';
  const [comparisonSection, assignmentSection] = AI_ADOPTION_PHASE_SECTIONS;
  const columns: TableColumn<AiAdoptionPhaseData>[] = [
    {
      id: 'phase',
      header: 'Phase',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (phase) => (
        <span className={PHASE_PILL_CLASS}>
          {formatAiAdoptionPhase(phase.phase)}
        </span>
      ),
    },
    {
      id: 'userCount',
      header: 'Users',
      headerClassName: rightHeaderClass,
      className: `${rightCellClass} font-medium`,
      renderCell: (phase) => phase.userCount.toLocaleString(),
    },
    {
      id: 'avgUserInitiatedInteractions',
      header: 'Avg Interactions',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAverage(phase.avgUserInitiatedInteractions),
    },
    {
      id: 'avgLocImpact',
      header: 'Avg LOC Impact',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{formatAverage(phase.avgLocAdded)}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{formatAverage(phase.avgLocDeleted)}</span>
        </span>
      ),
    },
    {
      id: 'avgAiCreditsUsed',
      header: 'Avg AI Cost',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAiCreditCost(phase.avgAiCreditsUsed),
    },
    {
      id: 'totalLocImpact',
      header: 'Total LOC Impact',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{phase.totalLocAdded.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{phase.totalLocDeleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'avgDaysActive',
      header: 'Avg Active Days',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAverage(phase.avgDaysActive),
    },
    {
      id: 'topModels',
      header: 'Top Models - interactions',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => renderTopModelEntries(phase.topModels),
    },
    {
      id: 'topClients',
      header: 'Top Clients - activity',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => renderTopClientEntries(phase.topClients),
    },
    {
      id: 'topLanguages',
      header: 'Top Languages - generations + acceptances',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => renderTopEntries(phase.topLanguages),
    },
  ];

  return (
    <ViewPanel
      headerProps={{
        title: 'AI Adoption Phases',
        description: 'Compare Copilot adoption cohorts by user count, per-user averages, and their most-used models, clients, and languages.',
      }}
      contentClassName="space-y-8"
    >
      <div id={comparisonSection.id} className="bg-white rounded-md border border-[#d1d9e0] scroll-mt-28">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Phase comparison</h3>
          <p className="mt-1 text-sm text-gray-600">Averages are calculated per user in each phase.</p>
        </div>
        <MetricsTable<AiAdoptionPhaseData>
          data={phaseData}
          columns={columns}
          tableClassName="w-full divide-y divide-gray-200"
          tableContainerClassName="overflow-x-auto"
          theadClassName="bg-gray-50"
          rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
          getRowKey={(phase) => phase.phase.phase_number}
          emptyState={(
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No AI adoption phase data is available in this metrics upload.
            </div>
          )}
        />
      </div>

      <div id={assignmentSection.id} className="bg-white rounded-md border border-[#d1d9e0] scroll-mt-28">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">How phases are assigned</h3>
          <p className="mt-1 text-sm text-gray-600">
            GitHub classifies each engaged user based on the Copilot surfaces used on at least two days in the rolling
            28-day window.
          </p>
        </div>
        <div className="px-6 py-5">
          <dl className="space-y-3">
            {PHASE_DEFINITIONS.map((phaseDefinition) => (
              <div key={phaseDefinition.phaseNumber} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <dt>
                  <span className={PHASE_PILL_CLASS}>
                    {formatAiAdoptionPhase({
                      phase_number: phaseDefinition.phaseNumber,
                      phase: phaseDefinition.phase,
                      version: 'v1',
                    })}
                  </span>
                </dt>
                <dd className="mt-2 text-sm text-gray-600">{phaseDefinition.description}</dd>
              </div>
            ))}
          </dl>
          <a
            href={AI_ADOPTION_PHASE_BLOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-[#0969da] hover:underline"
          >
            Learn More
          </a>
        </div>
      </div>
    </ViewPanel>
  );
}

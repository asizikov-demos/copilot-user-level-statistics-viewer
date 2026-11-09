'use client';

import type { WorkingPatternsSummary } from '../../../domain/calculators/workingPatternsCalculator';
import { formatNumber, formatPercentage } from '../../../utils/formatters';
import ChartContainer from '../../ui/ChartContainer';
import EmptyState from '../../ui/EmptyState';

interface WorkingPatternsSectionProps {
  data: WorkingPatternsSummary;
  sectionId: string;
}

function reach(value: number | null, total: number): string {
  return value === null || total === 0 ? 'Not reported' : formatPercentage(value / total * 100);
}

export default function WorkingPatternsSection({ data, sectionId }: WorkingPatternsSectionProps) {
  const hasActivity = data.assistanceUsers > 0 || data.localAgentUsers > 0 || (data.delegatedUsers ?? 0) > 0;
  const rows = [
    { label: 'Developer assistance', users: data.assistanceUsers, color: 'bg-[var(--data-blue-color-emphasis)]', description: 'Code completions, or Ask, Inline, Edit, or Plan chat.' },
    { label: 'Local agent workflows', users: data.localAgentUsers, color: 'bg-[var(--data-purple-color-emphasis)]', description: 'Editor Agent Mode, Copilot CLI, Copilot App, or the VS Code Agents window.' },
    { label: 'Delegated workflows', users: data.delegatedUsers, color: 'bg-[var(--data-teal-color-emphasis)]', description: 'Cloud agent, code review, or Agentic Workflows.' },
  ];

  return (
    <section id={sectionId} className="scroll-mt-28" aria-label="Copilot working patterns">
      <ChartContainer
        title="Copilot working patterns"
        description={hasActivity ? 'Groups overlap, so percentages do not add up. Assistance continues alongside agent use.' : undefined}
        chartHeight="h-auto"
      >
        {hasActivity ? (
          <>
            <ul className="space-y-4" aria-label="Observed working-pattern reach">
              {rows.map(row => (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-semibold">{row.label}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{reach(row.users, data.totalUsers)}</span>
                      {row.users !== null && (
                        <span className="ml-2 text-xs text-muted">{formatNumber(row.users)} users</span>
                      )}
                    </span>
                  </div>
                  <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded bg-muted">
                    <div className={`h-full rounded ${row.color}`} style={{ width: `${row.users !== null && data.totalUsers > 0 ? row.users / data.totalUsers * 100 : 0}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {row.users === null ? 'Delegated workflow signals were not reported.' : row.description}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-muted pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Two or more local agent surfaces</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                  {reach(data.multipleLocalSurfaceUsers, data.totalUsers)}
                  <span className="ml-2 text-xs font-normal text-muted">{formatNumber(data.multipleLocalSurfaceUsers)} users</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Local + delegated workflows</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                  {reach(data.localAndDelegatedUsers, data.totalUsers)}
                  {data.localAndDelegatedUsers !== null && (
                    <span className="ml-2 text-xs font-normal text-muted">{formatNumber(data.localAndDelegatedUsers)} users</span>
                  )}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <EmptyState
            heading="No working-pattern activity observed"
            headingAs="h4"
            description="The uploaded records contain no matching activity signals. This does not prove these workflows were not used."
          />
        )}
      </ChartContainer>
    </section>
  );
}

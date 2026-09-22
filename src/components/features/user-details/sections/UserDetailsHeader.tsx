'use client';

import type { ReactNode } from 'react';
import type { UserDetailsHeaderReadModel } from '../../../../read-models/userDetails';
import type { AIAdoptionPhase } from '../../../../types/metrics';
import {
  formatAiAdoptionPhaseName,
  formatAiCreditCost,
  formatCompactNumber,
  formatNumber,
} from '../../../../utils/formatters';
import { formatIDEName } from '../../../../utils/ideNames';

interface UserDetailsHeaderProps {
  userLogin: string;
  userId: number;
  aiAdoptionPhase?: AIAdoptionPhase;
  summary: UserDetailsHeaderReadModel;
  onBackToUsers: () => void;
  onCopyUserLogin: () => void;
}

function formatLastActive(daysSinceLastActive: number | null): string {
  if (daysSinceLastActive === null) return 'No activity in report window';
  if (daysSinceLastActive === 0) return 'Active on last report day';
  return `Last active ${daysSinceLastActive} day${daysSinceLastActive === 1 ? '' : 's'} before report end`;
}

function formatSignedCompact(value: number): string {
  return `${value >= 0 ? '+' : '−'}${formatCompactNumber(Math.abs(value))}`;
}

function HeaderStat({ label, value, sub, title }: { label: string; value: ReactNode; sub: ReactNode; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-[#1f2328]">{value}</dd>
      <dd className="mt-0.5 truncate text-xs text-gray-500">{sub}</dd>
    </div>
  );
}

function PhaseLabel({ phase }: { phase?: AIAdoptionPhase }) {
  if (!phase) return <span>No AI adoption phase</span>;
  return (
    <span title={`AI adoption phase ${phase.phase_number}`}>
      P{phase.phase_number} · {formatAiAdoptionPhaseName(phase)}
    </span>
  );
}

export default function UserDetailsHeader({
  userLogin,
  userId,
  aiAdoptionPhase,
  summary,
  onBackToUsers,
  onCopyUserLogin,
}: UserDetailsHeaderProps) {
  const { rank, totalUsers } = summary.interactionRank;
  return (
    <div>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <button
              type="button"
              onClick={onBackToUsers}
              className="text-2xl font-semibold tracking-tight text-[#0969da] hover:underline focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
            >
              users
            </button>
          </li>
          <li aria-hidden="true" className="text-2xl font-semibold tracking-tight text-[#8c959f]">/</li>
          <li aria-current="page">
            <button
              type="button"
              onClick={onCopyUserLogin}
              title="Click to copy username"
              aria-label={`Copy username ${userLogin}`}
              className="group inline-flex items-center gap-2 rounded-sm text-2xl font-semibold tracking-tight text-[#1f2328] transition-colors duration-150 hover:text-indigo-600 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span>{userLogin}</span>
              <svg
                className="h-5 w-5 text-[#636c76] transition-colors duration-150 group-hover:text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
          </li>
        </ol>
      </nav>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span>User ID: {userId}</span>
        <span aria-hidden="true" className="text-gray-300">•</span>
        <PhaseLabel phase={aiAdoptionPhase} />
        <span aria-hidden="true" className="text-gray-300">•</span>
        <span>{formatLastActive(summary.daysSinceLastActive)}</span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-gray-200 bg-white px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
        <HeaderStat
          label="Active days"
          value={<>{summary.daysActive}<span className="text-sm font-normal text-gray-400">/{summary.reportDays}</span></>}
          sub={`${summary.activeDaysPercent}% of report window`}
        />
        <HeaderStat
          label="Interactions"
          value={formatCompactNumber(summary.interactions)}
          sub={totalUsers > 0 ? `Top ${summary.topPercent}% · #${rank} of ${formatNumber(totalUsers)}` : '—'}
          title={`${formatNumber(summary.interactions)} user-initiated interactions`}
        />
        <HeaderStat
          label="Lines changed"
          value={(
            <>
              <span className="text-emerald-600">+{formatCompactNumber(summary.locAdded)}</span>{' '}
              <span className="text-red-600">−{formatCompactNumber(summary.locDeleted)}</span>
            </>
          )}
          sub={`Net ${formatSignedCompact(summary.netLoc)}`}
          title={`${formatNumber(summary.locAdded)} added, ${formatNumber(summary.locDeleted)} deleted`}
        />
        <HeaderStat
          label="AI cost"
          value={formatAiCreditCost(summary.aiCreditsUsed)}
          sub={`${formatCompactNumber(summary.aiCreditsUsed)} credits`}
        />
        <HeaderStat
          label="Primary client"
          value={<span className="text-base">{summary.primaryClient ? formatIDEName(summary.primaryClient) : '—'}</span>}
          sub={`${summary.surfacesUsed} surface${summary.surfacesUsed === 1 ? '' : 's'} used`}
        />
      </dl>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { CopyIcon } from '@primer/octicons-react';
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
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums text-default">{value}</dd>
      <dd className="mt-0.5 truncate text-xs text-muted">{sub}</dd>
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
              className="rounded-sm text-2xl font-semibold tracking-tight text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]"
            >
              users
            </button>
          </li>
          <li aria-hidden="true" className="text-2xl font-semibold tracking-tight text-muted">/</li>
          <li aria-current="page">
            <button
              type="button"
              onClick={onCopyUserLogin}
              title="Click to copy username"
              aria-label={`Copy username ${userLogin}`}
              className="group inline-flex items-center gap-2 rounded-sm text-2xl font-semibold tracking-tight text-default transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]"
            >
              <span>{userLogin}</span>
              <CopyIcon
                size={20}
                className="text-muted transition-colors duration-150 group-hover:text-accent"
                aria-hidden="true"
              />
            </button>
          </li>
        </ol>
      </nav>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>User ID: {userId}</span>
        <span aria-hidden="true" className="text-disabled">•</span>
        <PhaseLabel phase={aiAdoptionPhase} />
        <span aria-hidden="true" className="text-disabled">•</span>
        <span>{formatLastActive(summary.daysSinceLastActive)}</span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-default bg-default px-5 py-4 sm:grid-cols-3 lg:grid-cols-5">
        <HeaderStat
          label="Active days"
          value={<>{summary.daysActive}<span className="text-sm font-normal text-muted">/{summary.reportDays}</span></>}
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
              <span className="text-success">+{formatCompactNumber(summary.locAdded)}</span>{' '}
              <span className="text-danger">−{formatCompactNumber(summary.locDeleted)}</span>
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

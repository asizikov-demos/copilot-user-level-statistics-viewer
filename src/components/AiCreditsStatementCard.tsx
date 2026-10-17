import type { ReactNode } from 'react';
import type { AiCreditsStatement } from '../read-models/aiCreditsStatement';
import { formatAiCreditCost, formatCompactNumber, formatNumber } from '../utils/formatters';

interface AiCreditsStatementCardProps {
  statement: AiCreditsStatement;
}

interface StatementLine {
  label: string;
  detail: ReactNode;
  aux: ReactNode;
  value: string;
}

export default function AiCreditsStatementCard({ statement }: AiCreditsStatementCardProps) {
  const {
    activeUsers,
    usersInPhase,
    activeUserDays,
    avgDaysPerUser,
    totalAiCreditsUsed,
    creditsPerUserDay,
    monthlyCredits,
    creditsPerActiveUser,
    topDecile,
  } = statement;

  const lines: StatementLine[] = [
    {
      label: 'Active users',
      detail: 'Distinct users with activity',
      aux: `${formatNumber(usersInPhase)} in a phase`,
      value: formatNumber(activeUsers),
    },
    {
      label: 'Active user-days',
      detail: 'Sum of days each user was active',
      aux: `${formatNumber(avgDaysPerUser, 1)} days / user`,
      value: formatNumber(activeUserDays),
    },
    {
      label: 'AI credits consumed',
      detail: monthlyCredits.length > 0
        ? monthlyCredits.map(month => `${month.shortLabel} ${formatCompactNumber(Math.round(month.aiCreditsUsed))}`).join(' · ')
        : 'No daily credit data',
      aux: `${formatNumber(creditsPerUserDay, Math.abs(creditsPerUserDay) < 1 ? 2 : 1)} / user-day`,
      value: formatNumber(Math.round(totalAiCreditsUsed)),
    },
    {
      label: 'Cost per active user',
      detail: 'Estimated',
      aux: `${formatAiCreditCost(creditsPerUserDay)} / user-day`,
      value: formatAiCreditCost(creditsPerActiveUser),
    },
  ];

  return (
    <section
      aria-label="AI credits statement"
      className="mt-6 grid overflow-hidden rounded-lg border border-default bg-default lg:grid-cols-[minmax(0,1fr)_300px]"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">AI credits statement for the reporting period</caption>
        <tbody>
          {lines.map(line => (
            <tr key={line.label} className="border-b border-muted">
              <th scope="row" className="py-3 pl-6 text-left align-top font-medium text-default">
                {line.label}
                <small className="mt-px block text-xs font-normal text-muted">{line.detail}</small>
              </th>
              <td className="hidden whitespace-nowrap py-3 pl-4 text-right align-top text-[13px] tabular-nums text-muted sm:table-cell">
                {line.aux}
              </td>
              <td className="whitespace-nowrap py-3 pl-4 pr-6 text-right align-top font-medium tabular-nums text-default">
                {line.value}
              </td>
            </tr>
          ))}
          <tr className="border-t-[3px] border-double border-[var(--fgColor-default)]">
            <th scope="row" className="py-3.5 pl-6 text-left text-[17px] font-bold text-default">Estimated AI spend</th>
            <td className="hidden sm:table-cell" />
            <td className="whitespace-nowrap py-3.5 pl-4 pr-6 text-right text-[17px] font-bold tabular-nums text-default">
              {formatAiCreditCost(totalAiCreditsUsed)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex flex-col justify-between gap-4 border-t border-default bg-muted px-6 py-5 text-[13px] text-muted lg:border-l lg:border-t-0">
        {topDecile ? (
          <div>
            <p>
              <b className="text-default">Top 10% of users</b> (<span className="tabular-nums">{formatNumber(topDecile.userCount)}</span>) consumed{' '}
              <b className="tabular-nums text-default">{Math.round(topDecile.creditsShare)}%</b> of AI credits.
            </p>
            <div aria-hidden="true" className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-[3px]">
              <span className="bg-emphasis" style={{ width: `${Math.min(100, Math.max(0, topDecile.creditsShare))}%` }} />
              <span className="flex-1 bg-[var(--borderColor-default)]" />
            </div>
          </div>
        ) : (
          <p>No AI credit consumption was recorded during the reporting period.</p>
        )}
        <p className="text-xs text-muted">The cost is an estimate at $0.01 per AI credit. It&apos;s not an invoice.</p>
      </div>
    </section>
  );
}

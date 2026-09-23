'use client';

import { useState } from 'react';
import type { OverviewHeaderModel, OverviewWindowDay } from '../../../read-models/overviewHeader';
import { formatAiCreditCost, formatCompactNumber, formatNumber } from '../../../utils/formatters';

interface OverviewHeaderProps {
  model: OverviewHeaderModel;
  enterpriseName: string | null;
}

const BAR_CLASS = {
  weekday: 'bg-[#218bff]',
  weekend: 'bg-[#9ecbff]',
  peak: 'bg-[#0a3069]',
} as const;

const MONTH_GRID_CLASS: Record<number, string> = {
  2: 'md:grid-cols-2 md:divide-y-0 md:divide-x',
  3: 'md:grid-cols-3 md:gap-px md:divide-y-0 md:bg-[#d1d9e0]',
};

function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
}

function formatWindow(start: string, end: string, days: number): string {
  if (!start || !end) return 'No report window';
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const from = formatDay(start, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  const to = formatDay(end, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${from} – ${to} (${days} day${days === 1 ? '' : 's'})`;
}

function barClass(day: OverviewWindowDay): string {
  if (day.isPeak) return BAR_CLASS.peak;
  return day.isWeekend ? BAR_CLASS.weekend : BAR_CLASS.weekday;
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export default function OverviewHeader({ model, enterpriseName }: OverviewHeaderProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const {
    uniqueUsers,
    enterpriseId,
    reportStartDay,
    reportEndDay,
    days,
    billingMonths,
    peakDay,
    typicalWeekdayActiveUsers,
  } = model;

  const title = enterpriseName ?? (enterpriseId ? `Enterprise ${enterpriseId}` : 'Metrics Overview');
  const maxActiveUsers = Math.max(0, ...days.map(day => day.activeUsers));
  const dayCount = days.length;
  const hoveredDay = hoveredIndex !== null ? days[hoveredIndex] : null;
  const monthBoundaries = billingMonths.slice(1).reduce<Array<{ index: number; label: string }>>(
    (acc, month, i) => {
      const previous = acc.length > 0 ? acc[acc.length - 1].index : 0;
      acc.push({ index: previous + billingMonths[i].daysInWindow, label: month.shortLabel });
      return acc;
    },
    []
  );
  const stripSummary = peakDay
    ? `Daily active users from ${reportStartDay} to ${reportEndDay}. Peak of ${formatNumber(peakDay.activeUsers)} on ${formatDay(peakDay.date, { month: 'long', day: 'numeric' })}.`
    : 'No daily activity in the report window.';

  return (
    <header className="rounded-lg border border-[#d1d9e0] bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1f2328]">{title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#59636e]">
            {enterpriseName && enterpriseId && (
              <>
                <span>Enterprise ID <span className="tabular-nums">{enterpriseId}</span></span>
                <span aria-hidden="true" className="text-[#afb8c1]">•</span>
              </>
            )}
            <span>{formatWindow(reportStartDay, reportEndDay, dayCount)}</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-4xl font-bold leading-none tracking-tight tabular-nums text-[#1f2328]">
            {formatNumber(uniqueUsers)}
          </p>
          <p className="mt-1.5 text-sm text-[#59636e]">
            users active in the window
            {typicalWeekdayActiveUsers !== null && (
              <> · <span className="tabular-nums">{formatNumber(typicalWeekdayActiveUsers)}</span> on a typical weekday</>
            )}
          </p>
        </div>
      </div>

      {dayCount > 0 && (
        <div className="mt-6">
          <div className="relative" onMouseLeave={() => setHoveredIndex(null)}>
            <div
              role="img"
              aria-label={stripSummary}
              className="grid h-24 items-end gap-px sm:gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
            >
              {days.map((day, index) => (
                <div
                  key={day.date}
                  className="flex h-full items-end rounded-sm hover:bg-[#f6f8fa]"
                  onMouseEnter={() => setHoveredIndex(index)}
                >
                  <div
                    className={`w-full rounded-t-[3px] rounded-b-[1px] ${day.activeUsers > 0 ? barClass(day) : 'bg-[#d8dee4]'}`}
                    style={{ height: day.activeUsers > 0 && maxActiveUsers > 0 ? `${Math.max(4, (day.activeUsers / maxActiveUsers) * 100)}%` : '2px' }}
                  />
                </div>
              ))}
            </div>

            <ul className="sr-only" aria-label="Daily activity">
              {days.map(day => (
                <li key={day.date}>
                  {formatDay(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}: {formatNumber(day.activeUsers)} active users, {formatNumber(Math.round(day.aiCreditsUsed))} AI credits, {formatNumber(day.locAdded + day.locDeleted)} lines changed
                </li>
              ))}
            </ul>

            {monthBoundaries.map(boundary => (
              <div
                key={boundary.index}
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 -bottom-5 border-l-[1.5px] border-dashed border-[#59636e]"
                style={{ left: `${(boundary.index / dayCount) * 100}%` }}
              >
                <span className={`absolute -top-0.5 ${boundary.index / dayCount > 0.5 ? 'right-1.5' : 'left-1.5'} hidden whitespace-nowrap bg-white px-1 text-[11px] text-[#59636e] sm:inline`}>
                  {boundary.label} billing starts
                </span>
              </div>
            ))}

            {hoveredDay && hoveredIndex !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1f2328] px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
                style={{ left: `clamp(80px, ${((hoveredIndex + 0.5) / dayCount) * 100}%, calc(100% - 80px))` }}
              >
                <div className="font-semibold">{formatDay(hoveredDay.date, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div>{formatNumber(hoveredDay.activeUsers)} active users · {percentOf(hoveredDay.activeUsers, uniqueUsers)}%</div>
                <div>{formatCompactNumber(Math.round(hoveredDay.aiCreditsUsed))} AI credits</div>
                <div>
                  {formatCompactNumber(hoveredDay.locAdded + hoveredDay.locDeleted)} lines changed · +{formatCompactNumber(hoveredDay.locAdded)} / −{formatCompactNumber(hoveredDay.locDeleted)}
                </div>
              </div>
            )}
          </div>

          <div
            aria-hidden="true"
            className="mt-1.5 grid gap-px text-center text-[10px] tabular-nums sm:gap-[3px] sm:text-[11px]"
            style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
          >
            {days.map((day, index) => (
              <span
                key={day.date}
                className={`${day.isWeekend ? 'text-[#afb8c1]' : 'text-[#6e7781]'} ${index % 2 === 1 ? 'invisible sm:visible' : ''}`}
              >
                {Number(day.date.slice(8, 10))}
              </span>
            ))}
          </div>

          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#59636e]">
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${BAR_CLASS.weekday}`} />Weekday active users</li>
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${BAR_CLASS.weekend}`} />Weekend</li>
            {peakDay && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${BAR_CLASS.peak}`} />
                Peak · {formatNumber(peakDay.activeUsers)} on {formatDay(peakDay.date, { month: 'short', day: 'numeric' })}
              </li>
            )}
          </ul>

          <div
            className={`mt-4 grid grid-cols-1 overflow-hidden rounded-lg border border-[#d1d9e0] divide-y divide-[#d1d9e0] ${MONTH_GRID_CLASS[Math.min(billingMonths.length, 3)] ?? ''}`}
          >
            {billingMonths.map(month => (
              <section key={month.key} className="min-w-0 bg-white px-4 py-3" aria-label={`${month.label} billing month`}>
                <h3 className="flex flex-wrap justify-between gap-2 text-[13px] font-semibold text-[#1f2328]">
                  {month.label}
                  <span className="font-normal text-[#59636e]">
                    {month.daysInWindow} day{month.daysInWindow === 1 ? '' : 's'} in window
                  </span>
                </h3>
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <dt className="text-xs text-[#59636e]">Avg daily active</dt>
                    <dd className="text-base font-semibold tabular-nums text-[#1f2328]">{formatNumber(month.avgDailyActiveUsers)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#59636e]">AI credits</dt>
                    <dd className="text-base font-semibold tabular-nums text-[#1f2328]" title={formatNumber(Math.round(month.aiCreditsUsed))}>
                      {formatCompactNumber(Math.round(month.aiCreditsUsed))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#59636e]">Est. cost</dt>
                    <dd className="text-base font-semibold tabular-nums text-[#1f2328]">{formatAiCreditCost(month.aiCreditsUsed)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#59636e]">Lines changed</dt>
                    <dd
                      className="flex items-baseline gap-2 tabular-nums"
                      title={`${formatNumber(month.locAdded)} added, ${formatNumber(month.locDeleted)} deleted`}
                    >
                      <span className="text-base font-semibold text-[#1f2328]">
                        {formatCompactNumber(month.locAdded + month.locDeleted)}
                      </span>
                      <span className="text-xs">
                        <span className="text-[#1a7f37]">+{formatCompactNumber(month.locAdded)}</span>{' '}
                        <span className="text-[#cf222e]">−{formatCompactNumber(month.locDeleted)}</span>
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

'use client';

import { useState } from 'react';
import type { ExecutiveSummaryReadModel } from '../read-models/overview';
import { formatDate, formatNumber, formatSignedNumber } from '../utils/formatters';
import ParticipationChart from './features/executive-summary/ParticipationChart';
import styles from './features/executive-summary/ExecutiveSummary.module.css';

interface ExecutiveSummaryViewProps {
  model: ExecutiveSummaryReadModel;
  enterpriseName: string | null;
  dataWarning?: string | null;
}

const FEATURES = [
  { key: 'completionUsers', label: 'Code completion' },
  { key: 'agentModeUsers', label: 'IDE Agent Mode' },
  { key: 'cliUsers', label: 'Copilot CLI' },
  { key: 'codingAgentUsers', label: 'Cloud Agent' },
  { key: 'codeReviewUsers', label: 'Code Review' },
] as const;

function displayDate(date: string): string {
  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function displayRatio(value: number | null): string {
  return value === null ? 'N/A' : formatNumber(value, 1);
}

function displayCredits(value: number): string {
  return value !== 0 && Math.abs(value) < 0.01
    ? value.toLocaleString('en-US', { maximumSignificantDigits: 3 })
    : formatNumber(value, 2);
}

export default function ExecutiveSummaryView({ model, enterpriseName, dataWarning }: ExecutiveSummaryViewProps) {
  const [paper, setPaper] = useState<'a4' | 'letter'>('a4');
  const { summary, featureAdoptionData, enterpriseId } = model;
  const {
    observedUsers, calendarDays, reportedDays, averageDaysPerUser, medianDaysPerUser,
    totalAiCreditsUsed, creditsPerUserDay, topDecile, hasNegativeUserCredits,
  } = summary;
  const completionOnlyUsers = featureAdoptionData.completionOnlyUsers;
  const generatedOn = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const enterprise = enterpriseName ?? enterpriseId ?? 'N/A';
  const share = (users: number) => observedUsers > 0 ? (users / observedUsers) * 100 : 0;

  return (
    <div className={styles.brief}>
      <div className={styles.toolbar}>
        <div>
          <h1>Executive Summary</h1>
          <p>A printable leadership brief from your uploaded metrics.</p>
        </div>
        <div className={styles.controls}>
          <label htmlFor="summary-paper">Paper</label>
          <select
            id="summary-paper"
            value={paper}
            onChange={event => setPaper(event.target.value === 'letter' ? 'letter' : 'a4')}
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
          <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <article className={`${styles.report} ${paper === 'letter' ? styles.letter : ''}`} aria-label="Leadership Brief">
        <div className={styles.identity}>
          <div>
            <span className={styles.organization}>Enterprise: {enterprise}</span>
            {enterpriseName !== null && enterpriseId !== null && (
              <span className={styles.enterpriseId}>ID: {enterpriseId}</span>
            )}
          </div>
          <div className={styles.reportMeta}>
            {summary.observedStartDay
              ? <>{displayDate(summary.observedStartDay)} &ndash; {displayDate(summary.observedEndDay)}<br />Observed activity window</>
              : 'No observed activity window'}
          </div>
        </div>

        <header className={styles.heading}>
          <h2>GitHub Copilot, in perspective.</h2>
          <p>Participation, patterns of use, and resource consumption.</p>
        </header>

        {observedUsers === 0 ? (
          <p className={styles.empty}>No activity records are available for this summary.</p>
        ) : (
          <>
            <p className={styles.lead}>
              <strong>{formatNumber(observedUsers)} {observedUsers === 1 ? 'person appears' : 'people appear'}</strong> in this window.
              {' '}The median user has activity records on <strong>{displayRatio(medianDaysPerUser)} of {formatNumber(calendarDays)} days.</strong>
            </p>

            <dl className={styles.metrics}>
              <div>
                <dt>Observed users</dt>
                <dd>{formatNumber(observedUsers)}<p>Distinct users in the uploaded data</p></dd>
              </div>
              <div>
                <dt>Days active / user</dt>
                <dd>{displayRatio(averageDaysPerUser)}<p>Mean days with activity records</p></dd>
              </div>
              <div>
                <dt>AI credits</dt>
                <dd>{displayCredits(totalAiCreditsUsed)}<p>{creditsPerUserDay === null ? 'N/A' : displayCredits(creditsPerUserDay)} per recorded user-day</p></dd>
              </div>
            </dl>

            <section className={styles.section} aria-labelledby="brief-participation">
              <h3 id="brief-participation">Participation across the window</h3>
              <p className={styles.caption}>
                Daily observed users
                {summary.weekdayAverage !== null && <> &middot; Mean on reported weekdays: {formatNumber(summary.weekdayAverage, 1)}</>}
              </p>
              <ParticipationChart summary={summary} />
            </section>

            <div className={styles.columns}>
              <section className={styles.section} aria-labelledby="brief-features">
                <h3 id="brief-features">How people use Copilot</h3>
                <p className={styles.caption}>Selected features &middot; overlapping populations</p>
                <ul className={styles.features}>
                  {FEATURES.map(({ key, label }) => {
                    const count = featureAdoptionData[key];
                    return (
                      <li key={key}>
                        <span>{label}</span>
                        <span className={styles.track} aria-hidden="true">
                          <span style={{ width: `${share(count)}%` }} />
                        </span>
                        <span className={styles.featureValue}>{formatNumber(count)} <small>({formatNumber(share(count), 1)}%)</small></span>
                      </li>
                    );
                  })}
                </ul>
                <p className={styles.note}>Percentages use all {formatNumber(observedUsers)} observed users, not licensed seats.</p>
              </section>

              <section className={`${styles.section} ${styles.concentration}`} aria-labelledby="brief-concentration">
                <h3 id="brief-concentration">What deserves a closer look</h3>
                {topDecile !== null ? (
                  <>
                    <p className={styles.concentrationValue}>{formatNumber(topDecile.creditsShare, 1)}%</p>
                    <p>of AI credits came from the highest-consuming 10% of users.</p>
                    <p className={styles.note}>{formatNumber(topDecile.userCount)} of {formatNumber(observedUsers)} users, rounded up to a whole user. Concentration is not evidence of waste.</p>
                  </>
                ) : (
                  <>
                    <p className={styles.unavailable}>Concentration unavailable</p>
                    <p className={styles.note}>
                      {hasNegativeUserCredits
                        ? 'Negative per-user credit totals make a parts-of-a-whole share misleading. Signed credit totals are preserved above.'
                        : 'A positive credit total is needed to calculate a consumption share.'}
                    </p>
                  </>
                )}
                <p className={styles.note}>{formatNumber(completionOnlyUsers)} users used completion only. This describes a usage pattern, not an adoption failure.</p>
              </section>
            </div>

            <section className={styles.code} aria-labelledby="brief-code">
              <h3 id="brief-code">Recorded code changes</h3>
              <dl>
                <div><dt>Added</dt><dd>{formatSignedNumber(summary.locAdded)}</dd></div>
                <div><dt>Deleted</dt><dd>{formatNumber(summary.locDeleted)}</dd></div>
                <div><dt>Net change</dt><dd>{formatSignedNumber(summary.locAdded - summary.locDeleted)}</dd></div>
              </dl>
              <p className={styles.caption}>Uploaded user-day LOC totals, not shipped code or measured productivity. Deletions are subtracted to calculate net change.</p>
            </section>

            <section className={styles.discussion} aria-labelledby="brief-discussion">
              <h3 id="brief-discussion">Suggested discussion</h3>
              <p>
                {completionOnlyUsers > 0
                  ? 'Explore the tasks and constraints of completion-only users before prescribing more usage. '
                  : 'Explore which workflows people return to before setting adoption targets. '}
                {topDecile !== null
                  ? 'Pair this with interviews about high-consumption workflows to understand differences in tasks and context.'
                  : 'Use qualitative feedback alongside the recorded activity; credit data alone cannot establish value.'}
              </p>
            </section>
          </>
        )}

        <footer className={styles.footer}>
          {dataWarning && <p className={styles.dataWarning}><strong>Upload limitation:</strong> {dataWarning}</p>}
          <p>
            Scope: {formatNumber(observedUsers)} observed users &middot; {formatNumber(reportedDays)} dates with records
            {calendarDays > 0 && <> across {formatNumber(calendarDays)} calendar days</>}.
            {reportedDays < calendarDays && ' Gaps have no uploaded records; they are not confirmed inactivity.'}
          </p>
          <p>Not a license-utilization measure. Activity does not establish productivity, quality, or business outcomes. AI credits are not currency; unreported credit values are imported as zero.</p>
          <div><span>GitHub Copilot &middot; Leadership Brief</span><span>Generated {generatedOn}</span></div>
        </footer>
      </article>
    </div>
  );
}

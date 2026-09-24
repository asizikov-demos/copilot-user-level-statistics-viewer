import type { ExecutiveSummaryReadModel } from '../../../read-models/overview';
import { formatDate, formatNumber } from '../../../utils/formatters';
import styles from './ExecutiveSummary.module.css';

interface ParticipationChartProps {
  summary: ExecutiveSummaryReadModel['summary'];
}

const WIDTH = 700;
const HEIGHT = 160;
const LEFT = 44;
const TOP = 18;
const BASELINE = 130;
const PLOT_WIDTH = WIDTH - LEFT - 12;

function shortDate(date: string): string {
  return formatDate(date, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function ParticipationChart({ summary }: ParticipationChartProps) {
  const { participation, peakDailyUsers, calendarDays, observedStartDay, observedEndDay } = summary;
  if (participation.length === 0 || calendarDays === 0) {
    return <p className={styles.caption}>No daily participation data available.</p>;
  }
  const scale = Math.max(1, peakDailyUsers);
  const step = PLOT_WIDTH / calendarDays;

  return (
    <>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Daily observed users from ${observedStartDay} to ${observedEndDay}. Peak: ${formatNumber(peakDailyUsers)} users.`}
      >
        {[0, scale].map(value => {
          const y = BASELINE - (value / scale) * (BASELINE - TOP);
          return (
            <g key={value}>
              <line x1={LEFT} x2={WIDTH} y1={y} y2={y} className={styles.gridLine} />
              <text x={LEFT - 7} y={y + 4} textAnchor="end">{formatNumber(value)}</text>
            </g>
          );
        })}
        {participation.map(day => {
          const height = (day.users / scale) * (BASELINE - TOP);
          return (
            <rect
              key={day.date}
              x={LEFT + day.dayOffset * step + step * 0.1}
              y={BASELINE - height}
              width={step * 0.8}
              height={height}
              className={day.isWeekend ? styles.weekendBar : styles.weekdayBar}
            >
              <title>{shortDate(day.date)}: {formatNumber(day.users)} observed users</title>
            </rect>
          );
        })}
        <text x={LEFT} y={HEIGHT - 6}>{shortDate(observedStartDay)}</text>
        {observedStartDay !== observedEndDay && (
          <text x={WIDTH - 2} y={HEIGHT - 6} textAnchor="end">{shortDate(observedEndDay)}</text>
        )}
      </svg>
      <div className={styles.legend}>
        <span><i className={styles.weekdaySwatch} aria-hidden="true" />Weekday</span>
        <span><i className={styles.weekendSwatch} aria-hidden="true" />Weekend</span>
        <span>Peak: {formatNumber(peakDailyUsers)} users</span>
      </div>
    </>
  );
}

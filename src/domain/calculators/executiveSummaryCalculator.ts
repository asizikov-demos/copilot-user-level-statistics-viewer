import type { UserSummary } from '../../types/metrics';
import type { DailyEngagementData } from './engagementCalculator';
import { computeCreditConcentration, type AiCreditsConcentration } from './aiCreditsCalculator';
import { compareByDateAsc } from './statsCalculators';

export interface ExecutiveParticipationDay {
  date: string;
  users: number;
  dayOffset: number;
  isWeekend: boolean;
}

export interface ExecutiveSummaryMetrics {
  observedStartDay: string;
  observedEndDay: string;
  calendarDays: number;
  reportedDays: number;
  observedUsers: number;
  activeUserDays: number;
  averageDaysPerUser: number | null;
  medianDaysPerUser: number | null;
  weekdayAverage: number | null;
  totalAiCreditsUsed: number;
  creditsPerUserDay: number | null;
  topDecile: AiCreditsConcentration | null;
  hasNegativeUserCredits: boolean;
  locAdded: number;
  locDeleted: number;
  participation: ExecutiveParticipationDay[];
  peakDailyUsers: number;
}

const DAY_MS = 86_400_000;

export function computeExecutiveSummary(
  users: UserSummary[],
  engagement: DailyEngagementData[]
): ExecutiveSummaryMetrics {
  const days = [...engagement].sort(compareByDateAsc);
  const observedStartDay = days[0]?.date ?? '';
  const observedEndDay = days.at(-1)?.date ?? '';
  const start = observedStartDay ? Date.parse(`${observedStartDay}T00:00:00Z`) : 0;
  const end = observedEndDay ? Date.parse(`${observedEndDay}T00:00:00Z`) : 0;
  const calendarDays = days.length > 0 ? Math.round((end - start) / DAY_MS) + 1 : 0;
  const activeDays = users.map(user => user.days_active).sort((a, b) => a - b);
  const activeUserDays = activeDays.reduce((total, count) => total + count, 0);
  const middle = Math.floor(activeDays.length / 2);
  const medianDaysPerUser = activeDays.length === 0
    ? null
    : activeDays.length % 2 === 0
      ? (activeDays[middle - 1] + activeDays[middle]) / 2
      : activeDays[middle];
  const userCredits = users.map(user => user.total_ai_credits_used);
  const totalAiCreditsUsed = userCredits.reduce((total, credits) => total + credits, 0);
  const hasNegativeUserCredits = userCredits.some(credits => credits < 0);
  let weekdayUsers = 0;
  let weekdays = 0;
  let peakDailyUsers = 0;
  const participation = days.map(day => {
    const date = new Date(`${day.date}T00:00:00Z`);
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    if (!isWeekend) {
      weekdayUsers += day.activeUsers;
      weekdays++;
    }
    peakDailyUsers = Math.max(peakDailyUsers, day.activeUsers);
    return {
      date: day.date,
      users: day.activeUsers,
      dayOffset: Math.round((date.getTime() - start) / DAY_MS),
      isWeekend,
    };
  });

  return {
    observedStartDay,
    observedEndDay,
    calendarDays,
    reportedDays: days.length,
    observedUsers: users.length,
    activeUserDays,
    averageDaysPerUser: users.length > 0 ? activeUserDays / users.length : null,
    medianDaysPerUser,
    weekdayAverage: weekdays > 0 ? weekdayUsers / weekdays : null,
    totalAiCreditsUsed,
    creditsPerUserDay: activeUserDays > 0 ? totalAiCreditsUsed / activeUserDays : null,
    // A signed net total is not a meaningful parts-of-a-whole denominator.
    topDecile: hasNegativeUserCredits ? null : computeCreditConcentration(userCredits, totalAiCreditsUsed),
    hasNegativeUserCredits,
    locAdded: users.reduce((total, user) => total + user.total_loc_added, 0),
    locDeleted: users.reduce((total, user) => total + user.total_loc_deleted, 0),
    participation,
    peakDailyUsers,
  };
}

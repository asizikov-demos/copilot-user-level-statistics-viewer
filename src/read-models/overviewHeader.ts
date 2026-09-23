import type { DailyAiCreditsData, DailyEngagementData, ModeImpactData } from '../domain/calculators';
import { generateDateRange } from '../utils/formatters';

export interface OverviewWindowDay {
  date: string;
  activeUsers: number;
  aiCreditsUsed: number;
  locAdded: number;
  locDeleted: number;
  isWeekend: boolean;
  isPeak: boolean;
}

export interface OverviewBillingMonth {
  key: string;
  label: string;
  shortLabel: string;
  daysInWindow: number;
  avgDailyActiveUsers: number;
  aiCreditsUsed: number;
  locAdded: number;
  locDeleted: number;
}

export interface OverviewHeaderModel {
  uniqueUsers: number;
  enterpriseId: string | null;
  reportStartDay: string;
  reportEndDay: string;
  days: OverviewWindowDay[];
  billingMonths: OverviewBillingMonth[];
  peakDay: OverviewWindowDay | null;
  typicalWeekdayActiveUsers: number | null;
}

interface OverviewHeaderInput {
  uniqueUsers: number;
  enterpriseId: string | null;
  reportStartDay: string;
  reportEndDay: string;
  engagementData: DailyEngagementData[];
  dailyAiCreditsData: DailyAiCreditsData[];
  dailyLocData: ModeImpactData[];
}

function parseUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function averageOfActiveDays(days: OverviewWindowDay[]): number | null {
  const activeDays = days.filter(day => day.activeUsers > 0);
  if (activeDays.length === 0) return null;
  const total = activeDays.reduce((sum, day) => sum + day.activeUsers, 0);
  return Math.round(total / activeDays.length);
}

function resolveWindowDates(input: OverviewHeaderInput): string[] {
  const bounds: string[] = [];
  if (input.reportStartDay) bounds.push(input.reportStartDay);
  if (input.reportEndDay) bounds.push(input.reportEndDay);
  for (const series of [input.engagementData, input.dailyAiCreditsData, input.dailyLocData]) {
    for (const entry of series) bounds.push(entry.date);
  }
  if (bounds.length === 0) return [];
  bounds.sort();
  return generateDateRange(bounds[0], bounds[bounds.length - 1]);
}

export function buildOverviewHeaderModel(input: OverviewHeaderInput): OverviewHeaderModel {
  const activeUsersByDate = new Map(input.engagementData.map(entry => [entry.date, entry.activeUsers]));
  const creditsByDate = new Map(input.dailyAiCreditsData.map(entry => [entry.date, entry.aiCreditsUsed]));
  const locByDate = new Map(input.dailyLocData.map(entry => [entry.date, entry]));

  const days: OverviewWindowDay[] = resolveWindowDates(input).map(date => {
    const weekday = parseUtcDate(date).getUTCDay();
    return {
      date,
      activeUsers: activeUsersByDate.get(date) ?? 0,
      aiCreditsUsed: creditsByDate.get(date) ?? 0,
      locAdded: locByDate.get(date)?.locAdded ?? 0,
      locDeleted: locByDate.get(date)?.locDeleted ?? 0,
      isWeekend: weekday === 0 || weekday === 6,
      isPeak: false,
    };
  });

  let peakDay: OverviewWindowDay | null = null;
  for (const day of days) {
    if (day.activeUsers > 0 && (!peakDay || day.activeUsers > peakDay.activeUsers)) {
      peakDay = day;
    }
  }
  if (peakDay) peakDay.isPeak = true;

  const monthDays = new Map<string, OverviewWindowDay[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const bucket = monthDays.get(key);
    if (bucket) bucket.push(day);
    else monthDays.set(key, [day]);
  }

  const billingMonths: OverviewBillingMonth[] = Array.from(monthDays, ([key, bucket]) => {
    const monthDate = parseUtcDate(`${key}-01`);
    return {
      key,
      label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      shortLabel: monthDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      daysInWindow: bucket.length,
      avgDailyActiveUsers: averageOfActiveDays(bucket) ?? 0,
      aiCreditsUsed: bucket.reduce((sum, day) => sum + day.aiCreditsUsed, 0),
      locAdded: bucket.reduce((sum, day) => sum + day.locAdded, 0),
      locDeleted: bucket.reduce((sum, day) => sum + day.locDeleted, 0),
    };
  });

  return {
    uniqueUsers: input.uniqueUsers,
    enterpriseId: input.enterpriseId,
    reportStartDay: days[0]?.date ?? input.reportStartDay,
    reportEndDay: days[days.length - 1]?.date ?? input.reportEndDay,
    days,
    billingMonths,
    peakDay,
    typicalWeekdayActiveUsers: averageOfActiveDays(days.filter(day => !day.isWeekend)),
  };
}

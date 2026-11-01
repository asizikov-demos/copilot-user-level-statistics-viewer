import type { UserDayData } from '../../types/metrics';

export interface ActivityCalendarData {
  daily: { day: string; level: number }[];
  activeDays: number;
}

export function computeActivityCalendar(days: UserDayData[]): ActivityCalendarData {
  const byDay = new Map<string, { legacyScore: number; hasClientActivity: boolean }>();
  for (const day of days) {
    const previous = byDay.get(day.day);
    const legacyScore = day.user_initiated_interaction_count
      + day.code_generation_activity_count
      + day.code_acceptance_activity_count
      + (day.totals_by_cli?.prompt_count ?? 0);
    const hasClientActivity = (day.totals_by_client ?? []).some(client =>
      client.request_count > 0 || client.session_count > 0
      || client.token_usage.prompt_tokens_sum > 0 || client.token_usage.output_tokens_sum > 0);
    byDay.set(day.day, {
      legacyScore: (previous?.legacyScore ?? 0) + legacyScore,
      hasClientActivity: (previous?.hasClientActivity ?? false) || hasClientActivity,
    });
  }

  const maxLegacyScore = Array.from(byDay.values()).reduce(
    (max, day) => Math.max(max, day.legacyScore), 0,
  );
  const daily = Array.from(byDay, ([day, activity]) => {
    const legacyLevel = activity.legacyScore > 0 && maxLegacyScore > 0
      ? Math.min(4, Math.max(1, Math.ceil(
        Math.log(activity.legacyScore + 1) / Math.log(maxLegacyScore + 1) * 4,
      )))
      : 0;
    return { day, level: Math.max(legacyLevel, activity.hasClientActivity ? 1 : 0) };
  }).sort((a, b) => a.day.localeCompare(b.day));
  return { daily, activeDays: daily.filter(day => day.level > 0).length };
}

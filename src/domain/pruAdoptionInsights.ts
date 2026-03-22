export const MODEL_COMPARISON_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/ai-models/model-comparison';
export const ENABLE_PREMIUM_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-organization/manage-policies#enabling-or-disabling-third-party-coding-agents-in-your-repositories';
export const PREMIUM_REQUESTS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/billing/concepts/product-billing/github-copilot-premium-requests#paying-for-premium-requests';

export interface PruAdoptionInsight {
  title: string;
  variant: 'green' | 'blue' | 'orange';
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface DailyModelUsageEntry {
  date: string;
  pruModels: number;
  standardModels: number;
  unknownModels: number;
}

/**
 * Pure predicate: returns true when standard models account for ≥50% of
 * requests in the last 7 days of the most recent billing-period boundary
 * contained in the data range. Returns false if the range does not cross a
 * month boundary or if there is no usage in that window.
 */
export function detectsEndOfMonthStandardDominance(data: DailyModelUsageEntry[]): boolean {
  if (data.length === 0) return false;

  const dates = data.map(d => d.date).sort();
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const firstOfMonths = findFirstOfMonthsInRange(rangeStart, rangeEnd);
  if (firstOfMonths.length === 0) return false;

  const billingBoundary = firstOfMonths[firstOfMonths.length - 1];
  const lastWeek = getLastWeekOfPreviousMonth(billingBoundary);

  const windowData = data.filter(d => d.date >= lastWeek.start && d.date <= lastWeek.end);
  if (windowData.length === 0) return false;

  const totalStandard = windowData.reduce((s, d) => s + d.standardModels, 0);
  const totalAll = windowData.reduce((s, d) => s + d.pruModels + d.standardModels + d.unknownModels, 0);
  if (totalAll === 0) return false;

  return (totalStandard / totalAll) * 100 >= 50;
}

/**
 * Returns a chart insight when standard models dominate usage in the last week
 * of a billing period, which may signal premium quota exhaustion.
 */
export function computeBillingCycleInsight(
  data: DailyModelUsageEntry[],
): PruAdoptionInsight | null {
  if (!detectsEndOfMonthStandardDominance(data)) return null;

  const dates = data.map(d => d.date).sort();
  const firstOfMonths = findFirstOfMonthsInRange(dates[0], dates[dates.length - 1]);
  const billingBoundary = firstOfMonths[firstOfMonths.length - 1];
  const lastWeek = getLastWeekOfPreviousMonth(billingBoundary);
  const windowData = data.filter(d => d.date >= lastWeek.start && d.date <= lastWeek.end);
  const totalStandard = windowData.reduce((s, d) => s + d.standardModels, 0);
  const totalAll = windowData.reduce((s, d) => s + d.pruModels + d.standardModels + d.unknownModels, 0);
  const standardPct = Math.round((totalStandard / totalAll) * 100);

  return {
    title: 'End-of-Month Premium Quota',
    variant: 'orange',
    message: `Standard models dominated (${standardPct}%) in the last week of the billing period, suggesting the user may be exhausting their premium request allowance. Consider upgrading to Copilot Enterprise or enabling per-request billing.`,
    ctaLabel: 'Learn about premium request billing →',
    ctaHref: PREMIUM_REQUESTS_URL,
  };
}

/** Find all YYYY-MM-01 dates that fall within [rangeStart, rangeEnd]. */
export function findFirstOfMonthsInRange(rangeStart: string, rangeEnd: string): string[] {
  const result: string[] = [];
  const start = new Date(rangeStart + 'T00:00:00Z');
  const end = new Date(rangeEnd + 'T00:00:00Z');

  // Move to the first day of the month after start (or start itself if it's the 1st)
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  if (cursor < start) {
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return result;
}

/** Given a first-of-month date, return the last 7 days of the previous month. */
export function getLastWeekOfPreviousMonth(firstOfMonth: string): { start: string; end: string } {
  const d = new Date(firstOfMonth + 'T00:00:00Z');
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)); // last day of prev month
  const startDay = new Date(Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate() - 6));
  return {
    start: startDay.toISOString().slice(0, 10),
    end: lastDay.toISOString().slice(0, 10),
  };
}

export function computePruAdoptionInsight(
  pruRequests: number,
  standardRequests: number,
  unknownRequests: number,
): PruAdoptionInsight {
  const total = pruRequests + standardRequests + unknownRequests;
  const pruPercentage = total > 0 ? (pruRequests / total) * 100 : 0;

  if (pruPercentage >= 90) {
    return {
      title: 'Premium Model Adoption',
      variant: 'green',
      message: 'Power user profile: primarily using premium models for best performance in agentic workflows.',
    };
  }

  if (pruPercentage >= 70) {
    return {
      title: 'Premium Model Adoption',
      variant: 'blue',
      message: 'Well-optimized balance between premium and standard models.',
    };
  }

  if (pruPercentage === 0) {
    return {
      title: 'Premium Model Adoption',
      variant: 'orange',
      message: 'No premium model usage detected. Consider enabling premium models for better developer experience and ROI.',
      ctaLabel: 'Learn more about enabling premium models →',
      ctaHref: ENABLE_PREMIUM_URL,
    };
  }

  return {
    title: 'Premium Model Adoption',
    variant: 'orange',
    message: `Premium models are underutilized (${Math.round(pruPercentage)}% of requests). Consider educating this user about premium models for better developer experience and ROI.`,
    ctaLabel: 'Compare available AI models →',
    ctaHref: MODEL_COMPARISON_URL,
  };
}

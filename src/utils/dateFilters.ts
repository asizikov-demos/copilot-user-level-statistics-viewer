import { CopilotMetrics } from '../types/metrics';
import { DateRangeFilter } from '../types/filters';

export function filterMetricsByDateRange(
  metrics: CopilotMetrics[], 
  filter: DateRangeFilter,
  reportEndDay: string
): CopilotMetrics[] {
  if (filter === 'all' || metrics.length === 0) {
    return metrics;
  }

  const endDate = new Date(reportEndDay);
  let startDate: Date;

  switch (filter) {
    case 'last7days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 days including end date
      break;
    case 'last14days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 13); // 14 days including end date
      break;
    case 'last28days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 27); // 28 days including end date
      break;
    default:
      return metrics;
  }

  // Filter metrics where the day falls within the date range
  return metrics.filter(metric => {
    const metricDate = new Date(metric.day);
    return metricDate >= startDate && metricDate <= endDate;
  });
}

export function getFilteredDateRange(
  filter: DateRangeFilter,
  reportStartDay: string,
  reportEndDay: string
): { startDay: string; endDay: string } {
  if (filter === 'all') {
    return { startDay: reportStartDay, endDay: reportEndDay };
  }

  const endDate = new Date(reportEndDay);
  let startDate: Date;

  switch (filter) {
    case 'last7days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'last14days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 13);
      break;
    case 'last28days':
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 27);
      break;
    default:
      return { startDay: reportStartDay, endDay: reportEndDay };
  }

  return {
    startDay: startDate.toISOString().split('T')[0],
    endDay: reportEndDay
  };
}

'use client';

import type { UserDayData } from '../../types/metrics';
import { formatShortDate } from '../../utils/formatters';

interface ActivityCalendarProps {
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  title?: string;
  activeDaysCount?: number;
  onDayClick: (date: string, dayData?: UserDayData) => void;
}

export default function ActivityCalendar({ days, reportStartDay, reportEndDay, title = 'Activity Calendar', activeDaysCount, onDayClick }: ActivityCalendarProps) {
  const startDate = new Date(reportStartDay);
  const endDate = new Date(reportEndDay);

  const spansMultipleYears = startDate.getUTCFullYear() !== endDate.getUTCFullYear();
  const monthNameOptions: Intl.DateTimeFormatOptions = spansMultipleYears
    ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { month: 'long', timeZone: 'UTC' };
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth();
  const monthLabel = sameMonth
    ? startDate.toLocaleDateString('en-US', monthNameOptions)
    : `${startDate.toLocaleDateString('en-US', monthNameOptions)} – ${endDate.toLocaleDateString('en-US', monthNameOptions)}`;

  const metricsMap = new Map<string, UserDayData>();
  days.forEach(day => {
    metricsMap.set(day.day, day);
  });

  const generateDateGrid = () => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    
    return dates;
  };

  const allDates = generateDateGrid();
  const mondayIndex = (date: Date) => (date.getDay() + 6) % 7;

  const groupDatesByWeek = (dates: Date[]) => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    dates.forEach((date, index) => {
      if (index === 0) {
        const dayOfWeek = mondayIndex(date);
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(new Date(0));
        }
      }
      
      currentWeek.push(date);
      
      if (currentWeek.length === 7 || index === dates.length - 1) {
        while (currentWeek.length < 7) {
          currentWeek.push(new Date(0));
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const weeks = groupDatesByWeek(allDates);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthKey = (date: Date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  const orderedMonths = Array.from(new Set(allDates.map(monthKey)));
  const hasMultipleMonths = orderedMonths.length > 1;
  const monthTints = [
    'bg-slate-50',
    'bg-sky-50',
    'bg-amber-50',
    'bg-rose-50',
    'bg-emerald-50',
    'bg-violet-50',
  ];
  const getMonthTint = (date: Date) => {
    if (!hasMultipleMonths || date.getTime() === 0) return 'bg-transparent';
    const index = orderedMonths.indexOf(monthKey(date));
    return monthTints[index % monthTints.length];
  };
  
  const formatDateKey = (date: Date) => {
    if (date.getTime() === 0) return ''; // Placeholder date
    return date.toISOString().split('T')[0];
  };

  const getDayTotal = (metrics: UserDayData) =>
    metrics.user_initiated_interaction_count +
    metrics.code_generation_activity_count +
    metrics.code_acceptance_activity_count +
    (metrics.totals_by_cli?.prompt_count ?? 0);

  // Color intensity is relative to this user's busiest day, on a log scale so
  // that large ranges (e.g. 900 vs 10000) still map to distinct shades.
  const maxDailyTotal = days.reduce((max, day) => Math.max(max, getDayTotal(day)), 0);

  const getActivityLevel = (dateKey: string) => {
    const metrics = metricsMap.get(dateKey);
    if (!metrics) return 0;

    const totalActivity = getDayTotal(metrics);
    if (totalActivity <= 0 || maxDailyTotal <= 0) return 0;

    const ratio = Math.log(totalActivity + 1) / Math.log(maxDailyTotal + 1);
    return Math.min(4, Math.max(1, Math.ceil(ratio * 4)));
  };

  const getActivityColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-green-100 hover:bg-green-200';
      case 1: return 'bg-green-200 hover:bg-green-300';
      case 2: return 'bg-green-400 hover:bg-green-500';
      case 3: return 'bg-green-600 hover:bg-green-700';
      case 4: return 'bg-green-800 hover:bg-green-900';
      default: return 'bg-green-100 hover:bg-green-200';
    }
  };

  const handleDayClick = (date: Date) => {
    if (date.getTime() === 0) return; // Don't handle placeholder dates
    
    const dateKey = formatDateKey(date);
    const dayMetrics = metricsMap.get(dateKey);
    onDayClick(dateKey, dayMetrics);
  };

  return (
    <div className="bg-white rounded-md border border-[#d1d9e0] p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title}
        <span className="ml-2">{monthLabel}</span>
        {activeDaysCount !== undefined && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            · {activeDaysCount} active {activeDaysCount === 1 ? 'day' : 'days'}
          </span>
        )}
      </h3>
      
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="border-l border-t border-gray-300">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((date, dayIndex) => {
                const dateKey = formatDateKey(date);
                const activityLevel = getActivityLevel(dateKey);
                const isPlaceholder = date.getTime() === 0;
                const hasData = metricsMap.has(dateKey);
                const isMonthStart = !isPlaceholder && hasMultipleMonths && date.getUTCDate() === 1;
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      h-8 text-xs flex items-center justify-center border-r border-b border-gray-300
                      ${isMonthStart ? 'border-l-4 border-l-gray-800 font-semibold' : ''}
                      ${isPlaceholder 
                        ? 'bg-white' 
                        : hasData 
                          ? `${getActivityColor(activityLevel)} cursor-pointer transition-colors`
                          : `${getMonthTint(date)} cursor-default`
                      }
                    `}
                    onClick={() => !isPlaceholder && handleDayClick(date)}
                    title={
                      !isPlaceholder && hasData 
                        ? `${formatShortDate(formatDateKey(date))} - Click to view details`
                        : !isPlaceholder 
                        ? `${formatShortDate(formatDateKey(date))} - No activity`
                        : undefined
                    }
                  >
                    {isMonthStart
                      ? `${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} 1`
                      : !isPlaceholder && date.getUTCDate()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end space-x-1 text-xs text-gray-500 mt-2">
          <span>Less activity</span>
          <div className="flex space-x-1 mx-2">
            <div className="w-3 h-3 bg-green-100 rounded-sm border border-green-200"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
          </div>
          <span>More activity</span>
        </div>
      </div>
    </div>
  );
}

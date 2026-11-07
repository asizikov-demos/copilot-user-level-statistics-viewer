'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnchoredOverlay } from '@primer/react';
import { ServerIcon } from '@primer/octicons-react';
import type { UserDayData } from '../../../../types/metrics';
import type { UserReportingQuality } from '../../../../types/reportingQuality';
import type { ActivityCalendarData } from '../../../../domain/calculators/activityCalendarCalculator';
import { formatShortDate } from '../../../../utils/formatters';
import CalendarReportingCard from './CalendarReportingCard';

interface ActivityCalendarProps {
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  title?: string;
  activity: ActivityCalendarData;
  reportingQuality?: UserReportingQuality;
  onDayClick: (date: string, dayData?: UserDayData) => void;
}

const ACTIVITY_HOVER_CLASS = 'hover:ring-2 hover:ring-inset hover:ring-[var(--borderColor-emphasis)]';

/** Primer contribution graph tokens for activity levels 0-4. */
const ACTIVITY_LEVEL_CLASSES: readonly string[] = [
  `bg-[var(--contribution-default-bgColor-0)] ${ACTIVITY_HOVER_CLASS}`,
  `bg-[var(--contribution-default-bgColor-1)] ${ACTIVITY_HOVER_CLASS}`,
  `bg-[var(--contribution-default-bgColor-2)] ${ACTIVITY_HOVER_CLASS}`,
  `bg-[var(--contribution-default-bgColor-3)] ${ACTIVITY_HOVER_CLASS}`,
  `bg-[var(--contribution-default-bgColor-4)] text-[var(--fgColor-onEmphasis)] ${ACTIVITY_HOVER_CLASS}`,
];

const ACTIVITY_LEGEND_CLASSES: readonly string[] = [
  'bg-[var(--contribution-default-bgColor-0)] border-[var(--contribution-default-borderColor-0)]',
  'bg-[var(--contribution-default-bgColor-1)] border-[var(--contribution-default-borderColor-1)]',
  'bg-[var(--contribution-default-bgColor-2)] border-[var(--contribution-default-borderColor-2)]',
  'bg-[var(--contribution-default-bgColor-3)] border-[var(--contribution-default-borderColor-3)]',
  'bg-[var(--contribution-default-bgColor-4)] border-[var(--contribution-default-borderColor-4)]',
];

export default function ActivityCalendar({ days, activity, reportingQuality, reportStartDay, reportEndDay, title = 'Activity Calendar', onDayClick }: ActivityCalendarProps) {
  const [previewDay, setPreviewDay] = useState<string | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardId = useId();
  const qualityMap = useMemo(() => new Map(reportingQuality?.daily.map(day => [day.day, day])), [reportingQuality]);
  const cancelClose = () => {
    if (closeTimer.current != null) clearTimeout(closeTimer.current);
  };
  const closePreview = () => {
    cancelClose();
    setPreviewDay(null);
  };
  const scheduleClose = () => {
    cancelClose();
    if (document.activeElement !== anchorRef.current) closeTimer.current = setTimeout(() => setPreviewDay(null), 150);
  };
  const openPreview = (day: string, anchor: HTMLElement) => {
    cancelClose();
    anchorRef.current = anchor;
    setPreviewDay(day);
  };
  useEffect(() => () => {
    if (closeTimer.current != null) clearTimeout(closeTimer.current);
  }, []);
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
  const mondayIndex = (date: Date) => (date.getUTCDay() + 6) % 7;

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
  // Neutral tones alternate so adjacent months stay distinct without decorative hues.
  const monthTints = ['bg-muted', 'bg-default'];
  const getMonthTint = (date: Date) => {
    if (!hasMultipleMonths || date.getTime() === 0) return 'bg-transparent';
    const index = orderedMonths.indexOf(monthKey(date));
    return monthTints[index % monthTints.length];
  };
  
  const formatDateKey = (date: Date) => {
    if (date.getTime() === 0) return ''; // Placeholder date
    return date.toISOString().split('T')[0];
  };

  const levels = new Map(activity.daily.map(day => [day.day, day.level]));
  const getActivityLevel = (dateKey: string) => levels.get(dateKey) ?? 0;

  const getActivityColor = (level: number) =>
    ACTIVITY_LEVEL_CLASSES[level] ?? ACTIVITY_LEVEL_CLASSES[0];

  const handleDayClick = (date: Date) => {
    if (date.getTime() === 0) return; // Don't handle placeholder dates
    closePreview();
    
    const dateKey = formatDateKey(date);
    const dayMetrics = metricsMap.get(dateKey);
    onDayClick(dateKey, dayMetrics);
  };

  return (
    <div className="bg-default rounded-md border border-default p-6">
      <h3 className="text-lg font-semibold text-default mb-4">
        {title}
        <span className="ml-2">{monthLabel}</span>
        <span className="ml-2 text-sm font-normal text-muted">
          · {activity.activeDays} active {activity.activeDays === 1 ? 'day' : 'days'}
        </span>
      </h3>
      
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-muted text-center p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="border-l border-t border-default">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((date, dayIndex) => {
                const dateKey = formatDateKey(date);
                const activityLevel = getActivityLevel(dateKey);
                const isPlaceholder = date.getTime() === 0;
                const hasData = metricsMap.has(dateKey);
                const serverOnly = qualityMap.get(dateKey)?.telemetryStatus === 'missing';
                const isMonthStart = !isPlaceholder && hasMultipleMonths && date.getUTCDate() === 1;
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      h-8 text-xs flex items-center justify-center border-r border-b border-default relative
                      focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]
                      ${isMonthStart ? 'border-l-4 border-l-[var(--fgColor-default)] font-semibold' : ''}
                      ${isPlaceholder 
                        ? 'bg-default' 
                        : hasData 
                          ? `${getActivityColor(activityLevel)} cursor-pointer transition-colors`
                          : `${getMonthTint(date)} cursor-default`
                      }
                    `}
                    onClick={() => !isPlaceholder && handleDayClick(date)}
                    role={isPlaceholder ? undefined : 'button'}
                    tabIndex={isPlaceholder ? undefined : 0}
                    aria-label={isPlaceholder ? undefined : formatShortDate(dateKey)}
                    aria-describedby={previewDay === dateKey ? cardId : undefined}
                    data-day={isPlaceholder ? undefined : dateKey}
                    onMouseEnter={isPlaceholder ? undefined : event => openPreview(dateKey, event.currentTarget)}
                    onMouseLeave={isPlaceholder ? undefined : scheduleClose}
                    onFocus={isPlaceholder ? undefined : event => openPreview(dateKey, event.currentTarget)}
                    onBlur={isPlaceholder ? undefined : closePreview}
                    onKeyDown={isPlaceholder ? undefined : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleDayClick(date);
                      } else if (event.key === 'Escape') {
                        closePreview();
                      }
                    }}
                  >
                    {isMonthStart
                      ? `${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} 1`
                      : !isPlaceholder && date.getUTCDate()}
                    {serverOnly && (
                      <span className="pointer-events-none absolute right-1 top-1 flex" aria-hidden="true" data-testid="server-only-day">
                        <ServerIcon size={10} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end space-x-1 text-xs text-muted mt-2">
          <span>Less activity</span>
          <div className="flex space-x-1 mx-2">
            {ACTIVITY_LEGEND_CLASSES.map((legendClass, level) => (
              <div key={level} className={`w-3 h-3 rounded-sm border ${legendClass}`}></div>
            ))}
          </div>
          <span>More activity</span>
        </div>
        {reportingQuality && (
          <div className="space-y-1 text-xs text-muted">
            {reportingQuality.telemetryReportedDays > 0 ? (
              <p className="flex items-center gap-1">
                <ServerIcon size={12} aria-hidden="true" />
                Server-side telemetry only · {reportingQuality.serverOnlyDays} {reportingQuality.serverOnlyDays === 1 ? 'day' : 'days'}
              </p>
            ) : <p>Telemetry status was not reported for this upload.</p>}
            <p>Status available for {reportingQuality.telemetryReportedDays} of {reportingQuality.uploadedDays} uploaded days. Unreported dates are not classified as healthy.</p>
          </div>
        )}
      </div>
      {previewDay && <AnchoredOverlay
        key={previewDay}
        renderAnchor={null}
        anchorRef={anchorRef}
        open={previewDay != null}
        onClose={closePreview}
        width="medium"
        side="outside-bottom"
        align="center"
        focusTrapSettings={{ disabled: true }}
        focusZoneSettings={{ disabled: true }}
        overlayProps={{
          id: cardId,
          role: 'tooltip',
          preventFocusOnOpen: true,
          preventFocusOnClose: true,
          onMouseEnter: cancelClose,
          onMouseLeave: scheduleClose,
        }}
      >
        <CalendarReportingCard day={previewDay} quality={qualityMap.get(previewDay)} />
      </AnchoredOverlay>}
    </div>
  );
}

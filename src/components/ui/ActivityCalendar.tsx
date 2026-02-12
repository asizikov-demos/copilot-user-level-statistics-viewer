'use client';

import type { UserDayData } from '../../types/metrics';

interface ActivityCalendarProps {
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  onDayClick: (date: string, dayData?: UserDayData) => void;
}

export default function ActivityCalendar({ days, reportStartDay, reportEndDay, onDayClick }: ActivityCalendarProps) {
  const startDate = new Date(reportStartDay);
  const endDate = new Date(reportEndDay);

  const metricsMap = new Map<string, UserDayData>();
  days.forEach(day => {
    metricsMap.set(day.day, day);
  });

  const generateDateGrid = () => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const allDates = generateDateGrid();
  const groupDatesByWeek = (dates: Date[]) => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    dates.forEach((date, index) => {
      if (index === 0) {
        // Fill the first week with empty slots if it doesn't start on Sunday
        const dayOfWeek = date.getDay();
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(new Date(0)); // Use epoch as placeholder
        }
      }
      
      currentWeek.push(date);
      
      if (currentWeek.length === 7 || index === dates.length - 1) {
        // Fill the last week with empty slots if needed
        while (currentWeek.length < 7) {
          currentWeek.push(new Date(0)); // Use epoch as placeholder
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const weeks = groupDatesByWeek(allDates);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const formatDateKey = (date: Date) => {
    if (date.getTime() === 0) return ''; // Placeholder date
    return date.toISOString().split('T')[0];
  };

  const getActivityLevel = (dateKey: string) => {
    const metrics = metricsMap.get(dateKey);
    if (!metrics) return 0;
    
    const totalActivity = metrics.user_initiated_interaction_count + 
                         metrics.code_generation_activity_count + 
                         metrics.code_acceptance_activity_count;
    
    if (totalActivity === 0) return 0;
    if (totalActivity <= 5) return 1;
    if (totalActivity <= 20) return 2;
    if (totalActivity <= 50) return 3;
    return 4;
  };

  const getActivityColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 hover:bg-gray-200';
      case 1: return 'bg-green-100 hover:bg-green-200';
      case 2: return 'bg-green-300 hover:bg-green-400';
      case 3: return 'bg-green-500 hover:bg-green-600';
      case 4: return 'bg-green-700 hover:bg-green-800';
      default: return 'bg-gray-100 hover:bg-gray-200';
    }
  };

  const handleDayClick = (date: Date) => {
    if (date.getTime() === 0) return; // Don't handle placeholder dates
    
    const dateKey = formatDateKey(date);
    const dayMetrics = metricsMap.get(dateKey);
    onDayClick(dateKey, dayMetrics);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Calendar</h3>
      
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 text-center p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((date, dayIndex) => {
                const dateKey = formatDateKey(date);
                const activityLevel = getActivityLevel(dateKey);
                const isPlaceholder = date.getTime() === 0;
                const hasData = metricsMap.has(dateKey);
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      w-16 h-8 rounded text-xs flex items-center justify-center border
                      ${isPlaceholder 
                        ? 'border-transparent' 
                        : hasData 
                          ? `${getActivityColor(activityLevel)} border-gray-300 cursor-pointer transition-colors`
                          : 'bg-gray-50 border-gray-200 cursor-default'
                      }
                    `}
                    onClick={() => !isPlaceholder && handleDayClick(date)}
                    title={
                      !isPlaceholder && hasData 
                        ? `${date.toLocaleDateString()} - Click to view details`
                        : !isPlaceholder 
                        ? `${date.toLocaleDateString()} - No activity`
                        : undefined
                    }
                  >
                    {!isPlaceholder && date.getDate()}
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
            <div className="w-3 h-3 bg-gray-100 rounded-sm border"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          </div>
          <span>More activity</span>
        </div>
      </div>
    </div>
  );
}
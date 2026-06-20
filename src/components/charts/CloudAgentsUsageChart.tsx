'use client';

import { formatShortDate } from '../../utils/formatters';
import ChartContainer from '../ui/ChartContainer';

export interface CloudAgentsUsageDatum {
  date: string;
  cloudAgent: number;
  codeReviewActive: number;
  codeReviewPassive: number;
}

interface CloudAgentsUsageChartProps {
  data: CloudAgentsUsageDatum[];
}

interface UsageLane {
  key: keyof Omit<CloudAgentsUsageDatum, 'date'>;
  label: string;
  swatchClass: string;
  activeClass: string;
}

const LANES: UsageLane[] = [
  { key: 'cloudAgent', label: 'Cloud Agent', swatchClass: 'bg-teal-500', activeClass: 'bg-teal-500' },
  { key: 'codeReviewActive', label: 'Code Review (active)', swatchClass: 'bg-cyan-500', activeClass: 'bg-cyan-500' },
  { key: 'codeReviewPassive', label: 'Code Review (passive)', swatchClass: 'bg-indigo-500', activeClass: 'bg-indigo-500' },
];

/**
 * Daily usage signals for Copilot Cloud Agent and Copilot Code Review (active/passive).
 * Each feature gets a lane with one cell per day in the report range, filled when the
 * feature was used that day. A timeline strip reads more clearly than bars for binary signals.
 */
export default function CloudAgentsUsageChart({ data }: CloudAgentsUsageChartProps) {
  const cloudAgentDays = data.reduce((sum, d) => sum + d.cloudAgent, 0);
  const codeReviewActiveDays = data.reduce((sum, d) => sum + d.codeReviewActive, 0);
  const codeReviewPassiveDays = data.reduce((sum, d) => sum + d.codeReviewPassive, 0);

  return (
    <ChartContainer
      title="Cloud Agents Usage"
      description="Daily usage signals for Copilot Cloud Agent and Copilot Code Review (active and passive)."
      isEmpty={data.length === 0}
      emptyState="No cloud agent or code review usage data available"
      chartHeight="h-auto"
      summaryStats={[
        { value: cloudAgentDays.toLocaleString(), label: 'Cloud Agent Days' },
        { value: codeReviewActiveDays.toLocaleString(), label: 'Code Review (active) Days' },
        { value: codeReviewPassiveDays.toLocaleString(), label: 'Code Review (passive) Days' },
      ]}
    >
      <div className="space-y-3 py-1">
        {LANES.map((lane) => (
          <div key={lane.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-48 shrink-0">
              <span className={`inline-block h-3 w-3 rounded-sm ${lane.swatchClass}`} aria-hidden="true" />
              <span className="text-sm text-gray-700">{lane.label}</span>
            </div>
            <div className="flex flex-1 gap-[2px]">
              {data.map((d) => {
                const used = d[lane.key] === 1;
                return (
                  <div
                    key={d.date}
                    title={`${formatShortDate(d.date)} — ${lane.label}: ${used ? 'Used' : 'Not used'}`}
                    className={`flex-1 min-w-[3px] h-7 rounded-[2px] ${used ? lane.activeClass : 'bg-gray-100'}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {data.length > 0 && (
          <div className="flex gap-3">
            <div className="w-48 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 gap-[2px] h-12 pt-1">
              {data.map((d) => (
                <div key={d.date} className="flex-1 min-w-[3px] flex justify-center">
                  <span className="origin-center -rotate-45 whitespace-nowrap text-[10px] leading-none text-gray-500 mt-2">
                    {formatShortDate(d.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ChartContainer>
  );
}

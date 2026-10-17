'use client';

import React from 'react';

interface DayImpactCardProps {
  locAdded: number;
  locDeleted: number;
}

interface ImpactRow {
  label: string;
  value: number;
  valueClassName: string;
  barClassName: string;
}

export default function DayImpactCard({ locAdded, locDeleted }: DayImpactCardProps) {
  const net = locAdded - locDeleted;
  const max = Math.max(locAdded, locDeleted, Math.abs(net), 1);

  const rows: ImpactRow[] = [
    { label: 'LOC Added', value: locAdded, valueClassName: 'text-success', barClassName: 'bg-success-emphasis' },
    { label: 'LOC Deleted', value: locDeleted, valueClassName: 'text-danger', barClassName: 'bg-danger-emphasis' },
    {
      label: 'Net LOC',
      value: net,
      valueClassName: net >= 0 ? 'text-accent' : 'text-severe',
      barClassName: net >= 0 ? 'bg-accent-emphasis' : 'bg-severe-emphasis',
    },
  ];

  return (
    <div className="h-full bg-default rounded-md border border-default p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-default mb-2">Impact</h3>
      <p className="text-sm text-muted mb-6">Lines of code added and deleted from accepted suggestions.</p>
      <div className="flex flex-1 flex-col justify-center gap-6">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-muted">{row.label}</span>
              <span className={`text-2xl font-bold ${row.valueClassName}`}>
                {row.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${row.barClassName}`}
                style={{ width: `${(Math.abs(row.value) / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

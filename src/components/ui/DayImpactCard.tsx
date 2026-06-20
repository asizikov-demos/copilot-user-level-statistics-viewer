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
    { label: 'LOC Added', value: locAdded, valueClassName: 'text-green-600', barClassName: 'bg-green-500' },
    { label: 'LOC Deleted', value: locDeleted, valueClassName: 'text-red-600', barClassName: 'bg-red-500' },
    {
      label: 'Net LOC',
      value: net,
      valueClassName: net >= 0 ? 'text-blue-600' : 'text-orange-600',
      barClassName: net >= 0 ? 'bg-blue-500' : 'bg-orange-500',
    },
  ];

  return (
    <div className="h-full bg-white rounded-md border border-[#d1d9e0] p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Impact</h3>
      <p className="text-sm text-gray-600 mb-6">Lines of code kept from accepted suggestions.</p>
      <div className="flex flex-1 flex-col justify-center gap-6">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{row.label}</span>
              <span className={`text-2xl font-bold ${row.valueClassName}`}>
                {row.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
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

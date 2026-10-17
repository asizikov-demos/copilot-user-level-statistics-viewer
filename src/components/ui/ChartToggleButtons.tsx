'use client';

import React from 'react';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ChartToggleButtonsProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function ChartToggleButtons<T extends string>({
  options,
  value,
  onChange,
}: ChartToggleButtonsProps<T>) {
  return (
    <div className="flex gap-2 print:hidden">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1 text-sm rounded ${
            value === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-muted text-muted hover:bg-[var(--control-bgColor-active)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

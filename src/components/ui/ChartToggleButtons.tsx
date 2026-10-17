'use client';

import React from 'react';
import { SegmentedControl } from '@primer/react';

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ChartToggleButtonsProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export default function ChartToggleButtons<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Chart view',
}: ChartToggleButtonsProps<T>) {
  return (
    <div className="whitespace-nowrap print:hidden" data-component="ChartToggleButtons">
      <SegmentedControl
        size="small"
        aria-label={ariaLabel}
        onChange={(selectedIndex) => {
          const option = options[selectedIndex];
          if (option && option.value !== value) onChange(option.value);
        }}
      >
        {options.map((option) => (
          <SegmentedControl.Button key={option.value} selected={option.value === value}>
            {option.label}
          </SegmentedControl.Button>
        ))}
      </SegmentedControl>
    </div>
  );
}

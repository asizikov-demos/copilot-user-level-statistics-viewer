'use client';

import { ActionList, ActionMenu, useFormControlForwardedProps } from '@primer/react';
import { ChevronDownIcon } from '@primer/octicons-react';

interface SimpleSelectOption<Value extends string> {
  value: Value;
  label: string;
}

interface SimpleSelectProps<Value extends string> {
  /** Accessible name; the selected option is appended. */
  label: string;
  options: ReadonlyArray<SimpleSelectOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  id?: string;
  size?: 'small' | 'medium';
  block?: boolean;
}

/** Single-choice Primer menu used in place of the native `Select`. */
export default function SimpleSelect<Value extends string>({
  label,
  options,
  value,
  onChange,
  id: idProp,
  size,
  block,
}: SimpleSelectProps<Value>) {
  // Inherit the id FormControl generates so its label focuses the trigger.
  const { id } = useFormControlForwardedProps(idProp === undefined ? {} : { id: idProp });
  const selectedLabel = options.find(option => option.value === value)?.label ?? '';

  return (
    <ActionMenu>
      <ActionMenu.Button
        id={id}
        size={size}
        block={block}
        aria-labelledby={undefined}
        aria-label={`${label}: ${selectedLabel}`}
        trailingAction={ChevronDownIcon}
      >
        {selectedLabel}
      </ActionMenu.Button>
      <ActionMenu.Overlay>
        <ActionList selectionVariant="single">
          {options.map(option => (
            <ActionList.Item
              key={option.value}
              selected={option.value === value}
              onSelect={() => onChange(option.value)}
            >
              {option.label}
            </ActionList.Item>
          ))}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}

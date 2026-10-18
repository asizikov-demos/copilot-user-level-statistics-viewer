'use client';

import { useMemo, useState, type ComponentType } from 'react';
import { Button, FormControl, SelectPanel, type SelectPanelItemInput } from '@primer/react';
import { TriangleDownIcon } from '@primer/octicons-react';
import styles from './UserFilterSelectPanel.module.css';

interface UserFilterSelectPanelProps<Value extends string> {
  id: string;
  label: string;
  placeholder: string;
  options: ReadonlyArray<{ value: Value; label: string; leadingVisual?: ComponentType }>;
  selectedValues: Value[];
  onSelectionChange: (values: Value[]) => void;
}

export default function UserFilterSelectPanel<Value extends string>({
  id,
  label,
  placeholder,
  options,
  selectedValues,
  onSelectionChange,
}: UserFilterSelectPanelProps<Value>) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const items = useMemo(
    () => options.map(option => ({
      id: option.value,
      text: option.label,
      leadingVisual: option.leadingVisual,
    })),
    [options]
  );
  const selected = items.filter(item => selectedValues.includes(item.id));
  const query = filter.trim().toLowerCase();
  const selectedLabels = selected.map(item => item.text);
  const fullSummary = selectedLabels.join(', ') || placeholder;
  const summary = selectedLabels.length > 2
    ? `${selectedLabels.slice(0, 2).join(', ')}, ...`
    : fullSummary;

  return (
    <FormControl id={id}>
      <FormControl.Label>{label}</FormControl.Label>
      <SelectPanel
        title={label}
        subtitle="Match any selected option. Clear selections to show all."
        placeholder={placeholder}
        placeholderText={`Filter ${label.toLowerCase()}...`}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setFilter('');
        }}
        items={items.filter(item => item.text.toLowerCase().includes(query))}
        selected={selected}
        onSelectedChange={(selection: SelectPanelItemInput[]) => {
          onSelectionChange(
            options.filter(option => selection.some(item => item.id === option.value))
              .map(option => option.value)
          );
        }}
        filterValue={filter}
        onFilterChange={setFilter}
        loading={false}
        showSelectAll
        renderAnchor={(anchorProps) => (
          <Button
            {...anchorProps}
            block
            aria-labelledby={undefined}
            aria-label={`${label} ${fullSummary}`}
            title={fullSummary}
            className={styles.anchor}
            trailingAction={TriangleDownIcon}
          >
            {summary}
          </Button>
        )}
      />
    </FormControl>
  );
}

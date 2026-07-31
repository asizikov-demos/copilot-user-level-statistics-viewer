import { describe, it, expect } from 'vitest';
import {
  standardActivityColumns,
  withInteractionsColumns,
  standardActivityTableColumns,
  withInteractionsTableColumns,
  type HasStandardActivityMetrics,
  type HasInteractionMetrics,
} from './activityMetricColumns';

const baseMetrics: HasStandardActivityMetrics = {
  code_generation_activity_count: 10,
  code_acceptance_activity_count: 5,
  loc_added_sum: 100,
  loc_deleted_sum: 20,
  loc_suggested_to_add_sum: 150,
  loc_suggested_to_delete_sum: 30,
};

const interactionMetrics: HasInteractionMetrics = {
  ...baseMetrics,
  user_initiated_interaction_count: 8,
  assumed_user_initiated_interaction_count: 2,
};

describe('standardActivityColumns', () => {
  it('returns six columns in the correct order', () => {
    const cols = standardActivityColumns<HasStandardActivityMetrics>();
    expect(cols).toHaveLength(6);
    expect(cols.map((c) => c.header)).toEqual([
      'Generation',
      'Acceptance',
      'LOC Added',
      'LOC Deleted',
      'Suggested Add',
      'Suggested Delete',
    ]);
  });

  it('accesses the correct field for each column', () => {
    const cols = standardActivityColumns<HasStandardActivityMetrics>();
    expect(cols[0].accessor(baseMetrics)).toBe(10); // Generation
    expect(cols[1].accessor(baseMetrics)).toBe(5);  // Acceptance
    expect(cols[2].accessor(baseMetrics)).toBe(100); // LOC Added
    expect(cols[3].accessor(baseMetrics)).toBe(20);  // LOC Deleted
    expect(cols[4].accessor(baseMetrics)).toBe(150); // Suggested Add
    expect(cols[5].accessor(baseMetrics)).toBe(30);  // Suggested Delete
  });
});

describe('withInteractionsColumns', () => {
  it('returns seven columns with Interactions first', () => {
    const cols = withInteractionsColumns<HasInteractionMetrics>();
    expect(cols).toHaveLength(7);
    expect(cols[0].header).toBe('Interactions');
    expect(cols.slice(1).map((c) => c.header)).toEqual([
      'Generation',
      'Acceptance',
      'LOC Added',
      'LOC Deleted',
      'Suggested Add',
      'Suggested Delete',
    ]);
  });

  it('sums user_initiated and assumed interactions', () => {
    const cols = withInteractionsColumns<HasInteractionMetrics>();
    // 8 + 2 = 10
    expect(cols[0].accessor(interactionMetrics)).toBe(10);
  });

  it('falls back to 0 for missing assumed_user_initiated_interaction_count', () => {
    const withoutAssumed: HasInteractionMetrics = {
      ...interactionMetrics,
      assumed_user_initiated_interaction_count: undefined,
    };
    const cols = withInteractionsColumns<HasInteractionMetrics>();
    expect(cols[0].accessor(withoutAssumed)).toBe(8);
  });
});

describe('standardActivityTableColumns', () => {
  it('returns six TableColumn entries with default px-6 classes', () => {
    const cols = standardActivityTableColumns<HasStandardActivityMetrics>();
    expect(cols).toHaveLength(6);
    expect(cols.map((c) => c.header)).toEqual([
      'Generation',
      'Acceptance',
      'LOC Added',
      'LOC Deleted',
      'Suggested Add',
      'Suggested Delete',
    ]);
    for (const col of cols) {
      expect(col.headerClassName).toContain('px-6');
      expect(col.className).toContain('px-6');
    }
  });

  it('renders cell values as locale strings', () => {
    const cols = standardActivityTableColumns<HasStandardActivityMetrics>();
    expect(cols[0].renderCell!(baseMetrics, 0)).toBe('10');
    expect(cols[2].renderCell!(baseMetrics, 0)).toBe('100');
  });

  it('accepts custom className overrides', () => {
    const custom = 'px-4 py-3 custom-class';
    const cols = standardActivityTableColumns<HasStandardActivityMetrics>({
      headerClassName: custom,
      cellClassName: custom,
    });
    for (const col of cols) {
      expect(col.headerClassName).toBe(custom);
      expect(col.className).toBe(custom);
    }
  });
});

describe('withInteractionsTableColumns', () => {
  it('returns seven TableColumn entries with Interactions first', () => {
    const cols = withInteractionsTableColumns<HasInteractionMetrics>();
    expect(cols).toHaveLength(7);
    expect(cols[0].header).toBe('Interactions');
    expect(cols.map((c) => c.header)).toEqual([
      'Interactions',
      'Generation',
      'Acceptance',
      'LOC Added',
      'LOC Deleted',
      'Suggested Add',
      'Suggested Delete',
    ]);
  });

  it('renders the total interaction count (user + assumed)', () => {
    const cols = withInteractionsTableColumns<HasInteractionMetrics>();
    // 8 + 2 = 10
    expect(cols[0].renderCell!(interactionMetrics, 0)).toBe('10');
  });

  it('accepts custom className overrides', () => {
    const custom = 'px-4 py-2 custom';
    const cols = withInteractionsTableColumns<HasInteractionMetrics>({
      headerClassName: custom,
      cellClassName: custom,
    });
    for (const col of cols) {
      expect(col.headerClassName).toBe(custom);
      expect(col.className).toBe(custom);
    }
  });
});

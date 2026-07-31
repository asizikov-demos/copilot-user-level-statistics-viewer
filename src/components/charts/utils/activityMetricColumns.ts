import { getTotalUserInitiatedInteractionCount } from '../../../domain/assumedInteractions';
import type { TableColumn } from '../../ui/MetricsTable';

/** Minimal type for objects with the standard six activity metric fields. */
export interface HasStandardActivityMetrics {
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

/** Extends HasStandardActivityMetrics with per-interaction count fields. */
export interface HasInteractionMetrics extends HasStandardActivityMetrics {
  user_initiated_interaction_count: number;
  assumed_user_initiated_interaction_count?: number;
}

/** Column descriptor for ActivityBreakdownChart breakdown tables. */
export interface ColumnConfig<T> {
  header: string;
  accessor: (item: T) => number;
}

const DEFAULT_HEADER_RIGHT =
  'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
const DEFAULT_CELL_RIGHT =
  'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';

/**
 * Returns the six standard activity columns (Generation, Acceptance, LOC Added,
 * LOC Deleted, Suggested Add, Suggested Delete) as ColumnConfig entries for use
 * in ActivityBreakdownChart configurations.
 */
export function standardActivityColumns<T extends HasStandardActivityMetrics>(): ColumnConfig<T>[] {
  return [
    { header: 'Generation', accessor: (item) => item.code_generation_activity_count },
    { header: 'Acceptance', accessor: (item) => item.code_acceptance_activity_count },
    { header: 'LOC Added', accessor: (item) => item.loc_added_sum },
    { header: 'LOC Deleted', accessor: (item) => item.loc_deleted_sum },
    { header: 'Suggested Add', accessor: (item) => item.loc_suggested_to_add_sum },
    { header: 'Suggested Delete', accessor: (item) => item.loc_suggested_to_delete_sum },
  ];
}

/**
 * Returns an Interactions column followed by the six standard activity columns
 * as ColumnConfig entries. Uses getTotalUserInitiatedInteractionCount for the
 * interactions count.
 */
export function withInteractionsColumns<T extends HasInteractionMetrics>(): ColumnConfig<T>[] {
  return [
    { header: 'Interactions', accessor: getTotalUserInitiatedInteractionCount },
    ...standardActivityColumns<T>(),
  ];
}

/**
 * Returns the six standard activity columns (Generation, Acceptance, LOC Added,
 * LOC Deleted, Suggested Add, Suggested Delete) as TableColumn entries for use
 * in MetricsTable. Defaults to px-6 cell padding.
 */
export function standardActivityTableColumns<T extends HasStandardActivityMetrics>(opts?: {
  headerClassName?: string;
  cellClassName?: string;
}): TableColumn<T>[] {
  const hClass = opts?.headerClassName ?? DEFAULT_HEADER_RIGHT;
  const cClass = opts?.cellClassName ?? DEFAULT_CELL_RIGHT;
  return [
    {
      id: 'generation',
      header: 'Generation',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.code_generation_activity_count.toLocaleString(),
    },
    {
      id: 'acceptance',
      header: 'Acceptance',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.code_acceptance_activity_count.toLocaleString(),
    },
    {
      id: 'locAdded',
      header: 'LOC Added',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.loc_added_sum.toLocaleString(),
    },
    {
      id: 'locDeleted',
      header: 'LOC Deleted',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.loc_deleted_sum.toLocaleString(),
    },
    {
      id: 'locSuggestedAdd',
      header: 'Suggested Add',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.loc_suggested_to_add_sum.toLocaleString(),
    },
    {
      id: 'locSuggestedDelete',
      header: 'Suggested Delete',
      headerClassName: hClass,
      className: cClass,
      renderCell: (r) => r.loc_suggested_to_delete_sum.toLocaleString(),
    },
  ];
}

/**
 * Returns an Interactions column followed by the six standard activity columns
 * as TableColumn entries for use in MetricsTable. Defaults to px-6 cell padding.
 */
export function withInteractionsTableColumns<T extends HasInteractionMetrics>(opts?: {
  headerClassName?: string;
  cellClassName?: string;
}): TableColumn<T>[] {
  const hClass = opts?.headerClassName ?? DEFAULT_HEADER_RIGHT;
  const cClass = opts?.cellClassName ?? DEFAULT_CELL_RIGHT;
  const interactionsColumn: TableColumn<T> = {
    id: 'interactions',
    header: 'Interactions',
    headerClassName: hClass,
    className: cClass,
    renderCell: (r) => getTotalUserInitiatedInteractionCount(r).toLocaleString(),
  };
  return [interactionsColumn, ...standardActivityTableColumns<T>(opts)];
}

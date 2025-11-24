export type DateRangeFilter = 'all' | 'last28days' | 'last14days' | 'last7days';

export interface FilterState {
  dateRange: DateRangeFilter;
  removeUnknownLanguages: boolean;
}

export interface FilterActions {
  setDateRange: (filter: DateRangeFilter) => void;
  setRemoveUnknownLanguages: (remove: boolean) => void;
  resetFilters: () => void;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  dateRange: 'all',
  removeUnknownLanguages: false,
};

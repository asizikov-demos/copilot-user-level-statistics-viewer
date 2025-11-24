'use client';

import { useState } from 'react';
import { DateRangeFilter } from '../types/filters';

interface FilterPanelProps {
  onDateRangeChange: (filter: DateRangeFilter) => void;
  currentFilter: DateRangeFilter;
  reportStartDay: string;
  reportEndDay: string;
  removeUnknownLanguages: boolean;
  onRemoveUnknownLanguagesChange: (remove: boolean) => void;
}

export default function FilterPanel({ 
  onDateRangeChange, 
  currentFilter, 
  reportStartDay, 
  reportEndDay,
  removeUnknownLanguages,
  onRemoveUnknownLanguagesChange
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filterOptions = [
    { value: 'all' as DateRangeFilter, label: 'All data' },
    { value: 'last28days' as DateRangeFilter, label: 'Last 28 days' },
    { value: 'last14days' as DateRangeFilter, label: 'Last 14 days' },
    { value: 'last7days' as DateRangeFilter, label: 'Last 7 days' }
  ];

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCurrentFilterLabel = () => {
    const option = filterOptions.find(opt => opt.value === currentFilter);
    return option?.label || 'All data';
  };

  const getDateRangeText = () => {
    const endDate = new Date(reportEndDay);
    
    switch (currentFilter) {
      case 'last7days':
        const start7 = new Date(endDate);
        start7.setDate(start7.getDate() - 6); // 7 days including end date
        return `${formatDateShort(start7.toISOString().split('T')[0])} - ${formatDateShort(reportEndDay)}`;
      case 'last14days':
        const start14 = new Date(endDate);
        start14.setDate(start14.getDate() - 13); // 14 days including end date
        return `${formatDateShort(start14.toISOString().split('T')[0])} - ${formatDateShort(reportEndDay)}`;
      case 'last28days':
        const start28 = new Date(endDate);
        start28.setDate(start28.getDate() - 27); // 28 days including end date
        return `${formatDateShort(start28.toISOString().split('T')[0])} - ${formatDateShort(reportEndDay)}`;
      case 'all':
      default:
        return `${formatDateShort(reportStartDay)} - ${formatDateShort(reportEndDay)}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
      
      {/* Date Range Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="relative">
          <button
            type="button"
            className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="block truncate">{getCurrentFilterLabel()}</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>

          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                    currentFilter === option.value
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'text-gray-900'
                  }`}
                  onClick={() => {
                    onDateRangeChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Show current date range */}
        <p className="mt-2 text-xs text-gray-500">
          {getDateRangeText()}
        </p>
      </div>

      {/* Language Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Language Filters
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={removeUnknownLanguages}
              onChange={(e) => onRemoveUnknownLanguagesChange(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">
              Remove &quot;unknown&quot; languages
            </span>
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Excludes entries where language is &quot;unknown&quot; or empty
        </p>
      </div>

      {/* Info Section */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">About Filters</h4>
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Date filters are applied to all metrics and charts</p>
          <p>• Language filters affect statistics calculations</p>
          <p>• Date ranges are calculated from the report end date</p>
          <p>• Changes update all views instantly</p>
        </div>
      </div>
    </div>
  );
}

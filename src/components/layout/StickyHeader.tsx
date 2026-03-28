'use client';

import React from 'react';
import { useMetrics } from '../MetricsContext';
import { useNavigation } from '../../state/NavigationContext';
import { useResetAppState } from '../../hooks/useResetAppState';
import { getActiveNavItem, NAV_ITEMS } from './navigationItems';

const GitHubMark = () => (
  <svg
    aria-hidden="true"
    height="32"
    viewBox="0 0 24 24"
    width="32"
    fill="white"
  >
    <path d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z" />
  </svg>
);

const StickyHeader: React.FC = () => {
  const { hasData } = useMetrics();
  const { currentView, navigateTo } = useNavigation();
  const resetAppState = useResetAppState();
  const activeNavItem = getActiveNavItem(currentView) ?? NAV_ITEMS[0];

  const handleMobileNavigation = (event: React.ChangeEvent<HTMLSelectElement>) => {
    navigateTo(event.target.value as (typeof activeNavItem.view));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#24292f] flex items-center justify-between px-4 sm:px-6 lg:px-8 print:hidden">
      <div className="flex items-center gap-3">
        <GitHubMark />
        <span className="hidden text-lg font-semibold tracking-tight text-white sm:inline">
          Copilot Usage Metrics
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {hasData && (
          <>
            <label htmlFor="mobile-view-select" className="sr-only">
              Navigate to section
            </label>
            <select
              id="mobile-view-select"
              value={activeNavItem.view}
              onChange={handleMobileNavigation}
              className="w-40 max-w-[42vw] rounded-md border border-[#57606a] bg-[#24292f] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#2f81f7] lg:hidden"
            >
              {NAV_ITEMS.map(({ label, view }) => (
                <option key={view} value={view}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}

        {hasData && (
          <button
            type="button"
            onClick={resetAppState}
            className="rounded-md border border-[#57606a] bg-transparent px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-white/[0.08] sm:px-4"
          >
            <span className="hidden sm:inline">Upload new file</span>
            <span className="sm:hidden">Upload</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default StickyHeader;

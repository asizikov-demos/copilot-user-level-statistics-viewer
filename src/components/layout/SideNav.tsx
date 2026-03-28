'use client';

import React from 'react';
import { useNavigation } from '../../state/NavigationContext';
import { NAV_ITEMS } from './navigationItems';

const SideNav: React.FC = () => {
  const { currentView, navigateTo } = useNavigation();

  return (
    <nav
      className="fixed bottom-0 left-0 top-[100px] z-40 hidden w-64 overflow-y-auto py-3 pl-4 pr-3 print:hidden lg:block lg:pl-8"
      aria-label="Main navigation"
    >
      <div className="bg-white border border-[#d1d9e0] rounded-md">
        <ul className="p-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, view, activeViews, icon }) => {
            const isActive = (activeViews ?? [view]).includes(currentView);
            return (
              <li key={view}>
                <button
                  onClick={() => navigateTo(view)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#f6f8fa] text-[#1f2328] font-semibold cursor-default'
                      : 'text-[#636c76] hover:bg-[#f6f8fa] hover:text-[#1f2328] cursor-pointer'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default SideNav;

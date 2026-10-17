'use client';

import React from 'react';
import { NavList } from '@primer/react';
import { useNavigation } from '../../state/NavigationContext';
import { isNavItemActive, NAV_ITEMS } from './navigationItems';

const SideNav: React.FC = () => {
  const { currentView, navigateTo } = useNavigation();

  return (
    <div className="fixed bottom-0 left-0 top-[100px] z-40 hidden w-64 overflow-y-auto py-3 pl-4 pr-3 print:hidden lg:block lg:pl-8">
      <div className="bg-default border border-default rounded-md p-2">
        <NavList aria-label="Main navigation">
          {NAV_ITEMS.map(item => {
            const { label, view, icon: Icon } = item;
            return (
              <NavList.Item
                key={view}
                as="button"
                type="button"
                onClick={() => navigateTo(view)}
                aria-current={isNavItemActive(item, currentView) ? 'page' : undefined}
              >
                <NavList.LeadingVisual>
                  <Icon />
                </NavList.LeadingVisual>
                {label}
              </NavList.Item>
            );
          })}
        </NavList>
      </div>
    </div>
  );
};

export default SideNav;

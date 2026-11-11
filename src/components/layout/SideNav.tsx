'use client';

import React from 'react';
import { Button, NavList, Tooltip } from '@primer/react';
import { SidebarCollapseIcon, SidebarExpandIcon } from '@primer/octicons-react';
import { useNavigation } from '../../state/NavigationContext';
import { isNavItemActive, NAV_ITEMS } from './navigationItems';
import styles from './AppShell.module.css';

interface SideNavProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ collapsed, onToggle }) => {
  const { currentView, navigateTo } = useNavigation();
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <aside className={styles.sidebar} aria-label="Navigation sidebar">
      <NavList id="main-navigation" aria-label="Main navigation" className={styles.navigation} disableItemGap>
        {NAV_ITEMS.map(item => {
          const { label, view, icon: Icon } = item;
          return (
            <NavList.Item
              key={view}
              as="button"
              type="button"
              className={styles.item}
              onClick={() => navigateTo(view)}
              tooltipText={collapsed ? label : undefined}
              aria-current={isNavItemActive(item, currentView) ? 'page' : undefined}
            >
              <NavList.LeadingVisual>
                <Icon size={16} aria-hidden="true" />
              </NavList.LeadingVisual>
              <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
            </NavList.Item>
          );
        })}
      </NavList>
      <Tooltip text={toggleLabel} direction="e">
        <Button
          variant="invisible"
          block
          alignContent="start"
          className={styles.toggle}
          icon={collapsed ? SidebarExpandIcon : undefined}
          leadingVisual={collapsed ? undefined : SidebarCollapseIcon}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
          onClick={onToggle}
        >
          {collapsed ? null : toggleLabel}
        </Button>
      </Tooltip>
    </aside>
  );
};

export default SideNav;

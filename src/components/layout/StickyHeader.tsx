'use client';

import React from 'react';
import { ActionList, ActionMenu, Button, Header } from '@primer/react';
import { ListUnorderedIcon, MarkGithubIcon, MoonIcon, SunIcon } from '@primer/octicons-react';
import { useMetrics } from '../MetricsContext';
import { useNavigation } from '../../state/NavigationContext';
import { useResetAppState } from '../../hooks/useResetAppState';
import { useAppTheme } from '../../state/AppThemeProvider';
import { getActiveNavItem, NAV_ITEMS } from './navigationItems';
import styles from './StickyHeader.module.css';
import shellStyles from './AppShell.module.css';
import type { ContextSection } from './contextSections';
import { navigateToSection } from './useContextSections';

interface StickyHeaderProps {
  sections: ContextSection[];
  activeSectionId: string | null;
}

const StickyHeader: React.FC<StickyHeaderProps> = ({ sections, activeSectionId }) => {
  const { hasData } = useMetrics();
  const { currentView, navigateTo } = useNavigation();
  const resetAppState = useResetAppState();
  const { theme, setTheme } = useAppTheme();
  const activeNavItem = getActiveNavItem(currentView) ?? NAV_ITEMS[0];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 print:hidden">
      <Header className={styles.header}>
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <Header.Item full className="min-w-0 gap-3">
            <MarkGithubIcon size={24} fill="var(--header-fgColor-logo)" className="shrink-0" aria-hidden="true" />
            <span className="hidden truncate text-[var(--header-fgColor-default)] font-semibold text-lg tracking-tight sm:inline">
              Copilot Usage Metrics
            </span>
          </Header.Item>

          <div className={`${styles.actions} flex shrink-0 items-center gap-2 sm:gap-3`}>
            <Button
              className={styles.themeButton}
              leadingVisual={theme === 'dimmed' ? MoonIcon : SunIcon}
              aria-label="Light / Dimmed theme"
              aria-pressed={theme === 'dimmed'}
              onClick={() => setTheme(theme === 'dimmed' ? 'light' : 'dimmed')}
            >
              {theme === 'dimmed' ? 'Dimmed' : 'Light'}
            </Button>
            {hasData && (
              <>
                <div className={shellStyles.mobileNavigation}>
                  <ActionMenu>
                    <ActionMenu.Button
                      className={styles.menuButton}
                      aria-label={`Navigate to section: ${activeNavItem.label}`}
                    >
                      {activeNavItem.label}
                    </ActionMenu.Button>
                    <ActionMenu.Overlay align="end">
                      <ActionList selectionVariant="single">
                        {NAV_ITEMS.map(({ label, view, icon: Icon }) => (
                          <ActionList.Item
                            key={view}
                            selected={view === activeNavItem.view}
                            onSelect={() => navigateTo(view)}
                          >
                            <ActionList.LeadingVisual>
                              <Icon size={16} aria-hidden="true" />
                            </ActionList.LeadingVisual>
                            {label}
                          </ActionList.Item>
                        ))}
                      </ActionList>
                    </ActionMenu.Overlay>
                  </ActionMenu>
                </div>

                {sections.length > 0 && (
                  <div className={shellStyles.compactContextNavigation}>
                    <ActionMenu>
                      <ActionMenu.Button
                        className={styles.contextMenuButton}
                        leadingVisual={ListUnorderedIcon}
                        aria-label="On this page"
                      >
                        On this page
                      </ActionMenu.Button>
                      <ActionMenu.Overlay align="end">
                        <ActionList selectionVariant="single">
                          {sections.map(({ id, label }) => (
                            <ActionList.Item
                              key={id}
                              selected={activeSectionId === id}
                              onSelect={() => navigateToSection(id)}
                            >
                              {label}
                            </ActionList.Item>
                          ))}
                        </ActionList>
                      </ActionMenu.Overlay>
                    </ActionMenu>
                  </div>
                )}

                <Button onClick={resetAppState}>
                  <span className="hidden sm:inline">Upload new file</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </Header>
    </div>
  );
};

export default StickyHeader;

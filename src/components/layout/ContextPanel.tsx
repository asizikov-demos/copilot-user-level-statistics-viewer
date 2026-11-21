'use client';

import React from 'react';
import { NavList } from '@primer/react';
import type { ContextSection } from './contextSections';
import { navigateToSection } from './useContextSections';
import styles from './AppShell.module.css';

interface ContextPanelProps {
  sections: ContextSection[];
  activeId: string | null;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ sections, activeId }) => {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.contextPanel} fixed bottom-0 right-0 top-[100px] z-40 w-64 overflow-y-auto py-3 pl-3 pr-8 print:hidden`}>
      <div className="bg-default border border-default rounded-md p-2">
        <NavList aria-label="On this page">
          <NavList.Group title="On this page" hideDivider>
            {sections.map(({ id, label }) => (
              <NavList.Item
                key={id}
                href={`#${id}`}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                  event.preventDefault();
                  navigateToSection(id);
                }}
                aria-current={activeId === id ? 'location' : undefined}
              >
                {label}
              </NavList.Item>
            ))}
          </NavList.Group>
        </NavList>
      </div>
    </div>
  );
};

export default ContextPanel;

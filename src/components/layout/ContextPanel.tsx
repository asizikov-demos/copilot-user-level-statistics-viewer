'use client';

import React from 'react';
import { NavList } from '@primer/react';
import { useNavigation } from '../../state/NavigationContext';
import { useActiveSection } from '../../hooks/useActiveSection';
import { CONTEXT_SECTIONS } from './contextSections';

const ContextPanel: React.FC = () => {
  const { currentView } = useNavigation();
  const sections = CONTEXT_SECTIONS[currentView] ?? [];
  const sectionKey = sections.map(section => section.id).join('|');
  const [renderedIds, setRenderedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const ids = sectionKey ? sectionKey.split('|') : [];
    const updateSections = () => {
      const next = ids.filter(id => document.getElementById(id) !== null);
      setRenderedIds(previous =>
        previous.length === next.length && previous.every((id, index) => id === next[index])
          ? previous
          : next
      );
    };
    updateSections();
    const observer = new MutationObserver(updateSections);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [sectionKey]);

  const visibleSections = sections.filter(section => renderedIds.includes(section.id));
  const activeId = useActiveSection(visibleSections.map(section => section.id));

  if (visibleSections.length === 0) {
    return null;
  }

  const handleNavigate = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="fixed bottom-0 right-0 top-[100px] z-40 hidden w-64 overflow-y-auto py-3 pl-3 pr-4 print:hidden xl:block xl:pr-8">
      <div className="bg-default border border-default rounded-md p-2">
        <NavList aria-label="On this page">
          <NavList.Group title="On this page" hideDivider>
            {visibleSections.map(({ id, label }) => (
              <NavList.Item
                key={id}
                href={`#${id}`}
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
                  event.preventDefault();
                  handleNavigate(id);
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

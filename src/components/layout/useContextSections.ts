'use client';

import React from 'react';
import { useNavigation } from '../../state/NavigationContext';
import { useActiveSection } from '../../hooks/useActiveSection';
import { CONTEXT_SECTIONS } from './contextSections';

export function useContextSections() {
  const { currentView } = useNavigation();
  const sections = CONTEXT_SECTIONS[currentView] ?? [];
  const sectionKey = sections.map(section => section.id).join('|');
  const [renderedIds, setRenderedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const ids = sectionKey ? sectionKey.split('|') : [];
    if (ids.length === 0) {
      setRenderedIds([]);
      return;
    }
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
  return { sections: visibleSections, activeId };
}

export function navigateToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  window.requestAnimationFrame(() => {
    if (element.isConnected) element.focus({ preventScroll: true });
  });
}

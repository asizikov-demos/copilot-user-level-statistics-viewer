'use client';

import React from 'react';
import { useNavigation } from '../../state/NavigationContext';
import { useActiveSection } from '../../hooks/useActiveSection';
import { CONTEXT_SECTIONS } from './contextSections';

const ContextPanel: React.FC = () => {
  const { currentView } = useNavigation();
  const sections = CONTEXT_SECTIONS[currentView] ?? [];
  const activeId = useActiveSection(sections.map((section) => section.id));

  if (sections.length === 0) {
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
    <aside
      className="fixed bottom-0 right-0 top-[100px] z-40 hidden w-64 overflow-y-auto py-3 pl-3 pr-4 print:hidden xl:block xl:pr-8"
      aria-label="On this page"
    >
      <div className="bg-white border border-[#d1d9e0] rounded-md">
        <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[#636c76]">
          On this page
        </p>
        <ul className="p-2 pt-1 space-y-0.5">
          {sections.map(({ id, label }) => {
            const isActive = activeId === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleNavigate(id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#f6f8fa] text-[#1f2328] font-semibold'
                      : 'text-[#636c76] hover:bg-[#f6f8fa] hover:text-[#1f2328] cursor-pointer'
                  }`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default ContextPanel;

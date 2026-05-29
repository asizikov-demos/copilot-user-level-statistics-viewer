"use client";

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

interface DisclosureSectionProps {
  label: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  containerClassName?: string;
  buttonClassName?: string;
  contentClassName?: string;
}

const DEFAULT_CONTAINER_CLASS = 'border-t border-gray-200 pt-4';
const DEFAULT_BUTTON_CLASS =
  'flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors';
const DEFAULT_CONTENT_CLASS = 'mt-4';

export default function DisclosureSection({
  label,
  children,
  defaultExpanded = false,
  containerClassName,
  buttonClassName,
  contentClassName,
}: DisclosureSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <div className={containerClassName ?? DEFAULT_CONTAINER_CLASS}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={buttonClassName ?? DEFAULT_BUTTON_CLASS}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div id={contentId} className={contentClassName ?? DEFAULT_CONTENT_CLASS}>
          {children}
        </div>
      )}
    </div>
  );
}

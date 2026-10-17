"use client";

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from '@primer/octicons-react';
import { cn } from '../../utils/cn';
import styles from './DisclosureSection.module.css';

interface DisclosureSectionProps {
  label: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  /** Replaces the default container styling. */
  containerClassName?: string;
  /** Replaces the default toggle styling; the focus-visible outline is always applied. */
  buttonClassName?: string;
  /** Replaces the default content styling. */
  contentClassName?: string;
  /** Replaces the default label styling. */
  labelClassName?: string;
}

export default function DisclosureSection({
  label,
  children,
  defaultExpanded = false,
  containerClassName,
  buttonClassName,
  contentClassName,
  labelClassName,
}: DisclosureSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <div className={containerClassName ?? styles.container} data-component="DisclosureSection">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(styles.toggle, buttonClassName ?? styles.button)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className={labelClassName ?? styles.label}>{label}</span>
        <span className={styles.chevron} data-expanded={isExpanded ? 'true' : 'false'} aria-hidden="true">
          <ChevronDownIcon size={20} />
        </span>
      </button>

      {isExpanded && (
        <div id={contentId} className={contentClassName ?? styles.content}>
          {children}
        </div>
      )}
    </div>
  );
}

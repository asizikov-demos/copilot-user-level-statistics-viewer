'use client';

import React from 'react';
import type { Icon } from '@primer/octicons-react';
// Blankslate is experimental in @primer/react; keep this the only import site.
import { Blankslate } from '@primer/react/experimental';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  heading: React.ReactNode;
  description?: React.ReactNode;
  icon?: Icon;
  headingAs?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'small' | 'medium' | 'large';
  border?: boolean;
  narrow?: boolean;
  spacious?: boolean;
  primaryAction?: EmptyStateAction;
  className?: string;
  'data-testid'?: string;
}

/** Shared empty state built on Primer's experimental Blankslate. */
export default function EmptyState({
  heading,
  description,
  icon: VisualIcon,
  headingAs = 'h3',
  size = 'small',
  border = false,
  narrow = false,
  spacious = false,
  primaryAction,
  className,
  'data-testid': dataTestId,
}: EmptyStateProps) {
  return (
    <Blankslate
      border={border}
      narrow={narrow}
      spacious={spacious}
      size={size}
      className={className}
      data-testid={dataTestId}
    >
      {VisualIcon && (
        <Blankslate.Visual>
          <VisualIcon size={size === 'small' ? 24 : 32} />
        </Blankslate.Visual>
      )}
      <Blankslate.Heading as={headingAs}>{heading}</Blankslate.Heading>
      {description && <Blankslate.Description>{description}</Blankslate.Description>}
      {primaryAction && (
        <Blankslate.PrimaryAction onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Blankslate.PrimaryAction>
      )}
    </Blankslate>
  );
}

'use client';

import React from 'react';
// SkeletonText is experimental in @primer/react; keep this the only import site.
import { SkeletonText as PrimerSkeletonText } from '@primer/react/experimental';

export interface SkeletonTextProps {
  size?: 'titleLarge' | 'titleMedium' | 'titleSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall';
  lines?: number;
  maxWidth?: React.CSSProperties['maxWidth'];
  className?: string;
}

/** Loading placeholder for text, built on Primer's experimental SkeletonText. */
export default function SkeletonText({
  size = 'bodyMedium',
  lines = 1,
  maxWidth,
  className,
}: SkeletonTextProps) {
  return (
    <PrimerSkeletonText
      size={size}
      lines={lines}
      maxWidth={maxWidth}
      className={className}
    />
  );
}

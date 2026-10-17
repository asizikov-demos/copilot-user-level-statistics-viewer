'use client';

import React from 'react';
import { Spinner } from '@primer/react';

export interface LoadingStateProps {
  message: string;
}

/** Centered spinner with a visible status message for full-view loading. */
export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex h-64 items-center justify-center">
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <Spinner size="medium" srText={null} />
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
}

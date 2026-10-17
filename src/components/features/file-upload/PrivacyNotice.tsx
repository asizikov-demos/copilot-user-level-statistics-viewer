'use client';

import React from 'react';
import { LockIcon } from '@primer/octicons-react';

const PrivacyNotice: React.FC = () => {
  return (
    <div className="rounded-md border border-default bg-muted px-4 py-3">
      <div className="flex items-start gap-3">
        <LockIcon size={16} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-semibold text-default">Your data stays in your browser.</span>
          {' '}No data is uploaded to any server — all processing happens locally on your device.
          {' '}The source code is{' '}
          <a
            href="https://github.com/asizikov-demos/copilot-user-level-statistics-viewer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            open source
          </a>
          {' '}and can be audited for security and privacy compliance.
        </p>
      </div>
    </div>
  );
};

export default PrivacyNotice;

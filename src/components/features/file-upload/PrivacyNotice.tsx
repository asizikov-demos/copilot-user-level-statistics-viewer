'use client';

import React from 'react';

const PrivacyNotice: React.FC = () => {
  return (
    <div className="rounded-md border border-default bg-muted px-4 py-3">
      <div className="flex items-start gap-3">
        <svg className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
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

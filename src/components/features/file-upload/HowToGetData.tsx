'use client';

import React from 'react';
import { LinkExternalIcon } from '@primer/octicons-react';

const step = (n: number, text: React.ReactNode) => (
  <div className="flex items-start gap-3">
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-emphasis text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{n}</span>
    <p className="text-sm text-default leading-snug">{text}</p>
  </div>
);

const HowToGetData: React.FC = () => {
  return (
    <div className="rounded-lg border border-default bg-default">
      <div className="px-5 py-4 border-b border-default">
        <h3 className="text-sm font-semibold text-default">How to export your data</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {step(1, <span>Navigate to your enterprise on <strong>GitHub.com</strong> or <strong>GHE.com</strong> (e.g. from the <a href="https://github.com/settings/enterprises" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Enterprises</a> page)</span>)}
        {step(2, <span>Click the <strong>Insights</strong> tab</span>)}
        {step(3, <span>In the left sidebar, click <strong>Copilot usage</strong></span>)}
        {step(4, <span>Export the <strong>User Level Metrics</strong> NDJSON report from the dashboard</span>)}
        <div className="pt-2">
          <a
            href="https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/view-usage-and-adoption"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
          >
            <LinkExternalIcon size={14} aria-hidden="true" />
            View GitHub Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default HowToGetData;

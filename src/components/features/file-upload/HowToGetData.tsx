'use client';

import React from 'react';

const step = (n: number, text: React.ReactNode) => (
  <div className="flex items-start gap-3">
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0969da] text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{n}</span>
    <p className="text-sm text-[#24292f] leading-snug">{text}</p>
  </div>
);

const HowToGetData: React.FC = () => {
  return (
    <div className="rounded-lg border border-[#d0d7de] bg-white">
      <div className="px-5 py-4 border-b border-[#d0d7de]">
        <h3 className="text-sm font-semibold text-[#24292f]">How to export your data</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {step(1, <span>Navigate to your enterprise on <strong>GitHub.com</strong> or <strong>GHE.com</strong> (e.g. from the <a href="https://github.com/settings/enterprises" target="_blank" rel="noopener noreferrer" className="text-[#0969da] hover:underline">Enterprises</a> page)</span>)}
        {step(2, <span>Click the <strong>Insights</strong> tab</span>)}
        {step(3, <span>In the left sidebar, click <strong>Copilot usage</strong></span>)}
        {step(4, <span>Export the <strong>User Level Metrics</strong> NDJSON report from the dashboard</span>)}
        <div className="pt-2">
          <a
            href="https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/view-usage-and-adoption"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#0969da] hover:underline font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View GitHub Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default HowToGetData;

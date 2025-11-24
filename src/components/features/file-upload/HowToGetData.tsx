'use client';

import React from 'react';

const HowToGetData: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Get Your Data Export</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-start">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs mr-3 flex-shrink-0 mt-0.5">1</span>
          <p>Navigate to your GitHub Enterprise account settings or organization dashboard</p>
        </div>
        <div className="flex items-start">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs mr-3 flex-shrink-0 mt-0.5">2</span>
          <p>Go to the <strong>GitHub Copilot Usage Metrics Dashboard</strong></p>
        </div>
        <div className="flex items-start">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs mr-3 flex-shrink-0 mt-0.5">3</span>
          <p>Select the desired date range and export options</p>
        </div>
        <div className="flex items-start">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs mr-3 flex-shrink-0 mt-0.5">4</span>
          <p>Download the <strong>User Level Metrics</strong> file (JSON or NDJSON format)</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a 
            href="https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-enterprise/view-usage-and-adoption"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

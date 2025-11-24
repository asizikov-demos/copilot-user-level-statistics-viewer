'use client';

import React from 'react';

const PrivacyNotice: React.FC = () => {
  return (
    <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Privacy &amp; Security</h3>
          <p className="text-sm text-blue-800 mb-2">
            Your data is processed entirely in your browser. No data is uploaded to any server or transmitted over the network. All analysis happens locally on your device.
          </p>
          <p className="text-sm text-blue-800">
            This application is open source and can be audited for security and privacy compliance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;

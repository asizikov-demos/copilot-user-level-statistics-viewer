'use client';

import React from 'react';

const AppHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        GitHub Copilot Usage Metrics Viewer
      </h1>
      <p className="text-gray-600">
        Upload your GitHub Copilot User Level metrics JSON / NDJSON file (.json or .ndjson) to view usage statistics
      </p>
    </div>
  );
};

export default AppHeader;

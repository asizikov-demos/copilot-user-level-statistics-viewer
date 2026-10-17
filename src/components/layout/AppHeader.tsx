'use client';

import React from 'react';
import { Banner } from '@primer/react';
import { useMetrics } from '../MetricsContext';

const AppHeader: React.FC = () => {
  const { warning, isWarningDismissed, dismissWarning } = useMetrics();

  if (!warning || isWarningDismissed) return null;

  return (
    <div className="mx-auto mb-4 max-w-3xl text-left" data-upload-warning>
      <Banner
        variant="warning"
        title="Upload warning"
        hideTitle
        description={warning}
        onDismiss={dismissWarning}
      />
    </div>
  );
};

export default AppHeader;

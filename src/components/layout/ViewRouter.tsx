'use client';

import React from 'react';
import { Banner } from '@primer/react';
import { VIEW_MODES } from '../../types/navigation';
import { useNavigation } from '../../state/NavigationContext';
import { useMetrics } from '../MetricsContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useResetAppState } from '../../hooks/useResetAppState';
import { FileUploadArea } from '../features/file-upload';
import { UserDetailsRoute } from '../features/user-details';
import { StandardRouteOutlet } from './routes';
import LoadingState from '../ui/LoadingState';

const ViewRouter: React.FC = () => {
  const { 
    hasData, enterpriseName, aggregatedMetrics,
    isLoading, error, warning
  } = useMetrics();
  const { currentView, selectUser } = useNavigation();
  const { handleFileUpload, handleSampleLoad, uploadProgress } = useFileUpload();
  const resetAppState = useResetAppState();

  const handleUserClick = (userLogin: string, userId: number) => {
    selectUser({ login: userLogin, id: userId });
  };

  if (error && hasData) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <Banner
          variant="critical"
          title="Failed to process metrics"
          description={error}
          primaryAction={<Banner.PrimaryAction onClick={resetAppState}>Start Over</Banner.PrimaryAction>}
        />
      </div>
    );
  }

  if (!hasData) {
    return (
      <FileUploadArea
        onFileUpload={handleFileUpload}
        onSampleLoad={handleSampleLoad}
        isLoading={isLoading}
        error={error}
        uploadProgress={uploadProgress}
      />
    );
  }

  if (isLoading || !aggregatedMetrics) {
    return <LoadingState message="Processing metrics..." />;
  }

  return (
    <>
      <UserDetailsRoute />
      {currentView !== VIEW_MODES.USER_DETAILS && (
        <StandardRouteOutlet
          view={currentView}
          aggregatedMetrics={aggregatedMetrics}
          enterpriseName={enterpriseName}
          dataWarning={warning}
          onUserSelect={handleUserClick}
        />
      )}
    </>
  );
};

export default ViewRouter;

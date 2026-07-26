'use client';

import React from 'react';
import { VIEW_MODES } from '../../types/navigation';
import { useNavigation } from '../../state/NavigationContext';
import { useMetrics } from '../MetricsContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useResetAppState } from '../../hooks/useResetAppState';
import { FileUploadArea } from '../features/file-upload';
import { StandardRouteOutlet, UserDetailsRoute } from './routes';

const ViewRouter: React.FC = () => {
  const { 
    hasData, enterpriseName, aggregatedMetrics,
    isLoading, error
  } = useMetrics();
  const { currentView, selectUser } = useNavigation();
  const { handleFileUpload, handleSampleLoad, uploadProgress } = useFileUpload();
  const resetAppState = useResetAppState();

  const handleUserClick = (userLogin: string, userId: number) => {
    selectUser({ login: userLogin, id: userId });
  };

  if (error && hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Failed to process metrics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={resetAppState}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
          >
            Start Over
          </button>
        </div>
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Processing metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UserDetailsRoute />
      {currentView !== VIEW_MODES.USER_DETAILS && (
        <StandardRouteOutlet
          view={currentView}
          aggregatedMetrics={aggregatedMetrics}
          enterpriseName={enterpriseName}
          onUserSelect={handleUserClick}
        />
      )}
    </>
  );
};

export default ViewRouter;

'use client';

import { useEffect, useRef, useState } from 'react';
import { selectUserDetailsRouteReadModel } from '../../../read-models/userDetails';
import { useNavigation } from '../../../state/NavigationContext';
import { useMetricsWorker } from '../../../state/MetricsWorkerContext';
import { VIEW_MODES } from '../../../types/navigation';
import UserDetailsView from './UserDetailsView';
import { useMetrics } from '../../MetricsContext';
import { runUserDetailsRequest } from './userDetailsRequest';
import {
  resolveUserDetailsRouteState,
  type UserDetailsLoadState,
} from './userDetailsRouteState';

export default function UserDetailsRoute() {
  const { aggregatedMetrics } = useMetrics();
  const { currentView, selectedUser, navigateTo } = useNavigation();
  const metricsWorker = useMetricsWorker();
  const [loadState, setLoadState] = useState<UserDetailsLoadState>({
    status: 'idle',
  });
  const [retryKey, setRetryKey] = useState(0);
  const requestVersion = useRef(0);
  const routeModel = selectUserDetailsRouteReadModel(
    aggregatedMetrics,
    selectedUser
  );
  const routeState = resolveUserDetailsRouteState({
    currentView,
    routeModel,
    loadState,
  });

  useEffect(() => {
    requestVersion.current += 1;
    setLoadState({ status: 'idle' });
  }, [aggregatedMetrics, selectedUser]);

  useEffect(() => {
    if (routeState.status === 'redirect') {
      navigateTo(VIEW_MODES.USERS);
    }
  }, [routeState.status, navigateTo]);

  const request = currentView === VIEW_MODES.USER_DETAILS
    && routeModel.status === 'resolved'
    ? routeModel
    : null;
  const requestUserId = request?.selectedUser.id ?? null;
  const requestLogin = request?.selectedUser.login ?? null;
  const requestDataset = request?.datasetKey ?? null;

  useEffect(() => {
    if (!requestDataset || requestUserId === null) {
      return;
    }

    const activeRequestVersion = requestVersion.current + 1;
    requestVersion.current = activeRequestVersion;
    setLoadState({
      status: 'loading',
      dataset: requestDataset,
      userId: requestUserId,
    });

    void runUserDetailsRequest({
      userId: requestUserId,
      load: metricsWorker.computeUserDetails,
      isCurrent: () => requestVersion.current === activeRequestVersion,
      onSuccess: (details) => {
        setLoadState({
          status: 'ready',
          dataset: requestDataset,
          userId: requestUserId,
          details,
        });
      },
      onError: (message) => {
        setLoadState({
          status: 'error',
          dataset: requestDataset,
          userId: requestUserId,
          message,
        });
      },
    });

    return () => {
      if (requestVersion.current === activeRequestVersion) {
        requestVersion.current += 1;
      }
    };
  }, [
    requestDataset,
    requestLogin,
    requestUserId,
    retryKey,
    metricsWorker,
  ]);

  if (routeState.status === 'inactive' || routeState.status === 'redirect') {
    return null;
  }

  if (routeState.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (routeState.status === 'error') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">
            Failed to load user details
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {routeState.message}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setRetryKey((value) => value + 1)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigateTo(VIEW_MODES.USERS)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
            >
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <UserDetailsView model={routeState.model} />;
}

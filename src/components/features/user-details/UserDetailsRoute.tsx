'use client';

import { useEffect, useRef, useState } from 'react';
import { Banner } from '@primer/react';
import { selectUserDetailsRouteReadModel } from '../../../read-models/userDetails';
import { useNavigation } from '../../../state/NavigationContext';
import { useMetricsWorker } from '../../../state/MetricsWorkerContext';
import { VIEW_MODES } from '../../../types/navigation';
import UserDetailsView from './UserDetailsView';
import LoadingState from '../../ui/LoadingState';
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
    return <LoadingState message="Loading user details..." />;
  }

  if (routeState.status === 'error') {
    return (
      <div className="mx-auto max-w-xl py-16">
        <Banner
          variant="critical"
          title="Failed to load user details"
          description={routeState.message}
          primaryAction={
            <Banner.PrimaryAction onClick={() => setRetryKey((value) => value + 1)}>Retry</Banner.PrimaryAction>
          }
          secondaryAction={
            <Banner.SecondaryAction onClick={() => navigateTo(VIEW_MODES.USERS)}>Back to Users</Banner.SecondaryAction>
          }
        />
      </div>
    );
  }

  return <UserDetailsView model={routeState.model} />;
}

import { StrictMode, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  act,
  create,
  type ReactTestRenderer,
  type ReactTestInstance,
} from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import type {
  AggregatedMetrics,
  UserDetailedMetrics,
} from '../../../../types/aggregatedMetrics';
import type { UserDetailsViewModel } from '../../../../read-models/userDetails';
import {
  VIEW_MODES,
  type SelectedUser,
  type ViewMode,
} from '../../../../types/navigation';
import UserDetailsRoute from '../UserDetailsRoute';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

const mocks = vi.hoisted(() => {
  const computeUserDetails = vi.fn<
    (userId: number) => Promise<UserDetailedMetrics | null>
  >();

  return {
    currentView: 'userDetails' as ViewMode,
    selectedUser: null as SelectedUser | null,
    aggregatedMetrics: null as AggregatedMetrics | null,
    navigateTo: vi.fn(),
    computeUserDetails,
    workerOperations: {
      computeUserDetails,
      parseAndAggregate: vi.fn(),
      reset: vi.fn(),
    },
    userDetailsView: vi.fn<(model: UserDetailsViewModel) => void>(),
  };
});

vi.mock('../../../MetricsContext', () => ({
  useMetrics: () => ({
    aggregatedMetrics: mocks.aggregatedMetrics,
  }),
}));

vi.mock('../../../../state/NavigationContext', () => ({
  useNavigation: () => ({
    currentView: mocks.currentView,
    selectedUser: mocks.selectedUser,
    navigateTo: mocks.navigateTo,
  }),
}));

vi.mock('../../../../workers/MetricsWorkerContext', () => ({
  useMetricsWorker: () => mocks.workerOperations,
}));

vi.mock('../../../UserDetailsView', () => ({
  default: ({ model }: { model: UserDetailsViewModel }) => {
    mocks.userDetailsView(model);
    return <div>{model.userLogin}</div>;
  },
}));

const details: UserDetailedMetrics = {
  totalModelRequests: 0,
  total_ai_credits_used: 0,
  featureAggregates: [],
  ideAggregates: [],
  languageFeatureAggregates: [],
  modelFeatureAggregates: [],
  pluginVersions: [],
  cliVersions: [],
  dailyCombinedImpact: [],
  dailyModelUsage: [],
  dailyAgentImpact: [],
  dailyAskModeImpact: [],
  dailyCompletionImpact: [],
  dailyCliImpact: [],
  days: [],
  reportStartDay: '2024-01-01',
  reportEndDay: '2024-01-31',
};

let renderer: ReactTestRenderer | null = null;

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: Error) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

async function mount(element: ReactElement = <UserDetailsRoute />) {
  await act(async () => {
    renderer = create(element);
  });

  if (!renderer) {
    throw new Error('UserDetailsRoute test renderer was not created');
  }
  return renderer;
}

async function update(element: ReactElement = <UserDetailsRoute />) {
  if (!renderer) {
    throw new Error('UserDetailsRoute test renderer is not mounted');
  }

  await act(async () => {
    renderer?.update(element);
  });
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function textOf(nodes: ReactTestInstance[]): string[] {
  return nodes.map((node) => node.children.join(''));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.currentView = VIEW_MODES.USER_DETAILS;
  mocks.selectedUser = { id: 1, login: 'testuser' };
  mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
});

afterEach(async () => {
  if (renderer) {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

describe('UserDetailsRoute', () => {
  it('stays inactive outside the specialized view', async () => {
    mocks.currentView = VIEW_MODES.USERS;

    const route = await mount();

    expect(route.toJSON()).toBeNull();
    expect(mocks.navigateTo).not.toHaveBeenCalled();
    expect(mocks.computeUserDetails).not.toHaveBeenCalled();
  });

  it('redirects missing selections after render without starting a request', async () => {
    mocks.selectedUser = null;

    renderToStaticMarkup(<UserDetailsRoute />);
    expect(mocks.navigateTo).not.toHaveBeenCalled();

    const route = await mount();

    expect(route.toJSON()).toBeNull();
    expect(mocks.navigateTo).toHaveBeenCalledWith(VIEW_MODES.USERS);
    expect(mocks.computeUserDetails).not.toHaveBeenCalled();
  });

  it('invalidates requests when the selected user id changes', async () => {
    const originalRequest = deferred<UserDetailedMetrics | null>();
    const selectedRequest = deferred<UserDetailedMetrics | null>();
    mocks.aggregatedMetrics = aggregateMetrics([
      makeMetric(),
      makeMetric({ user_id: 2, user_login: 'octocat' }),
    ]).aggregated;
    mocks.computeUserDetails
      .mockReturnValueOnce(originalRequest.promise)
      .mockReturnValueOnce(selectedRequest.promise);
    await mount();

    mocks.selectedUser = { id: 2, login: 'octocat' };
    await update();

    expect(mocks.computeUserDetails).toHaveBeenNthCalledWith(2, 2);
    originalRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).not.toHaveBeenCalled();

    selectedRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).toHaveBeenCalledWith(
      expect.objectContaining({
        userLogin: 'octocat',
        userId: 2,
        userSummary: expect.objectContaining({ user_id: 2 }),
      })
    );
  });

  it('redirects missing summaries without starting a request', async () => {
    mocks.selectedUser = { id: 999, login: 'missing-user' };

    await mount();

    expect(mocks.navigateTo).toHaveBeenCalledWith(VIEW_MODES.USERS);
    expect(mocks.computeUserDetails).not.toHaveBeenCalled();
  });

  it('loads and delivers the selected user view model', async () => {
    const request = deferred<UserDetailedMetrics | null>();
    mocks.computeUserDetails.mockReturnValueOnce(request.promise);

    const route = await mount();

    expect(mocks.computeUserDetails).toHaveBeenCalledWith(1);
    expect(textOf(route.root.findAllByType('p'))).toContain(
      'Loading user details...'
    );

    request.resolve(details);
    await settle();

    expect(mocks.userDetailsView).toHaveBeenCalledWith({
      userDetails: details,
      userSummary: mocks.aggregatedMetrics?.userSummaries[0],
      userLogin: 'testuser',
      userId: 1,
    });
  });

  it('renders recoverable errors and supports retry and back actions', async () => {
    const failedRequest = deferred<UserDetailedMetrics | null>();
    const retryRequest = deferred<UserDetailedMetrics | null>();
    mocks.computeUserDetails
      .mockReturnValueOnce(failedRequest.promise)
      .mockReturnValueOnce(retryRequest.promise);
    const route = await mount();

    failedRequest.reject(new Error('Worker unavailable'));
    await settle();

    expect(textOf(route.root.findAllByType('p'))).toEqual(
      expect.arrayContaining([
        'Failed to load user details',
        'Worker unavailable',
      ])
    );

    const [retryButton, backButton] = route.root.findAllByType('button');
    await act(async () => {
      backButton.props.onClick();
    });
    expect(mocks.navigateTo).toHaveBeenCalledWith(VIEW_MODES.USERS);

    await act(async () => {
      retryButton.props.onClick();
    });
    expect(mocks.computeUserDetails).toHaveBeenCalledTimes(2);

    retryRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).toHaveBeenCalledOnce();
  });

  it('invalidates results when the aggregate dataset changes', async () => {
    const originalRequest = deferred<UserDetailedMetrics | null>();
    const replacementRequest = deferred<UserDetailedMetrics | null>();
    mocks.computeUserDetails
      .mockReturnValueOnce(originalRequest.promise)
      .mockReturnValueOnce(replacementRequest.promise);
    await mount();

    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    await update();
    expect(mocks.computeUserDetails).toHaveBeenCalledTimes(2);

    originalRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).not.toHaveBeenCalled();

    replacementRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).toHaveBeenCalledOnce();
  });

  it('uses login identity changes to start a fresh request for the same id', async () => {
    const originalRequest = deferred<UserDetailedMetrics | null>();
    const renamedRequest = deferred<UserDetailedMetrics | null>();
    mocks.computeUserDetails
      .mockReturnValueOnce(originalRequest.promise)
      .mockReturnValueOnce(renamedRequest.promise);
    await mount();

    mocks.selectedUser = { id: 1, login: 'renamed-user' };
    await update();

    expect(mocks.computeUserDetails).toHaveBeenNthCalledWith(2, 1);
    originalRequest.reject(new Error('Obsolete request'));
    await settle();
    expect(textOf(renderer?.root.findAllByType('p') ?? [])).not.toContain(
      'Obsolete request'
    );

    renamedRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).toHaveBeenCalledWith(
      expect.objectContaining({
        userLogin: 'renamed-user',
        userId: 1,
      })
    );
  });

  it('ignores request completion after unmount cleanup', async () => {
    const request = deferred<UserDetailedMetrics | null>();
    mocks.computeUserDetails.mockReturnValueOnce(request.promise);
    const route = await mount();

    await act(async () => {
      route.unmount();
    });
    renderer = null;
    request.resolve(details);
    await settle();

    expect(mocks.userDetailsView).not.toHaveBeenCalled();
  });

  it('starts one request when the mounted boundary activates in Strict Mode', async () => {
    const activeRequest = deferred<UserDetailedMetrics | null>();
    mocks.currentView = VIEW_MODES.USERS;
    mocks.computeUserDetails.mockReturnValueOnce(activeRequest.promise);

    await mount(
      <StrictMode>
        <UserDetailsRoute />
      </StrictMode>
    );

    expect(mocks.computeUserDetails).not.toHaveBeenCalled();

    mocks.currentView = VIEW_MODES.USER_DETAILS;
    await update(
      <StrictMode>
        <UserDetailsRoute />
      </StrictMode>
    );
    expect(mocks.computeUserDetails).toHaveBeenCalledOnce();

    activeRequest.resolve(details);
    await settle();
    expect(mocks.userDetailsView).toHaveBeenCalled();
  });
});

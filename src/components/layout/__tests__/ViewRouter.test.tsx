import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import { VIEW_MODES, type ViewMode } from '../../../types/navigation';
import ViewRouter from '../ViewRouter';

interface StandardRouteOutletProps {
  view: ViewMode;
  aggregatedMetrics: AggregatedMetrics;
  enterpriseName: string | null;
  onUserSelect: (userLogin: string, userId: number) => void;
}

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  selectUser: vi.fn(),
  standardRouteOutlet: vi.fn<(props: StandardRouteOutletProps) => void>(),
  currentView: 'userDetails' as ViewMode,
  selectedUser: null as { id: number; login: string } | null,
  aggregatedMetrics: null as AggregatedMetrics | null,
}));

vi.mock('../../MetricsContext', () => ({
  useMetrics: () => ({
    hasData: true,
    enterpriseName: 'test-enterprise',
    aggregatedMetrics: mocks.aggregatedMetrics,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../../state/NavigationContext', () => ({
  useNavigation: () => ({
    currentView: mocks.currentView,
    selectedUser: mocks.selectedUser,
    navigateTo: mocks.navigateTo,
    selectUser: mocks.selectUser,
  }),
}));

vi.mock('../../../hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    handleFileUpload: vi.fn(),
    handleSampleLoad: vi.fn(),
    uploadProgress: null,
  }),
}));

vi.mock('../../../hooks/useResetAppState', () => ({
  useResetAppState: () => vi.fn(),
}));

vi.mock('../../../workers/MetricsWorkerContext', () => ({
  useMetricsWorker: () => ({
    computeUserDetails: vi.fn(),
    parseAndAggregate: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../routes', () => ({
  StandardRouteOutlet: (props: StandardRouteOutletProps) => {
    mocks.standardRouteOutlet(props);
    return null;
  },
}));

describe('ViewRouter', () => {
  beforeEach(() => {
    mocks.navigateTo.mockClear();
    mocks.selectUser.mockClear();
    mocks.standardRouteOutlet.mockClear();
    mocks.currentView = VIEW_MODES.USER_DETAILS;
    mocks.selectedUser = null;
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
  });

  describe('user-detail redirects', () => {
    it('does not navigate during render when no user is selected', () => {
      renderToStaticMarkup(<ViewRouter />);

      expect(mocks.navigateTo).not.toHaveBeenCalled();
    });

    it('does not navigate during render when the selected user summary is missing', () => {
      mocks.selectedUser = { id: 999, login: 'missing-user' };

      renderToStaticMarkup(<ViewRouter />);

      expect(mocks.navigateTo).not.toHaveBeenCalled();
    });
  });

  it('delegates a standard view with the shared route context', () => {
    mocks.currentView = VIEW_MODES.LANGUAGES;

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.standardRouteOutlet).toHaveBeenCalledOnce();
    const props = mocks.standardRouteOutlet.mock.calls[0][0];
    expect(props.view).toBe(VIEW_MODES.LANGUAGES);
    expect(props.aggregatedMetrics).toBe(mocks.aggregatedMetrics);
    expect(props.enterpriseName).toBe('test-enterprise');

    props.onUserSelect('octocat', 42);
    expect(mocks.selectUser).toHaveBeenCalledWith({
      login: 'octocat',
      id: 42,
    });
  });

  it('keeps user details out of the standard route outlet', () => {
    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();
  });
});

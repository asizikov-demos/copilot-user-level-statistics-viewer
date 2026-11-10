// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import { VIEW_MODES, type SelectedUser, type ViewMode } from '../../../types/navigation';
import type { StandardViewMode } from '../routes';
import ViewRouter from '../ViewRouter';

interface StandardRouteOutletProps {
  view: StandardViewMode;
  aggregatedMetrics: AggregatedMetrics;
  enterpriseName: string | null;
  dataWarning?: string | null;
  onUserSelect: (userLogin: string, userId: number) => void;
}

const mocks = vi.hoisted(() => ({
  currentView: 'userDetails' as ViewMode,
  selectedUser: { login: 'octocat', id: 42 } as SelectedUser | null,
  hasData: true,
  enterpriseName: 'test-enterprise' as string | null,
  aggregatedMetrics: null as AggregatedMetrics | null,
  isLoading: false,
  error: null as string | null,
  warning: null as string | null,
  navigateTo: vi.fn(),
  selectUser: vi.fn(),
  resetAppState: vi.fn(),
  handleFileUpload: vi.fn(),
  handleSampleLoad: vi.fn(),
  standardRouteOutlet: vi.fn<(props: StandardRouteOutletProps) => void>(),
  userDetailsRoute: vi.fn(),
  fileUploadArea: vi.fn<(props: {
    isLoading: boolean;
    error: string | null;
  }) => void>(),
}));

vi.mock('../../MetricsContext', () => ({
  useMetrics: () => ({
    hasData: mocks.hasData,
    enterpriseName: mocks.enterpriseName,
    aggregatedMetrics: mocks.aggregatedMetrics,
    isLoading: mocks.isLoading,
    error: mocks.error,
    warning: mocks.warning,
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
    handleFileUpload: mocks.handleFileUpload,
    handleSampleLoad: mocks.handleSampleLoad,
    uploadProgress: null,
  }),
}));

vi.mock('../../../hooks/useResetAppState', () => ({
  useResetAppState: () => mocks.resetAppState,
}));

vi.mock('../../features/file-upload', () => ({
  FileUploadArea: (props: {
    isLoading: boolean;
    error: string | null;
  }) => {
    mocks.fileUploadArea(props);
    return null;
  },
}));

vi.mock('../routes', () => ({
  StandardRouteOutlet: (props: StandardRouteOutletProps) => {
    mocks.standardRouteOutlet(props);
    return <div>Standard dashboard</div>;
  },
}));

vi.mock('../../features/user-details', () => ({
  UserDetailsRoute: () => {
    mocks.userDetailsRoute();
    return <div>User details dashboard</div>;
  },
}));

describe('ViewRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.standardRouteOutlet.mockReset();
    mocks.userDetailsRoute.mockReset();
    mocks.currentView = VIEW_MODES.USER_DETAILS;
    mocks.selectedUser = { login: 'octocat', id: 42 };
    mocks.hasData = true;
    mocks.enterpriseName = 'test-enterprise';
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    mocks.isLoading = false;
    mocks.error = null;
    mocks.warning = null;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps metrics-wide fatal errors ahead of route delegation', () => {
    mocks.error = 'Invalid report';

    const markup = renderToStaticMarkup(<ViewRouter />);

    expect(markup).toContain('Failed to process metrics');
    expect(markup).toContain('Invalid report');
    expect(mocks.userDetailsRoute).not.toHaveBeenCalled();
    expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();
  });

  it('keeps the no-data upload state ahead of route delegation', () => {
    mocks.hasData = false;
    mocks.error = 'Choose another file';

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.fileUploadArea).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: false,
        error: 'Choose another file',
        onFileUpload: mocks.handleFileUpload,
        onSampleLoad: mocks.handleSampleLoad,
      })
    );
    expect(mocks.userDetailsRoute).not.toHaveBeenCalled();
    expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();
  });

  it('keeps metrics-wide processing ahead of route delegation', () => {
    mocks.isLoading = true;

    const markup = renderToStaticMarkup(<ViewRouter />);

    expect(markup).toContain('Processing metrics...');
    expect(mocks.userDetailsRoute).not.toHaveBeenCalled();
    expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();
  });

  it('delegates the specialized route without user-detail props', () => {
    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.userDetailsRoute).toHaveBeenCalledOnce();
    expect(mocks.userDetailsRoute).toHaveBeenCalledWith();
    expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();
  });

  it('keeps the specialized lifecycle mounted beside a standard route', () => {
    mocks.currentView = VIEW_MODES.LANGUAGES;

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.userDetailsRoute).toHaveBeenCalledOnce();
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

  it('passes the upload limitation to the executive summary route', () => {
    mocks.currentView = VIEW_MODES.EXECUTIVE_SUMMARY;
    mocks.warning = 'One file failed to load.';

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.standardRouteOutlet).toHaveBeenCalledWith(
      expect.objectContaining({ dataWarning: mocks.warning })
    );
  });

  function throwInStandardView() {
    mocks.currentView = VIEW_MODES.LANGUAGES;
    mocks.standardRouteOutlet.mockImplementation(() => {
      throw new Error('Dashboard render failed');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }

  it.each([VIEW_MODES.LANGUAGES, VIEW_MODES.USER_DETAILS])(
    'contains render failures in %s without losing controls outside the view',
    (view) => {
      throwInStandardView();
      mocks.currentView = view;
      if (view === VIEW_MODES.USER_DETAILS) {
        mocks.userDetailsRoute.mockImplementation(() => {
          throw new Error('User details render failed');
        });
      }

      render(<><button>Reset uploaded data</button><ViewRouter /></>);

      expect(screen.getByText('Unable to display this view')).toBeTruthy();
      expect(screen.getByText('Your metrics are still loaded. Try again or choose another view.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reset uploaded data' })).toBeTruthy();
      expect(mocks.resetAppState).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    }
  );

  it('retries the failed view without discarding the dataset', () => {
    throwInStandardView();
    const dataset = mocks.aggregatedMetrics;
    render(<ViewRouter />);

    mocks.standardRouteOutlet.mockReset();
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0]);

    expect(screen.queryByText('Unable to display this view')).toBeNull();
    expect(screen.getByText('Standard dashboard')).toBeTruthy();
    expect(mocks.standardRouteOutlet).toHaveBeenCalledWith(
      expect.objectContaining({ aggregatedMetrics: dataset })
    );
    expect(mocks.resetAppState).not.toHaveBeenCalled();
  });

  it('navigates to overview from the fallback', () => {
    throwInStandardView();
    render(<ViewRouter />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to overview' })[0]);

    expect(mocks.navigateTo).toHaveBeenCalledWith(VIEW_MODES.OVERVIEW);
  });

  it('clears the fallback when the failing view is already the overview', () => {
    throwInStandardView();
    mocks.currentView = VIEW_MODES.OVERVIEW;
    render(<ViewRouter />);

    mocks.standardRouteOutlet.mockReset();
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to overview' })[0]);

    expect(mocks.navigateTo).toHaveBeenCalledWith(VIEW_MODES.OVERVIEW);
    expect(screen.queryByText('Unable to display this view')).toBeNull();
    expect(screen.getByText('Standard dashboard')).toBeTruthy();
  });

  it.each(['view', 'user ID', 'user login', 'dataset'])(
    'resets a failed view when the %s changes',
    (change) => {
      throwInStandardView();
      const { rerender } = render(<ViewRouter />);
      mocks.standardRouteOutlet.mockReset();

      // An unrelated render must not retry a failing dashboard.
      rerender(<ViewRouter />);
      expect(screen.getByText('Unable to display this view')).toBeTruthy();
      expect(mocks.standardRouteOutlet).not.toHaveBeenCalled();

      if (change === 'view') mocks.currentView = VIEW_MODES.OVERVIEW;
      if (change === 'user ID') mocks.selectedUser = { login: 'octocat', id: 43 };
      if (change === 'user login') mocks.selectedUser = { login: 'renamed', id: 42 };
      if (change === 'dataset') {
        mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
      }
      rerender(<ViewRouter />);

      expect(screen.queryByText('Unable to display this view')).toBeNull();
      expect(screen.getByText('Standard dashboard')).toBeTruthy();
    }
  );
});

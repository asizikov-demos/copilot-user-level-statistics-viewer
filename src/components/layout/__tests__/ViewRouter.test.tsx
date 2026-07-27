import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import { VIEW_MODES, type ViewMode } from '../../../types/navigation';
import type { StandardViewMode } from '../routes';
import ViewRouter from '../ViewRouter';

interface StandardRouteOutletProps {
  view: StandardViewMode;
  aggregatedMetrics: AggregatedMetrics;
  enterpriseName: string | null;
  onUserSelect: (userLogin: string, userId: number) => void;
}

const mocks = vi.hoisted(() => ({
  currentView: 'userDetails' as ViewMode,
  hasData: true,
  enterpriseName: 'test-enterprise' as string | null,
  aggregatedMetrics: null as AggregatedMetrics | null,
  isLoading: false,
  error: null as string | null,
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
  }),
}));

vi.mock('../../../state/NavigationContext', () => ({
  useNavigation: () => ({
    currentView: mocks.currentView,
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
    return null;
  },
}));

vi.mock('../../features/user-details', () => ({
  UserDetailsRoute: () => {
    mocks.userDetailsRoute();
    return null;
  },
}));

describe('ViewRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentView = VIEW_MODES.USER_DETAILS;
    mocks.hasData = true;
    mocks.enterpriseName = 'test-enterprise';
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    mocks.isLoading = false;
    mocks.error = null;
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
});

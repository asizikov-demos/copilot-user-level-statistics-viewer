import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  aggregateMetrics,
  type AggregatedMetrics,
} from '../../../domain/metricsAggregator';
import { VIEW_MODES } from '../../../types/navigation';
import ViewRouter from '../ViewRouter';

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
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
    currentView: VIEW_MODES.USER_DETAILS,
    selectedUser: mocks.selectedUser,
    navigateTo: mocks.navigateTo,
    selectUser: vi.fn(),
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

describe('ViewRouter user-detail redirects', () => {
  beforeEach(() => {
    mocks.navigateTo.mockClear();
    mocks.selectedUser = null;
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
  });

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

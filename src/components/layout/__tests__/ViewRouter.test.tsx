import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  aggregateMetrics,
} from '../../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import { VIEW_MODES, type ViewMode } from '../../../types/navigation';
import type { CopilotAdoptionReadModel } from '../../../read-models/adoption';
import type { AiAdoptionPhaseReadModel } from '../../../read-models/aiAdoptionPhases';
import type { CopilotImpactReadModel } from '../../../read-models/impact';
import type { LanguagesReadModel } from '../../../read-models/languages';
import ViewRouter from '../ViewRouter';

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  currentView: 'userDetails' as ViewMode,
  selectedUser: null as { id: number; login: string } | null,
  aggregatedMetrics: null as AggregatedMetrics | null,
  copilotAdoptionView: vi.fn<
    (props: { model: CopilotAdoptionReadModel }) => void
  >(),
  aiAdoptionPhaseView: vi.fn<
    (props: { model: AiAdoptionPhaseReadModel }) => void
  >(),
  copilotImpactView: vi.fn<
    (props: { model: CopilotImpactReadModel }) => void
  >(),
  languagesView: vi.fn<
    (props: { model: LanguagesReadModel }) => void
  >(),
  selectLanguagesReadModel: vi.fn<
    (metrics: AggregatedMetrics) => LanguagesReadModel
  >(),
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

vi.mock('../../CopilotAdoptionView', () => ({
  default: (props: { model: CopilotAdoptionReadModel }) => {
    mocks.copilotAdoptionView(props);
    return null;
  },
}));

vi.mock('../../AiAdoptionPhaseView', () => ({
  default: (props: { model: AiAdoptionPhaseReadModel }) => {
    mocks.aiAdoptionPhaseView(props);
    return null;
  },
}));

vi.mock('../../CopilotImpactView', () => ({
  default: (props: { model: CopilotImpactReadModel }) => {
    mocks.copilotImpactView(props);
    return null;
  },
}));

vi.mock('../../LanguagesView', () => ({
  default: (props: { model: LanguagesReadModel }) => {
    mocks.languagesView(props);
    return null;
  },
}));

vi.mock('../../../read-models/languages', () => ({
  selectLanguagesReadModel: mocks.selectLanguagesReadModel,
}));

describe('ViewRouter', () => {
  beforeEach(() => {
    mocks.navigateTo.mockClear();
    mocks.copilotAdoptionView.mockClear();
    mocks.aiAdoptionPhaseView.mockClear();
    mocks.copilotImpactView.mockClear();
    mocks.languagesView.mockClear();
    mocks.selectLanguagesReadModel.mockReset();
    mocks.currentView = VIEW_MODES.USER_DETAILS;
    mocks.selectedUser = null;
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    mocks.selectLanguagesReadModel.mockImplementation((metrics) => ({
      languageStats: metrics.languageStats,
      languageFeatureImpactData: metrics.languageFeatureImpactData,
      dailyLanguageGenerationsData: metrics.dailyLanguageGenerationsData,
      dailyLanguageLocData: metrics.dailyLanguageLocData,
    }));
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

  it('routes Copilot adoption through one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.COPILOT_ADOPTION;

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.copilotAdoptionView).toHaveBeenCalledOnce();
    const props = mocks.copilotAdoptionView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toEqual({
      featureAdoptionData: mocks.aggregatedMetrics?.featureAdoptionData,
      agentModeHeatmapData: mocks.aggregatedMetrics?.agentModeHeatmapData,
      stats: mocks.aggregatedMetrics?.stats,
      dailyAdoptionTrend: mocks.aggregatedMetrics?.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData: mocks.aggregatedMetrics?.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData: mocks.aggregatedMetrics?.dailyCodeReviewAdoptionData,
    });
  });

  it('routes AI adoption phases through one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.AI_ADOPTION_PHASES;

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.aiAdoptionPhaseView).toHaveBeenCalledOnce();
    const props = mocks.aiAdoptionPhaseView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toEqual({
      aiAdoptionPhaseData: mocks.aggregatedMetrics?.aiAdoptionPhaseData,
    });
  });

  it('routes Copilot impact through one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.COPILOT_IMPACT;

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.copilotImpactView).toHaveBeenCalledOnce();
    const props = mocks.copilotImpactView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toEqual({
      agentImpactData: mocks.aggregatedMetrics?.agentImpactData,
      codeCompletionImpactData: mocks.aggregatedMetrics?.codeCompletionImpactData,
      editModeImpactData: mocks.aggregatedMetrics?.editModeImpactData,
      inlineModeImpactData: mocks.aggregatedMetrics?.inlineModeImpactData,
      askModeImpactData: mocks.aggregatedMetrics?.askModeImpactData,
      cliImpactData: mocks.aggregatedMetrics?.cliImpactData,
      joinedImpactData: mocks.aggregatedMetrics?.joinedImpactData,
    });
  });

  it('routes languages through one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.LANGUAGES;
    const expectedModel = {
      languageStats: mocks.aggregatedMetrics!.languageStats,
      languageFeatureImpactData: mocks.aggregatedMetrics!.languageFeatureImpactData,
      dailyLanguageGenerationsData: mocks.aggregatedMetrics!.dailyLanguageGenerationsData,
      dailyLanguageLocData: mocks.aggregatedMetrics!.dailyLanguageLocData,
    };
    mocks.selectLanguagesReadModel.mockReturnValueOnce(expectedModel);

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.selectLanguagesReadModel).toHaveBeenCalledWith(mocks.aggregatedMetrics);
    expect(mocks.languagesView).toHaveBeenCalledOnce();
    const props = mocks.languagesView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toBe(expectedModel);
  });
});

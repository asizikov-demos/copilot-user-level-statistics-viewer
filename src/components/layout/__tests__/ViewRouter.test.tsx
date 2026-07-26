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
import type {
  ClientsReadModel,
  ClientVersionsReadModel,
} from '../../../read-models/clients';
import type { ModelDetailsReadModel } from '../../../read-models/models';
import type { CliAdoptionReadModel } from '../../../read-models/cliAdoption';
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
  clientsView: vi.fn<
    (props: { model: ClientsReadModel }) => void
  >(),
  clientVersionsView: vi.fn<
    (props: { model: ClientVersionsReadModel }) => void
  >(),
  modelDetailsView: vi.fn<
    (props: { model: ModelDetailsReadModel }) => void
  >(),
  cliAdoptionView: vi.fn<
    (props: { model: CliAdoptionReadModel }) => void
  >(),
  selectLanguagesReadModel: vi.fn<
    (metrics: AggregatedMetrics) => LanguagesReadModel
  >(),
  selectClientsReadModel: vi.fn<
    (metrics: AggregatedMetrics) => ClientsReadModel
  >(),
  selectClientVersionsReadModel: vi.fn<
    (metrics: AggregatedMetrics) => ClientVersionsReadModel
  >(),
  selectModelDetailsReadModel: vi.fn<
    (metrics: AggregatedMetrics) => ModelDetailsReadModel
  >(),
  selectCliAdoptionReadModel: vi.fn<
    (metrics: AggregatedMetrics) => CliAdoptionReadModel
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

vi.mock('../../ClientsView', () => ({
  default: (props: { model: ClientsReadModel }) => {
    mocks.clientsView(props);
    return null;
  },
}));

vi.mock('../../ClientVersionsView', () => ({
  default: (props: { model: ClientVersionsReadModel }) => {
    mocks.clientVersionsView(props);
    return null;
  },
}));

vi.mock('../../ModelDetailsView', () => ({
  default: (props: { model: ModelDetailsReadModel }) => {
    mocks.modelDetailsView(props);
    return null;
  },
}));

vi.mock('../../CLIAdoptionView', () => ({
  default: (props: { model: CliAdoptionReadModel }) => {
    mocks.cliAdoptionView(props);
    return null;
  },
}));

vi.mock('../../../read-models/languages', () => ({
  selectLanguagesReadModel: mocks.selectLanguagesReadModel,
}));

vi.mock('../../../read-models/clients', () => ({
  selectClientsReadModel: mocks.selectClientsReadModel,
  selectClientVersionsReadModel: mocks.selectClientVersionsReadModel,
}));

vi.mock('../../../read-models/models', () => ({
  selectModelDetailsReadModel: mocks.selectModelDetailsReadModel,
}));

vi.mock('../../../read-models/cliAdoption', () => ({
  selectCliAdoptionReadModel: mocks.selectCliAdoptionReadModel,
}));

describe('ViewRouter', () => {
  beforeEach(() => {
    mocks.navigateTo.mockClear();
    mocks.copilotAdoptionView.mockClear();
    mocks.aiAdoptionPhaseView.mockClear();
    mocks.copilotImpactView.mockClear();
    mocks.languagesView.mockClear();
    mocks.clientsView.mockClear();
    mocks.clientVersionsView.mockClear();
    mocks.modelDetailsView.mockClear();
    mocks.cliAdoptionView.mockClear();
    mocks.selectLanguagesReadModel.mockReset();
    mocks.selectClientsReadModel.mockReset();
    mocks.selectClientVersionsReadModel.mockReset();
    mocks.selectModelDetailsReadModel.mockReset();
    mocks.selectCliAdoptionReadModel.mockReset();
    mocks.currentView = VIEW_MODES.USER_DETAILS;
    mocks.selectedUser = null;
    mocks.aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    mocks.selectLanguagesReadModel.mockImplementation((metrics) => ({
      languageStats: metrics.languageStats,
      languageFeatureImpactData: metrics.languageFeatureImpactData,
      dailyLanguageGenerationsData: metrics.dailyLanguageGenerationsData,
      dailyLanguageLocData: metrics.dailyLanguageLocData,
    }));
    mocks.selectClientsReadModel.mockImplementation((metrics) => ({
      ideStats: metrics.ideStats,
      multiIDEUsersCount: metrics.multiIDEUsersCount,
      totalUniqueIDEUsers: metrics.totalUniqueIDEUsers,
      cliUsers: metrics.stats.cliUsers,
      cliSessions: 0,
      cliLocAdded: 0,
      cliLocDeleted: 0,
    }));
    mocks.selectClientVersionsReadModel.mockImplementation((metrics) => ({
      pluginVersionData: metrics.pluginVersionData,
      reportStartDay: metrics.stats.reportStartDay,
    }));
    mocks.selectModelDetailsReadModel.mockImplementation((metrics) => ({
      allModels: metrics.modelBreakdownData.allModels,
      modelCategories: metrics.modelBreakdownData.modelCategories,
      autoModels: metrics.modelBreakdownData.autoModels ?? [],
      autoModeAdoptionTrend:
        metrics.modelBreakdownData.autoModeAdoptionTrend ?? [],
      dates: metrics.modelBreakdownData.dates,
      modelTotal: metrics.modelBreakdownData.modelTotal,
      autoTotal: 0,
    }));
    mocks.selectCliAdoptionReadModel.mockImplementation((metrics) => ({
      stats: metrics.stats,
      dailyCliSessionData: metrics.dailyCliSessionData,
      dailyCliTokenData: metrics.dailyCliTokenData,
      dailyCliAdoptionTrend: metrics.dailyCliAdoptionTrend,
      cliModelEntries: metrics.modelBreakdownData.cliModels ?? [],
      cliModelDates: metrics.modelBreakdownData.dates,
      cliModelTotal: metrics.modelBreakdownData.cliTotal ?? 0,
      cliShare: 0,
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

  it('routes clients through the selector and one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.CLIENT_ANALYSIS;
    const expectedModel: ClientsReadModel = {
      ideStats: mocks.aggregatedMetrics!.ideStats,
      multiIDEUsersCount: 4,
      totalUniqueIDEUsers: 5,
      cliUsers: 6,
      cliSessions: 7,
      cliLocAdded: 8,
      cliLocDeleted: 9,
    };
    mocks.selectClientsReadModel.mockReturnValueOnce(expectedModel);

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.selectClientsReadModel).toHaveBeenCalledWith(
      mocks.aggregatedMetrics
    );
    expect(mocks.clientsView).toHaveBeenCalledOnce();
    const props = mocks.clientsView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toBe(expectedModel);
  });

  it('routes client versions through the selector and one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.CLIENT_VERSIONS;
    const expectedModel: ClientVersionsReadModel = {
      pluginVersionData: mocks.aggregatedMetrics!.pluginVersionData,
      reportStartDay: '2026-01-15',
    };
    mocks.selectClientVersionsReadModel.mockReturnValueOnce(expectedModel);

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.selectClientVersionsReadModel).toHaveBeenCalledWith(
      mocks.aggregatedMetrics
    );
    expect(mocks.clientVersionsView).toHaveBeenCalledOnce();
    const props = mocks.clientVersionsView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toBe(expectedModel);
  });

  it('routes model details through the selector and one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.MODEL_DETAILS;
    const expectedModel: ModelDetailsReadModel = {
      allModels: mocks.aggregatedMetrics!.modelBreakdownData.allModels,
      modelCategories:
        mocks.aggregatedMetrics!.modelBreakdownData.modelCategories,
      autoModels: mocks.aggregatedMetrics!.modelBreakdownData.autoModels ?? [],
      autoModeAdoptionTrend:
        mocks.aggregatedMetrics!.modelBreakdownData.autoModeAdoptionTrend ?? [],
      dates: mocks.aggregatedMetrics!.modelBreakdownData.dates,
      modelTotal: 10,
      autoTotal: 4,
    };
    mocks.selectModelDetailsReadModel.mockReturnValueOnce(expectedModel);

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.selectModelDetailsReadModel).toHaveBeenCalledWith(
      mocks.aggregatedMetrics
    );
    expect(mocks.modelDetailsView).toHaveBeenCalledOnce();
    const props = mocks.modelDetailsView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toBe(expectedModel);
  });

  it('routes CLI adoption through the selector and one cohesive read model', () => {
    mocks.currentView = VIEW_MODES.CLI_ADOPTION;
    const expectedModel: CliAdoptionReadModel = {
      stats: mocks.aggregatedMetrics!.stats,
      dailyCliSessionData: mocks.aggregatedMetrics!.dailyCliSessionData,
      dailyCliTokenData: mocks.aggregatedMetrics!.dailyCliTokenData,
      dailyCliAdoptionTrend: mocks.aggregatedMetrics!.dailyCliAdoptionTrend,
      cliModelEntries:
        mocks.aggregatedMetrics!.modelBreakdownData.cliModels ?? [],
      cliModelDates: ['2026-01-15'],
      cliModelTotal: 7,
      cliShare: 12.5,
    };
    mocks.selectCliAdoptionReadModel.mockReturnValueOnce(expectedModel);

    renderToStaticMarkup(<ViewRouter />);

    expect(mocks.selectCliAdoptionReadModel).toHaveBeenCalledWith(
      mocks.aggregatedMetrics
    );
    expect(mocks.cliAdoptionView).toHaveBeenCalledOnce();
    const props = mocks.cliAdoptionView.mock.calls[0][0];
    expect(Object.keys(props)).toEqual(['model']);
    expect(props.model).toBe(expectedModel);
  });
});

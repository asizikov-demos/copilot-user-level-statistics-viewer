import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import type { AiCreditsReadModel } from '../../../../read-models/aiCredits';
import type { AiAdoptionPhaseReadModel } from '../../../../read-models/aiAdoptionPhases';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';
import type { ClientVersionsReadModel } from '../../../../read-models/clients';
import type { CopilotImpactReadModel } from '../../../../read-models/impact';
import type {
  ExecutiveSummaryReadModel,
  OverviewReadModel,
} from '../../../../read-models/overview';
import type { LanguagesReadModel } from '../../../../read-models/languages';
import type { UsersReadModel } from '../../../../read-models/users';
import type { SurfaceProductivityReadModel } from '../../../../read-models/surfaceProductivity';
import type { AggregatedMetrics } from '../../../../types/aggregatedMetrics';
import { VIEW_MODES } from '../../../../types/navigation';
import {
  STANDARD_ROUTE_REGISTRY,
  STANDARD_VIEW_MODES,
  isStandardViewMode,
  resolveStandardRouteAdapter,
} from '../standardRouteRegistry';
import {
  AboutRouteAdapter,
  AiAdoptionPhasesRouteAdapter,
  AiCreditsRouteAdapter,
  CliAdoptionRouteAdapter,
  ClientVersionsRouteAdapter,
  ClientsRouteAdapter,
  CopilotAdoptionRouteAdapter,
  CopilotImpactRouteAdapter,
  ExecutiveSummaryRouteAdapter,
  LanguagesRouteAdapter,
  ModelDetailsRouteAdapter,
  OverviewRouteAdapter,
  UsersRouteAdapter,
  SurfaceProductivityRouteAdapter,
  type StandardRouteContext,
} from '../standardRouteAdapters';

const mocks = vi.hoisted(() => ({
  selectOverviewReadModel:
    vi.fn<(metrics: AggregatedMetrics) => OverviewReadModel>(),
  selectExecutiveSummaryReadModel:
    vi.fn<(metrics: AggregatedMetrics) => ExecutiveSummaryReadModel>(),
  selectUsersReadModel:
    vi.fn<(metrics: AggregatedMetrics) => UsersReadModel>(),
  selectAiCreditsReadModel: vi.fn<
    (
      metrics: AggregatedMetrics,
      onUserSelect: AiCreditsReadModel['onUserClick']
    ) => AiCreditsReadModel
  >(),
  selectAiAdoptionPhaseReadModel:
    vi.fn<(metrics: AggregatedMetrics) => AiAdoptionPhaseReadModel>(),
  selectCopilotAdoptionReadModel:
    vi.fn<(metrics: AggregatedMetrics) => CopilotAdoptionReadModel>(),
  selectClientVersionsReadModel:
    vi.fn<(metrics: AggregatedMetrics) => ClientVersionsReadModel>(),
  selectCopilotImpactReadModel:
    vi.fn<(metrics: AggregatedMetrics) => CopilotImpactReadModel>(),
  selectLanguagesReadModel:
    vi.fn<(metrics: AggregatedMetrics) => LanguagesReadModel>(),
  selectSurfaceProductivityReadModel:
    vi.fn<(metrics: AggregatedMetrics) => SurfaceProductivityReadModel>(),
  overviewView:
    vi.fn<
      (props: {
        model: OverviewReadModel;
        enterpriseName: string | null;
      }) => void
    >(),
  usersView:
    vi.fn<
      (props: {
        model: UsersReadModel;
        onUserClick: StandardRouteContext['onUserSelect'];
      }) => void
    >(),
  aiCreditsView: vi.fn<(props: { model: AiCreditsReadModel }) => void>(),
  aiAdoptionPhaseView:
    vi.fn<(props: { model: AiAdoptionPhaseReadModel }) => void>(),
  copilotAdoptionView:
    vi.fn<(props: { model: CopilotAdoptionReadModel }) => void>(),
  clientVersionsView:
    vi.fn<(props: { model: ClientVersionsReadModel }) => void>(),
  copilotImpactView:
    vi.fn<(props: { model: CopilotImpactReadModel }) => void>(),
  languagesView:
    vi.fn<(props: { model: LanguagesReadModel }) => void>(),
  surfaceProductivityView:
    vi.fn<(props: { model: SurfaceProductivityReadModel }) => void>(),
  aboutView: vi.fn(),
}));

vi.mock('../../../../read-models/overview', () => ({
  selectOverviewReadModel: mocks.selectOverviewReadModel,
  selectExecutiveSummaryReadModel: mocks.selectExecutiveSummaryReadModel,
}));

vi.mock('../../../../read-models/users', () => ({
  selectUsersReadModel: mocks.selectUsersReadModel,
}));

vi.mock('../../../../read-models/aiCredits', () => ({
  selectAiCreditsReadModel: mocks.selectAiCreditsReadModel,
}));

vi.mock('../../../../read-models/aiAdoptionPhases', () => ({
  selectAiAdoptionPhaseReadModel: mocks.selectAiAdoptionPhaseReadModel,
}));

vi.mock('../../../../read-models/adoption', () => ({
  selectCopilotAdoptionReadModel: mocks.selectCopilotAdoptionReadModel,
}));

vi.mock('../../../../read-models/clients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../read-models/clients')>();
  return {
    ...actual,
    selectClientVersionsReadModel: mocks.selectClientVersionsReadModel,
  };
});

vi.mock('../../../../read-models/languages', () => ({
  selectLanguagesReadModel: mocks.selectLanguagesReadModel,
}));

vi.mock('../../../../read-models/impact', () => ({
  selectCopilotImpactReadModel: mocks.selectCopilotImpactReadModel,
}));

vi.mock('../../../../read-models/surfaceProductivity', () => ({
  selectSurfaceProductivityReadModel:
    mocks.selectSurfaceProductivityReadModel,
}));

vi.mock('../../../features/client-versions', () => ({
  ClientVersionsView: (props: { model: ClientVersionsReadModel }) => {
    mocks.clientVersionsView(props);
    return null;
  },
}));

vi.mock('../../../features/adoption', () => ({
  CopilotAdoptionView: (props: { model: CopilotAdoptionReadModel }) => {
    mocks.copilotAdoptionView(props);
    return null;
  },
}));

vi.mock('../../../features/ai-adoption-phases', () => ({
  AiAdoptionPhaseView: (props: { model: AiAdoptionPhaseReadModel }) => {
    mocks.aiAdoptionPhaseView(props);
    return null;
  },
}));

vi.mock('../../../features/impact', () => ({
  CopilotImpactView: (props: { model: CopilotImpactReadModel }) => {
    mocks.copilotImpactView(props);
    return null;
  },
}));

vi.mock('../../../features/languages', () => ({
  LanguagesView: (props: { model: LanguagesReadModel }) => {
    mocks.languagesView(props);
    return null;
  },
}));

vi.mock('../../../features/surface-productivity', () => ({
  SurfaceProductivityView: (props: {
    model: SurfaceProductivityReadModel;
  }) => {
    mocks.surfaceProductivityView(props);
    return null;
  },
}));

vi.mock('../../../features/overview', () => ({
  OverviewDashboard: (props: {
    model: OverviewReadModel;
    enterpriseName: string | null;
  }) => {
    mocks.overviewView(props);
    return null;
  },
}));

vi.mock('../../../features/users', () => ({
  UsersView: (props: {
    model: UsersReadModel;
    onUserClick: StandardRouteContext['onUserSelect'];
  }) => {
    mocks.usersView(props);
    return null;
  },
}));

vi.mock('../../../AiCreditsView', () => ({
  default: (props: { model: AiCreditsReadModel }) => {
    mocks.aiCreditsView(props);
    return null;
  },
}));

vi.mock('../../../AboutView', () => ({
  default: () => {
    mocks.aboutView();
    return null;
  },
}));

describe('standard route registry', () => {
  let context: StandardRouteContext;
  let overviewModel: OverviewReadModel;
  let usersModel: UsersReadModel;
  let aiCreditsModel: AiCreditsReadModel;
  let aiAdoptionPhaseModel: AiAdoptionPhaseReadModel;
  let copilotAdoptionModel: CopilotAdoptionReadModel;
  let clientVersionsModel: ClientVersionsReadModel;
  let copilotImpactModel: CopilotImpactReadModel;
  let languagesModel: LanguagesReadModel;
  let surfaceProductivityModel: SurfaceProductivityReadModel;

  beforeEach(() => {
    const aggregatedMetrics = aggregateMetrics([makeMetric()]).aggregated;
    const onUserSelect = vi.fn();

    overviewModel = {
      reportStartDay: aggregatedMetrics.overview.stats.reportStartDay,
      reportEndDay: aggregatedMetrics.overview.stats.reportEndDay,
      engagementData: aggregatedMetrics.overview.engagementData,
      chatUsersData: aggregatedMetrics.overview.chatUsersData,
      chatRequestsData: aggregatedMetrics.overview.chatRequestsData,
    };
    usersModel = { users: aggregatedMetrics.users.userSummaries };
    aiCreditsModel = {
      reportStartDay: aggregatedMetrics.overview.stats.reportStartDay,
      reportEndDay: aggregatedMetrics.overview.stats.reportEndDay,
      dailyAiCreditsData: aggregatedMetrics.ai.dailyAiCreditsData,
      userSummaries: aggregatedMetrics.users.userSummaries,
      usageDistributionData: aggregatedMetrics.ai.usageDistributionData,
      totalAiCreditsUsed: 0,
      onUserClick: onUserSelect,
    };
    aiAdoptionPhaseModel = {
      aiAdoptionPhaseData: aggregatedMetrics.ai.aiAdoptionPhaseData,
    };
    copilotAdoptionModel = {
      featureAdoptionData: aggregatedMetrics.adoption.featureAdoptionData,
      stats: aggregatedMetrics.overview.stats,
      dailyAdoptionTrend: aggregatedMetrics.adoption.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData: aggregatedMetrics.adoption.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData: aggregatedMetrics.adoption.dailyCodeReviewAdoptionData,
    };
    clientVersionsModel = {
      pluginVersionData: aggregatedMetrics.clients.pluginVersionData,
      reportStartDay: aggregatedMetrics.overview.stats.reportStartDay,
    };
    copilotImpactModel = {
      agentImpactData: aggregatedMetrics.impact.agentImpactData,
      codeCompletionImpactData: aggregatedMetrics.impact.codeCompletionImpactData,
      editModeImpactData: aggregatedMetrics.impact.editModeImpactData,
      inlineModeImpactData: aggregatedMetrics.impact.inlineModeImpactData,
      askModeImpactData: aggregatedMetrics.impact.askModeImpactData,
      copilotAppImpactData: aggregatedMetrics.impact.copilotAppImpactData,
      cliImpactData: aggregatedMetrics.impact.cliImpactData,
      joinedImpactData: aggregatedMetrics.impact.joinedImpactData,
    };
    languagesModel = {
      languageStats: aggregatedMetrics.languages.languageStats,
      languageFeatureImpactData: aggregatedMetrics.languages.languageFeatureImpactData,
      dailyLanguageGenerationsData: aggregatedMetrics.languages.dailyLanguageGenerationsData,
      dailyLanguageLocData: aggregatedMetrics.languages.dailyLanguageLocData,
    };
    surfaceProductivityModel = {
      reportStartDay: aggregatedMetrics.overview.stats.reportStartDay,
      reportEndDay: aggregatedMetrics.overview.stats.reportEndDay,
      totalActiveUsers: aggregatedMetrics.productivity.totalActiveUsers,
      surfaceSummaries: aggregatedMetrics.productivity.surfaceSummaries,
      dailyProductivity: aggregatedMetrics.productivity.dailyProductivity,
      cohortSummaries: aggregatedMetrics.productivity.cohortSummaries,
    };
    context = {
      aggregatedMetrics,
      enterpriseName: 'test-enterprise',
      onUserSelect,
    };

    vi.clearAllMocks();
    mocks.selectOverviewReadModel.mockReturnValue(overviewModel);
    mocks.selectUsersReadModel.mockReturnValue(usersModel);
    mocks.selectAiCreditsReadModel.mockReturnValue(aiCreditsModel);
    mocks.selectAiAdoptionPhaseReadModel.mockReturnValue(aiAdoptionPhaseModel);
    mocks.selectCopilotAdoptionReadModel.mockReturnValue(copilotAdoptionModel);
    mocks.selectClientVersionsReadModel.mockReturnValue(clientVersionsModel);
    mocks.selectCopilotImpactReadModel.mockReturnValue(copilotImpactModel);
    mocks.selectLanguagesReadModel.mockReturnValue(languagesModel);
    mocks.selectSurfaceProductivityReadModel.mockReturnValue(
      surfaceProductivityModel
    );
  });

  it('covers every view mode except specialized user details', () => {
    const expectedModes = Object.values(VIEW_MODES).filter(
      (view) => view !== VIEW_MODES.USER_DETAILS
    );

    expect([...STANDARD_VIEW_MODES].sort()).toEqual(expectedModes.sort());
    expect(Object.keys(STANDARD_ROUTE_REGISTRY).sort()).toEqual(
      expectedModes.sort()
    );
    expect(STANDARD_ROUTE_REGISTRY).not.toHaveProperty(
      VIEW_MODES.USER_DETAILS
    );
  });

  it('maps each standard mode to its feature-owned adapter', () => {
    expect(STANDARD_ROUTE_REGISTRY).toEqual({
      [VIEW_MODES.OVERVIEW]: OverviewRouteAdapter,
      [VIEW_MODES.AI_CREDITS]: AiCreditsRouteAdapter,
      [VIEW_MODES.EXECUTIVE_SUMMARY]: ExecutiveSummaryRouteAdapter,
      [VIEW_MODES.ABOUT]: AboutRouteAdapter,
      [VIEW_MODES.CLIENT_VERSIONS]: ClientVersionsRouteAdapter,
      [VIEW_MODES.USERS]: UsersRouteAdapter,
      [VIEW_MODES.LANGUAGES]: LanguagesRouteAdapter,
      [VIEW_MODES.CLIENT_ANALYSIS]: ClientsRouteAdapter,
      [VIEW_MODES.COPILOT_IMPACT]: CopilotImpactRouteAdapter,
      [VIEW_MODES.COPILOT_ADOPTION]: CopilotAdoptionRouteAdapter,
      [VIEW_MODES.AI_ADOPTION_PHASES]: AiAdoptionPhasesRouteAdapter,
      [VIEW_MODES.MODEL_DETAILS]: ModelDetailsRouteAdapter,
      [VIEW_MODES.CLI_ADOPTION]: CliAdoptionRouteAdapter,
      [VIEW_MODES.SURFACE_PRODUCTIVITY]: SurfaceProductivityRouteAdapter,
    });
  });

  it('recognizes only registered standard view modes', () => {
    expect(isStandardViewMode(VIEW_MODES.ABOUT)).toBe(true);
    expect(isStandardViewMode(VIEW_MODES.USER_DETAILS)).toBe(false);
    expect(isStandardViewMode('unknown')).toBe(false);
  });

  it('selects and renders only the requested overview adapter', () => {
    const RouteAdapter = resolveStandardRouteAdapter(VIEW_MODES.OVERVIEW);

    renderToStaticMarkup(<RouteAdapter {...context} />);

    expect(mocks.selectOverviewReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.overviewView).toHaveBeenCalledWith({
      model: overviewModel,
      enterpriseName: context.enterpriseName,
    });
    expect(mocks.selectUsersReadModel).not.toHaveBeenCalled();
    expect(mocks.selectAiCreditsReadModel).not.toHaveBeenCalled();
  });

  it('forwards the same user-selection callback through user-aware adapters', () => {
    const UsersAdapter = resolveStandardRouteAdapter(VIEW_MODES.USERS);
    const AiCreditsAdapter = resolveStandardRouteAdapter(VIEW_MODES.AI_CREDITS);

    renderToStaticMarkup(<UsersAdapter {...context} />);
    renderToStaticMarkup(<AiCreditsAdapter {...context} />);

    expect(mocks.usersView).toHaveBeenCalledWith({
      model: usersModel,
      onUserClick: context.onUserSelect,
    });
    expect(mocks.selectAiCreditsReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics,
      context.onUserSelect
    );
    expect(mocks.aiCreditsView).toHaveBeenCalledWith({
      model: aiCreditsModel,
    });
  });

  it('selects and renders the feature-owned client versions adapter', () => {
    const ClientVersionsAdapter = resolveStandardRouteAdapter(
      VIEW_MODES.CLIENT_VERSIONS
    );

    renderToStaticMarkup(<ClientVersionsAdapter {...context} />);

    expect(mocks.selectClientVersionsReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.clientVersionsView).toHaveBeenCalledWith({
      model: clientVersionsModel,
    });
    expect(mocks.selectOverviewReadModel).not.toHaveBeenCalled();
    expect(mocks.selectUsersReadModel).not.toHaveBeenCalled();
    expect(mocks.selectAiCreditsReadModel).not.toHaveBeenCalled();
  });

  it('selects and renders the feature-owned languages adapter', () => {
    const LanguagesAdapter = resolveStandardRouteAdapter(VIEW_MODES.LANGUAGES);

    renderToStaticMarkup(<LanguagesAdapter {...context} />);

    expect(mocks.selectLanguagesReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.languagesView).toHaveBeenCalledWith({
      model: languagesModel,
    });
    expect(mocks.selectOverviewReadModel).not.toHaveBeenCalled();
    expect(mocks.selectUsersReadModel).not.toHaveBeenCalled();
    expect(mocks.selectAiCreditsReadModel).not.toHaveBeenCalled();
  });

  it('selects and renders the feature-owned adoption and impact adapters', () => {
    const CopilotAdoptionAdapter = resolveStandardRouteAdapter(
      VIEW_MODES.COPILOT_ADOPTION
    );
    const AiAdoptionPhasesAdapter = resolveStandardRouteAdapter(
      VIEW_MODES.AI_ADOPTION_PHASES
    );
    const CopilotImpactAdapter = resolveStandardRouteAdapter(
      VIEW_MODES.COPILOT_IMPACT
    );

    renderToStaticMarkup(<CopilotAdoptionAdapter {...context} />);
    renderToStaticMarkup(<AiAdoptionPhasesAdapter {...context} />);
    renderToStaticMarkup(<CopilotImpactAdapter {...context} />);

    expect(mocks.selectCopilotAdoptionReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.copilotAdoptionView).toHaveBeenCalledWith({
      model: copilotAdoptionModel,
    });

    expect(mocks.selectAiAdoptionPhaseReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.aiAdoptionPhaseView).toHaveBeenCalledWith({
      model: aiAdoptionPhaseModel,
    });
    expect(mocks.selectCopilotImpactReadModel).toHaveBeenCalledWith(
      context.aggregatedMetrics
    );
    expect(mocks.copilotImpactView).toHaveBeenCalledWith({
      model: copilotImpactModel,
    });
    expect(mocks.selectOverviewReadModel).not.toHaveBeenCalled();
    expect(mocks.selectUsersReadModel).not.toHaveBeenCalled();
    expect(mocks.selectAiCreditsReadModel).not.toHaveBeenCalled();
  });

  it('selects and renders the surface productivity adapter', () => {
    const SurfaceProductivityAdapter = resolveStandardRouteAdapter(
      VIEW_MODES.SURFACE_PRODUCTIVITY
    );

    renderToStaticMarkup(<SurfaceProductivityAdapter {...context} />);

    expect(
      mocks.selectSurfaceProductivityReadModel
    ).toHaveBeenCalledWith(context.aggregatedMetrics);
    expect(mocks.surfaceProductivityView).toHaveBeenCalledWith({
      model: surfaceProductivityModel,
    });
  });

  it('renders about without selecting aggregate-backed models', () => {
    const AboutAdapter = resolveStandardRouteAdapter(VIEW_MODES.ABOUT);

    renderToStaticMarkup(<AboutAdapter {...context} />);

    expect(mocks.aboutView).toHaveBeenCalledOnce();
    expect(mocks.selectOverviewReadModel).not.toHaveBeenCalled();
    expect(mocks.selectUsersReadModel).not.toHaveBeenCalled();
    expect(mocks.selectAiCreditsReadModel).not.toHaveBeenCalled();
  });

  it('falls back to overview for unknown modes', () => {
    expect(resolveStandardRouteAdapter('unknown')).toBe(
      STANDARD_ROUTE_REGISTRY[VIEW_MODES.OVERVIEW]
    );
  });
});

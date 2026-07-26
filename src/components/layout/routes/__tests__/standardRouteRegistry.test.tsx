import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import type { AiCreditsReadModel } from '../../../../read-models/aiCredits';
import type {
  ExecutiveSummaryReadModel,
  OverviewReadModel,
} from '../../../../read-models/overview';
import type { UsersReadModel } from '../../../../read-models/users';
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

vi.mock('../../../features/overview', () => ({
  OverviewDashboard: (props: {
    model: OverviewReadModel;
    enterpriseName: string | null;
  }) => {
    mocks.overviewView(props);
    return null;
  },
}));

vi.mock('../../../UniqueUsersView', () => ({
  default: (props: {
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
    context = {
      aggregatedMetrics,
      enterpriseName: 'test-enterprise',
      onUserSelect,
    };

    vi.clearAllMocks();
    mocks.selectOverviewReadModel.mockReturnValue(overviewModel);
    mocks.selectUsersReadModel.mockReturnValue(usersModel);
    mocks.selectAiCreditsReadModel.mockReturnValue(aiCreditsModel);
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

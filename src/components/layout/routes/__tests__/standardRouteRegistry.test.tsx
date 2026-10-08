import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AggregatedMetrics } from '../../../../types/aggregatedMetrics';
import { VIEW_MODES } from '../../../../types/navigation';
import {
  STANDARD_ROUTE_REGISTRY,
  STANDARD_VIEW_MODES,
  isStandardViewMode,
  resolveStandardRouteAdapter,
  type StandardViewMode,
} from '../standardRouteRegistry';
import type { StandardRouteContext } from '../standardRouteAdapters';

const mocks = vi.hoisted(() => {
  const selector = (name: string) => vi.fn(() => ({ selectedBy: name }));
  const view = vi.fn<(name: string, props: object) => void>();
  return {
    selectors: {
      selectOverviewReadModel: selector('selectOverviewReadModel'),
      selectExecutiveSummaryReadModel: selector('selectExecutiveSummaryReadModel'),
      selectUsersReadModel: selector('selectUsersReadModel'),
      selectAiCreditsReadModel: selector('selectAiCreditsReadModel'),
      selectAiAdoptionPhaseReadModel: selector('selectAiAdoptionPhaseReadModel'),
      selectCopilotAdoptionReadModel: selector('selectCopilotAdoptionReadModel'),
      selectCliAdoptionReadModel: selector('selectCliAdoptionReadModel'),
      selectClientsReadModel: selector('selectClientsReadModel'),
      selectClientVersionsReadModel: selector('selectClientVersionsReadModel'),
      selectCopilotImpactReadModel: selector('selectCopilotImpactReadModel'),
      selectLanguagesReadModel: selector('selectLanguagesReadModel'),
      selectModelDetailsReadModel: selector('selectModelDetailsReadModel'),
      selectSurfaceProductivityReadModel: selector('selectSurfaceProductivityReadModel'),
    },
    view,
    stubView: (name: string) => (props: object) => {
      view(name, props);
      return null;
    },
  };
});

type SelectorName = keyof typeof mocks.selectors;

vi.mock('../../../../read-models/overview', () => ({
  selectOverviewReadModel: mocks.selectors.selectOverviewReadModel,
  selectExecutiveSummaryReadModel: mocks.selectors.selectExecutiveSummaryReadModel,
}));
vi.mock('../../../../read-models/users', () => ({
  selectUsersReadModel: mocks.selectors.selectUsersReadModel,
}));
vi.mock('../../../../read-models/aiCredits', () => ({
  selectAiCreditsReadModel: mocks.selectors.selectAiCreditsReadModel,
}));
vi.mock('../../../../read-models/aiAdoptionPhases', () => ({
  selectAiAdoptionPhaseReadModel: mocks.selectors.selectAiAdoptionPhaseReadModel,
}));
vi.mock('../../../../read-models/adoption', () => ({
  selectCopilotAdoptionReadModel: mocks.selectors.selectCopilotAdoptionReadModel,
}));
vi.mock('../../../../read-models/cliAdoption', () => ({
  selectCliAdoptionReadModel: mocks.selectors.selectCliAdoptionReadModel,
}));
vi.mock('../../../../read-models/clients', () => ({
  selectClientsReadModel: mocks.selectors.selectClientsReadModel,
  selectClientVersionsReadModel: mocks.selectors.selectClientVersionsReadModel,
}));
vi.mock('../../../../read-models/impact', () => ({
  selectCopilotImpactReadModel: mocks.selectors.selectCopilotImpactReadModel,
}));
vi.mock('../../../../read-models/languages', () => ({
  selectLanguagesReadModel: mocks.selectors.selectLanguagesReadModel,
}));
vi.mock('../../../../read-models/models', () => ({
  selectModelDetailsReadModel: mocks.selectors.selectModelDetailsReadModel,
}));
vi.mock('../../../../read-models/surfaceProductivity', () => ({
  selectSurfaceProductivityReadModel: mocks.selectors.selectSurfaceProductivityReadModel,
}));

vi.mock('../../../AboutView', () => ({ default: mocks.stubView('AboutView') }));
vi.mock('../../../AiCreditsView', () => ({ default: mocks.stubView('AiCreditsView') }));
vi.mock('../../../CLIAdoptionView', () => ({ default: mocks.stubView('CLIAdoptionView') }));
vi.mock('../../../ClientsView', () => ({ default: mocks.stubView('ClientsView') }));
vi.mock('../../../ExecutiveSummaryView', () => ({
  default: mocks.stubView('ExecutiveSummaryView'),
}));
vi.mock('../../../ModelDetailsView', () => ({ default: mocks.stubView('ModelDetailsView') }));
vi.mock('../../../features/ai-adoption-phases', () => ({
  AiAdoptionPhaseView: mocks.stubView('AiAdoptionPhaseView'),
}));
vi.mock('../../../features/adoption', () => ({
  CopilotAdoptionView: mocks.stubView('CopilotAdoptionView'),
}));
vi.mock('../../../features/client-versions', () => ({
  ClientVersionsView: mocks.stubView('ClientVersionsView'),
}));
vi.mock('../../../features/impact', () => ({
  CopilotImpactView: mocks.stubView('CopilotImpactView'),
}));
vi.mock('../../../features/languages', () => ({
  LanguagesView: mocks.stubView('LanguagesView'),
}));
vi.mock('../../../features/overview', () => ({
  OverviewDashboard: mocks.stubView('OverviewDashboard'),
}));
vi.mock('../../../features/users', () => ({ UsersView: mocks.stubView('UsersView') }));
vi.mock('../../../features/surface-productivity', () => ({
  SurfaceProductivityView: mocks.stubView('SurfaceProductivityView'),
}));

function makeStandardRouteContext(
  overrides: Partial<StandardRouteContext> = {}
): StandardRouteContext {
  return {
    aggregatedMetrics: {} as AggregatedMetrics,
    enterpriseName: 'test-enterprise',
    dataWarning: 'One file failed to load.',
    onUserSelect: vi.fn(),
    ...overrides,
  };
}

interface AdapterCase {
  mode: StandardViewMode;
  view: string;
  selector?: SelectorName;
  selectorUsesUserSelect?: boolean;
  extraProps?: (context: StandardRouteContext) => object;
}

const ADAPTER_CASES: AdapterCase[] = [
  {
    mode: VIEW_MODES.OVERVIEW,
    view: 'OverviewDashboard',
    selector: 'selectOverviewReadModel',
    extraProps: ({ enterpriseName }) => ({ enterpriseName }),
  },
  {
    mode: VIEW_MODES.AI_CREDITS,
    view: 'AiCreditsView',
    selector: 'selectAiCreditsReadModel',
    selectorUsesUserSelect: true,
  },
  {
    mode: VIEW_MODES.EXECUTIVE_SUMMARY,
    view: 'ExecutiveSummaryView',
    selector: 'selectExecutiveSummaryReadModel',
    extraProps: ({ enterpriseName, dataWarning }) => ({ enterpriseName, dataWarning }),
  },
  { mode: VIEW_MODES.ABOUT, view: 'AboutView' },
  {
    mode: VIEW_MODES.CLIENT_VERSIONS,
    view: 'ClientVersionsView',
    selector: 'selectClientVersionsReadModel',
  },
  {
    mode: VIEW_MODES.USERS,
    view: 'UsersView',
    selector: 'selectUsersReadModel',
    extraProps: ({ onUserSelect }) => ({ onUserClick: onUserSelect }),
  },
  { mode: VIEW_MODES.LANGUAGES, view: 'LanguagesView', selector: 'selectLanguagesReadModel' },
  { mode: VIEW_MODES.CLIENT_ANALYSIS, view: 'ClientsView', selector: 'selectClientsReadModel' },
  {
    mode: VIEW_MODES.COPILOT_IMPACT,
    view: 'CopilotImpactView',
    selector: 'selectCopilotImpactReadModel',
  },
  {
    mode: VIEW_MODES.COPILOT_ADOPTION,
    view: 'CopilotAdoptionView',
    selector: 'selectCopilotAdoptionReadModel',
  },
  {
    mode: VIEW_MODES.AI_ADOPTION_PHASES,
    view: 'AiAdoptionPhaseView',
    selector: 'selectAiAdoptionPhaseReadModel',
  },
  {
    mode: VIEW_MODES.MODEL_DETAILS,
    view: 'ModelDetailsView',
    selector: 'selectModelDetailsReadModel',
  },
  { mode: VIEW_MODES.CLI_ADOPTION, view: 'CLIAdoptionView', selector: 'selectCliAdoptionReadModel' },
  {
    mode: VIEW_MODES.SURFACE_PRODUCTIVITY,
    view: 'SurfaceProductivityView',
    selector: 'selectSurfaceProductivityReadModel',
  },
];

describe('standard route registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers every view mode except specialized user details', () => {
    const expectedModes = Object.values(VIEW_MODES)
      .filter((view) => view !== VIEW_MODES.USER_DETAILS)
      .sort();

    expect([...STANDARD_VIEW_MODES].sort()).toEqual(expectedModes);
    expect(Object.keys(STANDARD_ROUTE_REGISTRY).sort()).toEqual(expectedModes);
    expect(ADAPTER_CASES.map(({ mode }) => mode).sort()).toEqual(expectedModes);
  });

  it('recognizes only registered standard view modes', () => {
    expect(isStandardViewMode(VIEW_MODES.ABOUT)).toBe(true);
    expect(isStandardViewMode(VIEW_MODES.USER_DETAILS)).toBe(false);
    expect(isStandardViewMode('unknown')).toBe(false);
  });

  it('falls back to overview for unknown modes', () => {
    expect(resolveStandardRouteAdapter('unknown')).toBe(
      STANDARD_ROUTE_REGISTRY[VIEW_MODES.OVERVIEW]
    );
  });

  it.each(ADAPTER_CASES)(
    '$mode adapter selects only its read model and renders $view',
    ({ mode, view, selector, selectorUsesUserSelect, extraProps }) => {
      const context = makeStandardRouteContext();
      const RouteAdapter = resolveStandardRouteAdapter(mode);

      renderToStaticMarkup(<RouteAdapter {...context} />);

      const selectorCalls = Object.values(mocks.selectors).reduce(
        (total, fn) => total + fn.mock.calls.length,
        0
      );
      expect(selectorCalls).toBe(selector ? 1 : 0);

      if (selector) {
        const expectedArgs = selectorUsesUserSelect
          ? [context.aggregatedMetrics, context.onUserSelect]
          : [context.aggregatedMetrics];
        expect(mocks.selectors[selector]).toHaveBeenCalledWith(...expectedArgs);
      }

      expect(mocks.view).toHaveBeenCalledOnce();
      expect(mocks.view).toHaveBeenCalledWith(view, {
        ...(selector ? { model: { selectedBy: selector } } : {}),
        ...extraProps?.(context),
      });
    }
  );
});

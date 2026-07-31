import { VIEW_MODES, type ViewMode } from '../../../types/navigation';
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
  type StandardRouteAdapter,
} from './standardRouteAdapters';

export type StandardViewMode = Exclude<
  ViewMode,
  typeof VIEW_MODES.USER_DETAILS
>;

export const STANDARD_VIEW_MODES = [
  VIEW_MODES.OVERVIEW,
  VIEW_MODES.AI_CREDITS,
  VIEW_MODES.EXECUTIVE_SUMMARY,
  VIEW_MODES.ABOUT,
  VIEW_MODES.CLIENT_VERSIONS,
  VIEW_MODES.USERS,
  VIEW_MODES.LANGUAGES,
  VIEW_MODES.CLIENT_ANALYSIS,
  VIEW_MODES.COPILOT_IMPACT,
  VIEW_MODES.COPILOT_ADOPTION,
  VIEW_MODES.AI_ADOPTION_PHASES,
  VIEW_MODES.MODEL_DETAILS,
  VIEW_MODES.CLI_ADOPTION,
  VIEW_MODES.SURFACE_PRODUCTIVITY,
] as const satisfies readonly StandardViewMode[];

export const STANDARD_ROUTE_REGISTRY = {
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
} satisfies Record<StandardViewMode, StandardRouteAdapter>;

export function isStandardViewMode(view: string): view is StandardViewMode {
  return STANDARD_VIEW_MODES.some((standardView) => standardView === view);
}

export function resolveStandardRouteAdapter(
  view: string
): StandardRouteAdapter {
  if (isStandardViewMode(view)) {
    return STANDARD_ROUTE_REGISTRY[view];
  }

  return STANDARD_ROUTE_REGISTRY[VIEW_MODES.OVERVIEW];
}

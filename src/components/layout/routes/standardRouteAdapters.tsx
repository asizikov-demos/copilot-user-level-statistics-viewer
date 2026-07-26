import type { ComponentType } from 'react';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import { selectAiCreditsReadModel } from '../../../read-models/aiCredits';
import { selectAiAdoptionPhaseReadModel } from '../../../read-models/aiAdoptionPhases';
import { selectCopilotAdoptionReadModel } from '../../../read-models/adoption';
import { selectCliAdoptionReadModel } from '../../../read-models/cliAdoption';
import {
  selectClientsReadModel,
  selectClientVersionsReadModel,
} from '../../../read-models/clients';
import { selectCopilotImpactReadModel } from '../../../read-models/impact';
import { selectLanguagesReadModel } from '../../../read-models/languages';
import { selectModelDetailsReadModel } from '../../../read-models/models';
import {
  selectExecutiveSummaryReadModel,
  selectOverviewReadModel,
} from '../../../read-models/overview';
import { selectUsersReadModel } from '../../../read-models/users';
import AboutView from '../../AboutView';
import AiAdoptionPhaseView from '../../AiAdoptionPhaseView';
import AiCreditsView from '../../AiCreditsView';
import CLIAdoptionView from '../../CLIAdoptionView';
import ClientVersionsView from '../../ClientVersionsView';
import ClientsView from '../../ClientsView';
import CopilotAdoptionView from '../../CopilotAdoptionView';
import CopilotImpactView from '../../CopilotImpactView';
import ExecutiveSummaryView from '../../ExecutiveSummaryView';
import LanguagesView from '../../LanguagesView';
import ModelDetailsView from '../../ModelDetailsView';
import UniqueUsersView from '../../UniqueUsersView';
import { OverviewDashboard } from '../../features/overview';

export interface StandardRouteContext {
  aggregatedMetrics: AggregatedMetrics;
  enterpriseName: string | null;
  onUserSelect: (userLogin: string, userId: number) => void;
}

export type StandardRouteAdapter = ComponentType<StandardRouteContext>;

export function OverviewRouteAdapter({
  aggregatedMetrics,
  enterpriseName,
}: StandardRouteContext) {
  return (
    <OverviewDashboard
      model={selectOverviewReadModel(aggregatedMetrics)}
      enterpriseName={enterpriseName}
    />
  );
}

export function AiCreditsRouteAdapter({
  aggregatedMetrics,
  onUserSelect,
}: StandardRouteContext) {
  return (
    <AiCreditsView
      model={selectAiCreditsReadModel(aggregatedMetrics, onUserSelect)}
    />
  );
}

export function ExecutiveSummaryRouteAdapter({
  aggregatedMetrics,
  enterpriseName,
}: StandardRouteContext) {
  return (
    <ExecutiveSummaryView
      model={selectExecutiveSummaryReadModel(aggregatedMetrics)}
      enterpriseName={enterpriseName}
    />
  );
}

export const AboutRouteAdapter: StandardRouteAdapter = () => <AboutView />;

export function ClientVersionsRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <ClientVersionsView
      model={selectClientVersionsReadModel(aggregatedMetrics)}
    />
  );
}

export function UsersRouteAdapter({
  aggregatedMetrics,
  onUserSelect,
}: StandardRouteContext) {
  return (
    <UniqueUsersView
      model={selectUsersReadModel(aggregatedMetrics)}
      onUserClick={onUserSelect}
    />
  );
}

export function LanguagesRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return <LanguagesView model={selectLanguagesReadModel(aggregatedMetrics)} />;
}

export function ClientsRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return <ClientsView model={selectClientsReadModel(aggregatedMetrics)} />;
}

export function CopilotImpactRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <CopilotImpactView
      model={selectCopilotImpactReadModel(aggregatedMetrics)}
    />
  );
}

export function CopilotAdoptionRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <CopilotAdoptionView
      model={selectCopilotAdoptionReadModel(aggregatedMetrics)}
    />
  );
}

export function AiAdoptionPhasesRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <AiAdoptionPhaseView
      model={selectAiAdoptionPhaseReadModel(aggregatedMetrics)}
    />
  );
}

export function ModelDetailsRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <ModelDetailsView
      model={selectModelDetailsReadModel(aggregatedMetrics)}
    />
  );
}

export function CliAdoptionRouteAdapter({
  aggregatedMetrics,
}: StandardRouteContext) {
  return (
    <CLIAdoptionView
      model={selectCliAdoptionReadModel(aggregatedMetrics)}
    />
  );
}

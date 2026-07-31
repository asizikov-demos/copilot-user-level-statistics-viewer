import type {
  CopilotSurface,
  SurfaceCohort,
} from '../../../types/surfaceProductivity';

export interface SurfaceMetadata {
  label: string;
  shortDescription: string;
  color: string;
  dotClassName: string;
}

export const SURFACE_ORDER: readonly CopilotSurface[] = [
  'ide',
  'cli',
  'copilotApp',
];

export const SURFACE_METADATA: Record<CopilotSurface, SurfaceMetadata> = {
  ide: {
    label: 'IDE',
    shortDescription: 'Editor-attributed activity across installed IDE clients',
    color: 'rgb(59, 130, 246)',
    dotClassName: 'bg-blue-500',
  },
  cli: {
    label: 'CLI',
    shortDescription: 'Copilot CLI sessions and CLI-attributed code impact',
    color: 'rgb(244, 63, 94)',
    dotClassName: 'bg-rose-500',
  },
  copilotApp: {
    label: 'Copilot App',
    shortDescription: 'Activity attributed to the Copilot App surface',
    color: 'rgb(20, 184, 166)',
    dotClassName: 'bg-teal-500',
  },
};

export const COHORT_LABELS: Record<SurfaceCohort, string> = {
  ideOnly: 'IDE only',
  cliOnly: 'CLI only',
  copilotAppOnly: 'Copilot App only',
  multiSurface: 'Multiple surfaces',
};

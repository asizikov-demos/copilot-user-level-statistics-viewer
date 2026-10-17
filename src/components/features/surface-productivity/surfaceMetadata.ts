import type {
  CopilotSurface,
  SurfaceCohort,
} from '../../../types/surfaceProductivity';
import { chartColors, type ChartColor } from '../../charts/utils/chartColors';

export interface SurfaceMetadata {
  label: string;
  shortDescription: string;
  readonly color: string;
  dotClassName: string;
}

function createSurfaceMetadata(
  metadata: Omit<SurfaceMetadata, 'color'>,
  chartColor: ChartColor,
): SurfaceMetadata {
  return {
    ...metadata,
    get color() {
      return chartColor.solid;
    },
  };
}

export const SURFACE_ORDER: readonly CopilotSurface[] = [
  'ide',
  'cli',
  'copilotApp',
];

export const SURFACE_METADATA: Record<CopilotSurface, SurfaceMetadata> = {
  ide: createSurfaceMetadata({
    label: 'IDE',
    shortDescription: 'Editor-attributed activity across installed IDE clients',
    dotClassName: 'bg-[var(--data-blue-color-emphasis)]',
  }, chartColors.blue),
  cli: createSurfaceMetadata({
    label: 'CLI',
    shortDescription: 'Copilot CLI sessions and CLI-attributed code impact',
    dotClassName: 'bg-[var(--data-coral-color-emphasis)]',
  }, chartColors.rose),
  copilotApp: createSurfaceMetadata({
    label: 'Copilot App',
    shortDescription: 'Activity attributed to the Copilot App surface',
    dotClassName: 'bg-[var(--data-teal-color-emphasis)]',
  }, chartColors.teal),
};

export const COHORT_LABELS: Record<SurfaceCohort, string> = {
  ideOnly: 'IDE only',
  cliOnly: 'CLI only',
  copilotAppOnly: 'Copilot App only',
  multiSurface: 'Multiple surfaces',
};

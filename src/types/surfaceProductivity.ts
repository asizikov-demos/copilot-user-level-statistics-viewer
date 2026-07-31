export type CopilotSurface = 'ide' | 'cli' | 'copilotApp';

export interface DailySurfaceProductivity {
  date: string;
  surfaces: Record<CopilotSurface, {
    activeUsers: number;
    locAdded: number;
    locDeleted: number;
    netLocImpact: number;
  }>;
}

export interface SurfaceProductivitySummary {
  surface: CopilotSurface;
  uniqueUsers: number;
  reachPercentage: number;
  activeUserDays: number;
  activeDaysPerUser: number;
  locAdded: number;
  locDeleted: number;
  netLocImpact: number;
  netLocPerActiveDay: number;
}

export type SurfaceCohort =
  | 'ideOnly'
  | 'cliOnly'
  | 'copilotAppOnly'
  | 'multiSurface';

export interface SurfaceCohortSummary {
  cohort: SurfaceCohort;
  users: number;
  medianActiveDays: number;
  medianNetLocImpact: number;
}

export interface SurfaceProductivityMetrics {
  totalActiveUsers: number;
  surfaceSummaries: SurfaceProductivitySummary[];
  dailyProductivity: DailySurfaceProductivity[];
  cohortSummaries: SurfaceCohortSummary[];
}

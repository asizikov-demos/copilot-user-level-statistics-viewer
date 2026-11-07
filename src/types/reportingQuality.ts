export type ClientTelemetryStatus = 'missing' | 'received' | 'unreported';
export type ComponentRequirementStatus = 'unmet' | 'unknown' | 'met';

export interface ComponentRequirement {
  component: string;
  status: ComponentRequirementStatus;
}

export interface DayReportingQuality {
  day: string;
  telemetryStatus: ClientTelemetryStatus;
  requirements: ComponentRequirement[] | null;
  requirementCounts: { met: number; unmet: number; unknown: number } | null;
}

export interface UserReportingQuality {
  daily: DayReportingQuality[];
  uploadedDays: number;
  telemetryReportedDays: number;
  serverOnlyDays: number;
}

export interface ReportingQualityCounts {
  recordCount: number;
  telemetryReportedRecords: number;
  requirementsReportedRecords: number;
  missingTelemetryUsers: number | null;
  belowMinimumUsers: number | null;
}

export interface ReportingQualityComponent {
  component: string;
  unmetUsers: number;
  unknownUsers: number;
}

export interface ReportingQualityUser {
  userId: number;
  userLogin: string;
  missingTelemetryDays: number;
  belowMinimumDays: number;
  affectedComponents: string[];
  lastMissingTelemetryDay: string | null;
  lastBelowMinimumDay: string | null;
  lastIssueDay: string;
}

export interface ReportingQualityMetrics {
  reportStartDay: string;
  reportEndDay: string;
  summary: ReportingQualityCounts;
  daily: Array<ReportingQualityCounts & { day: string }>;
  components: ReportingQualityComponent[];
  affectedUsers: ReportingQualityUser[];
}

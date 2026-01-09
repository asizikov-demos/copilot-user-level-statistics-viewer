import {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
} from '../../domain/calculators/metricCalculators';
import { MetricsStats, UserSummary } from '../../types/metrics';

export interface ExportData {
  stats: MetricsStats;
  enterpriseName: string | null;
  userSummaries: UserSummary[];
  languageStats: LanguageStats[];
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
}

export type {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  MetricsStats,
  UserSummary,
};

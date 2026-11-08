import type { CopilotClientUsageTotals, CopilotMetrics } from '../../types/metrics';
import { getCanonicalUserInitiatedInteractionCount } from '../assumedInteractions';
import {
  getChatModeBucket,
  isAgentFeature,
  isCliFeature,
  isCodeCompletionFeature,
  isCopilotAppFeature,
} from '../featureCategories';

type LocalAgentSurface = 'editorAgent' | 'cli' | 'app' | 'vscodeAgents';

export interface WorkingPatternsCoverage {
  clientTrafficReportedRecords: number;
  cloudAgentReportedRecords: number;
  codeReviewReportedRecords: number;
  appReportedRecords: number;
  vscodeAgentsReportedRecords: number;
}

export interface WorkingPatternsSummary {
  reportStartDay: string;
  reportEndDay: string;
  recordCount: number;
  totalUsers: number;
  assistanceUsers: number;
  localAgentUsers: number;
  delegatedUsers: number | null;
  multipleLocalSurfaceUsers: number;
  localAndDelegatedUsers: number | null;
  usersWithoutPatternEvidence: number;
  coverage: WorkingPatternsCoverage;
}

export interface WorkingPatternsAccumulator {
  reportStartDay: string;
  reportEndDay: string;
  recordCount: number;
  users: Map<number, {
    assistance: boolean;
    localSurfaces: Set<LocalAgentSurface>;
    delegated: boolean;
  }>;
  coverage: WorkingPatternsCoverage;
}

export function createWorkingPatternsAccumulator(): WorkingPatternsAccumulator {
  return {
    reportStartDay: '',
    reportEndDay: '',
    recordCount: 0,
    users: new Map(),
    coverage: {
      clientTrafficReportedRecords: 0,
      cloudAgentReportedRecords: 0,
      codeReviewReportedRecords: 0,
      appReportedRecords: 0,
      vscodeAgentsReportedRecords: 0,
    },
  };
}

function hasClientActivity(totals: CopilotClientUsageTotals | undefined): boolean {
  return Boolean(totals && [
    totals.session_count,
    totals.request_count,
    totals.prompt_count,
    totals.token_usage.prompt_tokens_sum,
    totals.token_usage.output_tokens_sum,
  ].some(value => value > 0));
}

function hasEditorActivity(feature: CopilotMetrics['totals_by_feature'][number] | CopilotMetrics['totals_by_ide'][number]): boolean {
  return ('feature' in feature
    ? getCanonicalUserInitiatedInteractionCount(feature)
    : feature.user_initiated_interaction_count) > 0
    || feature.code_generation_activity_count > 0
    || feature.code_acceptance_activity_count > 0
    || feature.loc_added_sum !== 0
    || feature.loc_deleted_sum !== 0
    || feature.loc_suggested_to_add_sum !== 0
    || feature.loc_suggested_to_delete_sum !== 0;
}

export function accumulateWorkingPatterns(
  accumulator: WorkingPatternsAccumulator,
  metric: CopilotMetrics,
  usedCopilotCloudAgent: boolean,
): void {
  const start = metric.report_start_day < metric.day ? metric.report_start_day : metric.day;
  const end = metric.report_end_day > metric.day ? metric.report_end_day : metric.day;
  if (!accumulator.reportStartDay || start < accumulator.reportStartDay) accumulator.reportStartDay = start;
  if (!accumulator.reportEndDay || end > accumulator.reportEndDay) accumulator.reportEndDay = end;
  accumulator.recordCount++;
  let user = accumulator.users.get(metric.user_id);
  if (!user) {
    user = { assistance: false, localSurfaces: new Set(), delegated: false };
    accumulator.users.set(metric.user_id, user);
  }
  const { coverage } = accumulator;
  const sources = metric.workingPatternSources;
  if (sources?.cloudAgent ?? metric.used_copilot_cloud_agent != null) coverage.cloudAgentReportedRecords++;
  if (sources?.codeReview ?? (metric.used_copilot_code_review_active != null || metric.used_copilot_code_review_passive != null)) {
    coverage.codeReviewReportedRecords++;
  }
  if (sources?.app ?? (metric.used_copilot_app != null || metric.totals_by_copilot_app != null)) coverage.appReportedRecords++;
  if (sources?.vscodeAgents ?? (metric.used_vscode_agent != null || metric.totals_by_vscode_agent != null)) coverage.vscodeAgentsReportedRecords++;
  if (sources?.clientTraffic ?? metric.totals_by_client != null) coverage.clientTrafficReportedRecords++;

  if (metric.used_agent) user.localSurfaces.add('editorAgent');
  if (metric.used_cli || hasClientActivity(metric.totals_by_cli)) user.localSurfaces.add('cli');
  if ((sources?.appUsage ?? metric.used_copilot_app)
    || hasClientActivity(metric.totals_by_copilot_app)
    || metric.totals_by_ide.some(ide => ide.ide === 'copilot_app' && hasEditorActivity(ide))) {
    user.localSurfaces.add('app');
  }
  if (metric.used_vscode_agent === true
    || (metric.totals_by_vscode_agent?.session_count ?? 0) > 0
    || (metric.totals_by_vscode_agent?.total_user_messages ?? 0) > 0) {
    user.localSurfaces.add('vscodeAgents');
  }
  user.delegated ||= usedCopilotCloudAgent
    || metric.used_copilot_code_review_active === true
    || metric.used_copilot_code_review_passive === true;

  for (const feature of metric.totals_by_feature) {
    if (!hasEditorActivity(feature)) continue;
    const chatMode = getChatModeBucket(feature.feature);
    // Generic Chat flags and root generations cannot distinguish assistance from Agent Mode.
    if (isCodeCompletionFeature(feature.feature) || (chatMode !== undefined && chatMode !== 'agent')) {
      user.assistance = true;
    }
    if (isAgentFeature(feature.feature)) user.localSurfaces.add('editorAgent');
    if (isCliFeature(feature.feature)) user.localSurfaces.add('cli');
    if (isCopilotAppFeature(feature.feature)) user.localSurfaces.add('app');
    if (feature.feature === 'vscode_agent') user.localSurfaces.add('vscodeAgents');
  }
  for (const traffic of metric.totals_by_client ?? []) {
    if (![traffic.request_count, traffic.session_count,
      traffic.token_usage.prompt_tokens_sum, traffic.token_usage.output_tokens_sum].some(value => value > 0)) continue;
    switch (traffic.client.trim().toLowerCase()) {
      case 'copilot_cli': user.localSurfaces.add('cli'); break;
      case 'copilot_app':
      case 'github_app': user.localSurfaces.add('app'); break;
      case 'vscode_agent': user.localSurfaces.add('vscodeAgents'); break;
      case 'cloud_agent':
      case 'code_review':
      case 'agentic_workflows': user.delegated = true; break;
    }
  }
}

export function computeWorkingPatterns(accumulator: WorkingPatternsAccumulator): WorkingPatternsSummary {
  const delegatedReported = accumulator.coverage.cloudAgentReportedRecords > 0
    || accumulator.coverage.codeReviewReportedRecords > 0
    || accumulator.coverage.clientTrafficReportedRecords > 0;
  const result: WorkingPatternsSummary = {
    reportStartDay: accumulator.reportStartDay,
    reportEndDay: accumulator.reportEndDay,
    recordCount: accumulator.recordCount,
    totalUsers: accumulator.users.size,
    assistanceUsers: 0,
    localAgentUsers: 0,
    delegatedUsers: delegatedReported ? 0 : null,
    multipleLocalSurfaceUsers: 0,
    localAndDelegatedUsers: delegatedReported ? 0 : null,
    usersWithoutPatternEvidence: 0,
    coverage: { ...accumulator.coverage },
  };
  for (const user of accumulator.users.values()) {
    if (user.assistance) result.assistanceUsers++;
    if (user.localSurfaces.size > 0) result.localAgentUsers++;
    if (user.localSurfaces.size >= 2) result.multipleLocalSurfaceUsers++;
    if (user.delegated) {
      result.delegatedUsers = (result.delegatedUsers ?? 0) + 1;
      if (user.localSurfaces.size > 0) result.localAndDelegatedUsers = (result.localAndDelegatedUsers ?? 0) + 1;
    }
    if (!user.assistance && user.localSurfaces.size === 0 && !user.delegated) result.usersWithoutPatternEvidence++;
  }
  return result;
}

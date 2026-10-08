import type {
  AgentActivity,
  AgentActivityBySurface,
  AgentActivityCounts,
  AgentSurface,
} from '../../../../types/agentActivity';
import type {
  DailyVSCodeAgentUsage,
  VSCodeAgentUsage,
  VSCodeAgentUsageSummary,
} from '../../../../types/vscodeAgent';

const agentSurfaces: AgentSurface[] = ['cli', 'app', 'vscodeAgents'];
const notReported: AgentActivityCounts = { sessions: null, userInputs: null, requests: null };

export function agentCounts(
  sessions: number | null,
  userInputs: number | null = null,
  requests: number | null = null,
): AgentActivityCounts {
  return { sessions, userInputs, requests };
}

function fillSurfaces(counts: Partial<AgentActivityBySurface>): AgentActivityBySurface {
  return {
    cli: counts.cli ?? notReported,
    app: counts.app ?? notReported,
    vscodeAgents: counts.vscodeAgents ?? notReported,
  };
}

export function makeAgentActivity(
  daily: Array<{ date: string } & Partial<AgentActivityBySurface>>,
): AgentActivity {
  const summary = fillSurfaces({});
  for (const day of daily) {
    for (const surface of agentSurfaces) {
      const counts = day[surface];
      if (!counts) continue;
      summary[surface] = {
        sessions: counts.sessions === null ? summary[surface].sessions : (summary[surface].sessions ?? 0) + counts.sessions,
        userInputs: counts.userInputs === null ? summary[surface].userInputs : (summary[surface].userInputs ?? 0) + counts.userInputs,
        requests: counts.requests === null ? summary[surface].requests : (summary[surface].requests ?? 0) + counts.requests,
      };
    }
  }
  return {
    daily: daily.map(({ date, ...counts }) => ({ date, ...fillSurfaces(counts) })),
    summary,
  };
}

function makeVSCodeAgentSummary(overrides: Partial<VSCodeAgentUsageSummary> = {}): VSCodeAgentUsageSummary {
  return {
    activeUsers: null,
    sessionCount: null,
    userMessages: null,
    recordCount: 1,
    usageReportedRecords: 0,
    sessionsReportedRecords: 0,
    messagesReportedRecords: 0,
    ...overrides,
  };
}

export function makeVSCodeAgentUsage(
  summary: Partial<VSCodeAgentUsageSummary>,
  daily: Array<Partial<DailyVSCodeAgentUsage> & { date: string }> = [],
): VSCodeAgentUsage {
  return {
    summary: makeVSCodeAgentSummary(summary),
    daily: daily.map(day => ({ ...makeVSCodeAgentSummary(), ...day })),
  };
}

import type { UserDayData } from '../../types/metrics';
import type {
  AgentActivity,
  AgentActivityBySurface,
  AgentActivityCounts,
  AgentSurface,
  DailyAgentActivity,
} from '../../types/agentActivity';

const surfaces: AgentSurface[] = ['cli', 'app', 'vscodeAgents'];
const measures = ['sessions', 'userInputs', 'requests'] as const;

function emptyCounts(): AgentActivityCounts {
  return { sessions: null, userInputs: null, requests: null };
}

function emptySurfaces(): AgentActivityBySurface {
  return { cli: emptyCounts(), app: emptyCounts(), vscodeAgents: emptyCounts() };
}

function clientCounts(totals: UserDayData['totals_by_copilot_app']): AgentActivityCounts {
  return {
    sessions: totals?.session_count ?? null,
    userInputs: totals?.prompt_count ?? null,
    requests: totals?.request_count ?? null,
  };
}

export function computeAgentActivity(
  days: ReadonlyArray<Pick<UserDayData, 'day' | 'totals_by_cli' | 'totals_by_copilot_app' | 'totals_by_vscode_agent'>>,
): AgentActivity {
  const daily = new Map<string, DailyAgentActivity>();
  const summary = emptySurfaces();

  for (const day of days) {
    const counts: AgentActivityBySurface = {
      cli: clientCounts(day.totals_by_cli),
      app: clientCounts(day.totals_by_copilot_app),
      vscodeAgents: {
        sessions: day.totals_by_vscode_agent?.session_count ?? null,
        userInputs: day.totals_by_vscode_agent?.total_user_messages ?? null,
        requests: null,
      },
    };
    let entry = daily.get(day.day);
    if (!entry) {
      entry = { date: day.day, ...emptySurfaces() };
      daily.set(day.day, entry);
    }
    for (const surface of surfaces) {
      for (const measure of measures) {
        const value = counts[surface][measure];
        if (value !== null) {
          entry[surface][measure] = (entry[surface][measure] ?? 0) + value;
          summary[surface][measure] = (summary[surface][measure] ?? 0) + value;
        }
      }
    }
  }

  return {
    daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
    summary,
  };
}

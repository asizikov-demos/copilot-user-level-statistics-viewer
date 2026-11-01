export type AgentSurface = 'cli' | 'app' | 'vscodeAgents';

export interface AgentActivityCounts {
  sessions: number | null;
  userInputs: number | null;
  requests: number | null;
}

export type AgentActivityBySurface = Record<AgentSurface, AgentActivityCounts>;

export interface DailyAgentActivity extends AgentActivityBySurface {
  date: string;
}

export interface AgentActivity {
  daily: DailyAgentActivity[];
  summary: AgentActivityBySurface;
}

export interface ThirdPartyAgentActivity {
  agents: Array<{ id: string; name: string; interactions: number }>;
  daily: Array<{ date: string; interactions: Record<string, number> }>;
}

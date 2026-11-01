import type { CopilotMetrics } from '../../types/metrics';
import type { ThirdPartyAgentActivity } from '../../types/agentActivity';

export interface ThirdPartyAgentActivityAccumulator {
  agents: Map<string, { id: string; name: string; interactions: number }>;
  daily: Map<string, Map<string, number>>;
}

export function createThirdPartyAgentActivityAccumulator(): ThirdPartyAgentActivityAccumulator {
  return { agents: new Map(), daily: new Map() };
}

export function accumulateThirdPartyAgentActivity(
  accumulator: ThirdPartyAgentActivityAccumulator,
  metric: Pick<CopilotMetrics, 'day' | 'totals_by_3rd_party_agent'>,
): void {
  for (const entry of metric.totals_by_3rd_party_agent ?? []) {
    const count = entry.user_initiated_interaction_count;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('Invalid third-party agent interaction count: expected a nonnegative integer.');
    }
    let agent = accumulator.agents.get(entry.agent_id);
    if (!agent) {
      agent = { id: entry.agent_id, name: entry.agent_name, interactions: 0 };
      accumulator.agents.set(entry.agent_id, agent);
    }
    agent.interactions += count;
    let day = accumulator.daily.get(metric.day);
    if (!day) {
      day = new Map();
      accumulator.daily.set(metric.day, day);
    }
    day.set(entry.agent_id, (day.get(entry.agent_id) ?? 0) + count);
  }
}

export function computeThirdPartyAgentActivity(
  accumulator: ThirdPartyAgentActivityAccumulator,
): ThirdPartyAgentActivity | undefined {
  if (accumulator.agents.size === 0) return undefined;
  return {
    agents: [...accumulator.agents.values()]
      .map(agent => ({ ...agent }))
      .sort((a, b) => b.interactions - a.interactions || a.id.localeCompare(b.id)),
    daily: [...accumulator.daily]
      .map(([date, interactions]) => ({ date, interactions: Object.fromEntries(interactions) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

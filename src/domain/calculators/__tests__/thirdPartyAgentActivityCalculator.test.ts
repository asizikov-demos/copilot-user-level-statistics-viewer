import { describe, expect, it } from 'vitest';
import { makeMetricLine } from '../../../__tests__/factories/metrics';
import { parseMetricsLine } from '../../metricsParser';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import { accumulateUserDays, userDetails } from './helpers/userDetailFixtures';

const agent = (id: string, name: string, count: number) => ({
  agent_id: id,
  agent_name: name,
  user_initiated_interaction_count: count,
});

describe('third-party agent activity', () => {
  it('preserves the source fields through parsing', () => {
    const entries = [agent('1', 'Claude (Anthropic)', 3)];
    expect(parseMetricsLine(makeMetricLine({ totals_by_3rd_party_agent: entries }))
      ?.totals_by_3rd_party_agent).toEqual(entries);
  });

  it.each([undefined, null, []])('omits activity for absent or empty entries: %s', entries => {
    expect(userDetails([{ totals_by_3rd_party_agent: entries }]).thirdPartyAgentActivity)
      .toBeUndefined();
  });

  it('sums repeated dates and IDs, orders dates, and isolates users', () => {
    const acc = accumulateUserDays([
      { day: '2024-01-17', totals_by_3rd_party_agent: [agent('1', 'Claude', 2)] },
      { day: '2024-01-15', totals_by_3rd_party_agent: [agent('1', 'Claude', 3), agent('2', 'Codex', 1)] },
      { day: '2024-01-15', totals_by_3rd_party_agent: [agent('1', 'Claude', 4)] },
      { user_id: 2, totals_by_3rd_party_agent: [agent('1', 'Claude', 100)] },
    ]);
    expect(computeSingleUserDetailedMetrics(acc, 1)!.thirdPartyAgentActivity).toEqual({
      agents: [
        { id: '1', name: 'Claude', interactions: 9 },
        { id: '2', name: 'Codex', interactions: 1 },
      ],
      daily: [
        { date: '2024-01-15', interactions: { '1': 7, '2': 1 } },
        { date: '2024-01-17', interactions: { '1': 2 } },
      ],
    });
    expect(computeSingleUserDetailedMetrics(acc, 2)!.thirdPartyAgentActivity!.agents[0].interactions)
      .toBe(100);
  });

  it('keeps separate IDs even when names match and preserves reported zero', () => {
    expect(userDetails([{ totals_by_3rd_party_agent: [
      agent('1', 'Agent', 0), agent('2', 'Agent', 2),
    ] }]).thirdPartyAgentActivity!.agents).toEqual([
      { id: '2', name: 'Agent', interactions: 2 },
      { id: '1', name: 'Agent', interactions: 0 },
    ]);
  });

  it.each([-1, 1.5, NaN])('rejects invalid interaction counts: %s', count => {
    expect(() => userDetails([{ totals_by_3rd_party_agent: [agent('1', 'Claude', count)] }]))
      .toThrow('Invalid third-party agent interaction count');
  });
});

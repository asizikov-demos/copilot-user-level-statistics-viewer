import { describe, expect, it } from 'vitest';
import {
  accumulateChatFeature,
  computeChatRequestsData,
  computeChatUsersData,
  createChatAccumulator,
} from '../chatCalculator';

describe('chatCalculator', () => {
  it('routes chat feature buckets through shared taxonomy helpers', () => {
    const accumulator = createChatAccumulator();
    const date = '2024-01-15';

    accumulateChatFeature(accumulator, date, 1, 'chat_panel_ask_mode', 3);
    accumulateChatFeature(accumulator, date, 1, 'chat_panel_plan_mode', 1);
    accumulateChatFeature(accumulator, date, 2, 'chat_panel_agent_mode', 2);
    accumulateChatFeature(accumulator, date, 3, 'chat_panel_custom_mode', 5);

    const users = computeChatUsersData(accumulator);
    const requests = computeChatRequestsData(accumulator);

    expect(users).toEqual([
      {
        date,
        askModeUsers: 1,
        agentModeUsers: 1,
        editModeUsers: 0,
        inlineModeUsers: 0,
        planModeUsers: 1,
        cliUsers: 0,
      },
    ]);

    expect(requests).toEqual([
      {
        date,
        askModeRequests: 3,
        agentModeRequests: 2,
        editModeRequests: 0,
        inlineModeRequests: 0,
        planModeRequests: 1,
        cliSessions: 0,
      },
    ]);
  });
});

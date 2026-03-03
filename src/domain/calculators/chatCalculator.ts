export interface DailyChatUsersData {
  date: string;
  askModeUsers: number;
  agentModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
  planModeUsers: number;
}

export interface DailyChatRequestsData {
  date: string;
  askModeRequests: number;
  agentModeRequests: number;
  editModeRequests: number;
  inlineModeRequests: number;
  planModeRequests: number;
}

export interface ChatAccumulator {
  dailyChatUsers: Map<string, {
    askModeUsers: Set<number>;
    agentModeUsers: Set<number>;
    editModeUsers: Set<number>;
    inlineModeUsers: Set<number>;
    planModeUsers: Set<number>;
  }>;
  dailyChatRequests: Map<string, {
    askModeRequests: number;
    agentModeRequests: number;
    editModeRequests: number;
    inlineModeRequests: number;
    planModeRequests: number;
  }>;
}

export function createChatAccumulator(): ChatAccumulator {
  return {
    dailyChatUsers: new Map(),
    dailyChatRequests: new Map(),
  };
}

export function ensureChatDate(accumulator: ChatAccumulator, date: string): void {
  if (!accumulator.dailyChatUsers.has(date)) {
    accumulator.dailyChatUsers.set(date, {
      askModeUsers: new Set(),
      agentModeUsers: new Set(),
      editModeUsers: new Set(),
      inlineModeUsers: new Set(),
      planModeUsers: new Set(),
    });
  }
  if (!accumulator.dailyChatRequests.has(date)) {
    accumulator.dailyChatRequests.set(date, {
      askModeRequests: 0,
      agentModeRequests: 0,
      editModeRequests: 0,
      inlineModeRequests: 0,
      planModeRequests: 0,
    });
  }
}

export function accumulateChatFeature(
  accumulator: ChatAccumulator,
  date: string,
  userId: number,
  feature: string,
  interactionCount: number
): void {
  if (interactionCount <= 0) return;

  ensureChatDate(accumulator, date);
  const users = accumulator.dailyChatUsers.get(date)!;
  const requests = accumulator.dailyChatRequests.get(date)!;

  switch (feature) {
    case 'chat_panel_ask_mode':
      users.askModeUsers.add(userId);
      requests.askModeRequests += interactionCount;
      break;
    case 'chat_panel_agent_mode':
      users.agentModeUsers.add(userId);
      requests.agentModeRequests += interactionCount;
      break;
    case 'chat_panel_edit_mode':
      users.editModeUsers.add(userId);
      requests.editModeRequests += interactionCount;
      break;
    case 'chat_inline':
      users.inlineModeUsers.add(userId);
      requests.inlineModeRequests += interactionCount;
      break;
    case 'chat_panel_plan_mode':
      users.planModeUsers.add(userId);
      requests.planModeRequests += interactionCount;
      break;
  }
}

export function computeChatUsersData(accumulator: ChatAccumulator): DailyChatUsersData[] {
  return Array.from(accumulator.dailyChatUsers.entries())
    .map(([date, data]) => ({
      date,
      askModeUsers: data.askModeUsers.size,
      agentModeUsers: data.agentModeUsers.size,
      editModeUsers: data.editModeUsers.size,
      inlineModeUsers: data.inlineModeUsers.size,
      planModeUsers: data.planModeUsers.size,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeChatRequestsData(accumulator: ChatAccumulator): DailyChatRequestsData[] {
  return Array.from(accumulator.dailyChatRequests.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

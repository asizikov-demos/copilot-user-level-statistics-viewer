import { CliUsageAccumulator } from './cliUsageCalculator';
import { compareByDateAsc } from './statsCalculators';
import { getChatModeBucket } from '../featureCategories';

export interface DailyChatUsersData {
  date: string;
  askModeUsers: number;
  agentModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
  planModeUsers: number;
  cliUsers: number;
}

export interface DailyChatRequestsData {
  date: string;
  askModeRequests: number;
  agentModeRequests: number;
  editModeRequests: number;
  inlineModeRequests: number;
  planModeRequests: number;
  cliSessions: number;
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

  switch (getChatModeBucket(feature)) {
    case 'ask':
      users.askModeUsers.add(userId);
      requests.askModeRequests += interactionCount;
      break;
    case 'agent':
      users.agentModeUsers.add(userId);
      requests.agentModeRequests += interactionCount;
      break;
    case 'edit':
      users.editModeUsers.add(userId);
      requests.editModeRequests += interactionCount;
      break;
    case 'inline':
      users.inlineModeUsers.add(userId);
      requests.inlineModeRequests += interactionCount;
      break;
    case 'plan':
      users.planModeUsers.add(userId);
      requests.planModeRequests += interactionCount;
      break;
  }
}

export function computeChatUsersData(accumulator: ChatAccumulator, cliAccumulator?: CliUsageAccumulator): DailyChatUsersData[] {
  const allDates = new Set<string>(accumulator.dailyChatUsers.keys());
  if (cliAccumulator) {
    for (const date of cliAccumulator.dailySessions.keys()) {
      allDates.add(date);
    }
  }

  return Array.from(allDates)
    .map(date => {
      const chatData = accumulator.dailyChatUsers.get(date);
      const cliData = cliAccumulator?.dailySessions.get(date);
      return {
        date,
        askModeUsers: chatData?.askModeUsers.size ?? 0,
        agentModeUsers: chatData?.agentModeUsers.size ?? 0,
        editModeUsers: chatData?.editModeUsers.size ?? 0,
        inlineModeUsers: chatData?.inlineModeUsers.size ?? 0,
        planModeUsers: chatData?.planModeUsers.size ?? 0,
        cliUsers: cliData?.users.size ?? 0,
      };
    })
    .sort(compareByDateAsc);
}

export function computeChatRequestsData(accumulator: ChatAccumulator, cliAccumulator?: CliUsageAccumulator): DailyChatRequestsData[] {
  const allDates = new Set<string>(accumulator.dailyChatRequests.keys());
  if (cliAccumulator) {
    for (const date of cliAccumulator.dailySessions.keys()) {
      allDates.add(date);
    }
  }

  return Array.from(allDates)
    .map(date => {
      const chatData = accumulator.dailyChatRequests.get(date);
      const cliData = cliAccumulator?.dailySessions.get(date);
      return {
        date,
        askModeRequests: chatData?.askModeRequests ?? 0,
        agentModeRequests: chatData?.agentModeRequests ?? 0,
        editModeRequests: chatData?.editModeRequests ?? 0,
        inlineModeRequests: chatData?.inlineModeRequests ?? 0,
        planModeRequests: chatData?.planModeRequests ?? 0,
        cliSessions: cliData?.sessionCount ?? 0,
      };
    })
    .sort(compareByDateAsc);
}

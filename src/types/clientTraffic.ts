export interface TrafficCounts {
  requestCount: number;
  promptTokens: number;
  outputTokens: number;
  avgTokensPerRequest: number | null;
}

export interface ClientModelTraffic extends TrafficCounts {
  model: string;
  modelSelectionMode: string;
  activeUsers: number;
}

export interface ClientTrafficSummary extends TrafficCounts {
  client: string;
  activeUsers: number;
  reportedSessionCount: number;
  models: ClientModelTraffic[];
}

export interface ClientTrafficPeriod {
  recordCount: number;
  reportedRecords: number;
  activeUsers: number;
  clients: ClientTrafficSummary[];
}

export interface ClientTrafficMetrics {
  summary: ClientTrafficPeriod;
  daily: Array<ClientTrafficPeriod & { day: string }>;
}

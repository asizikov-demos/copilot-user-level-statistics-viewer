import type { UserSummary } from '../../types/metrics';

export interface ClientReach {
  client: string;
  users: number;
}

export function computeClientReach(
  users: readonly UserSummary[]
): ClientReach[] {
  const counts = new Map<string, number>();
  for (const user of users) {
    for (const client of new Set(user.clients_used)) {
      counts.set(client, (counts.get(client) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([client, users]) => ({ client, users }))
    .sort((a, b) => b.users - a.users || a.client.localeCompare(b.client));
}

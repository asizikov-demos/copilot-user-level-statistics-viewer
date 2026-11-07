// @vitest-environment jsdom

import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import { selectClientsReadModel } from '../../read-models/clients';
import type { ClientTrafficSummary } from '../../types/clientTraffic';
import ClientsView from '../ClientsView';

vi.mock('../charts/IDEDistributionChart', () => ({ default: () => <div>IDE distribution</div> }));
vi.mock('../charts/CLIOverlapChart', () => ({ default: () => <div>CLI overlap</div> }));
vi.mock('../charts/DailyIDEUsersChart', () => ({ default: () => <div>Daily IDE users</div> }));
vi.mock('../IDEInsights', () => ({ default: () => <div>IDE insights</div> }));

afterEach(cleanup);

function client(name: string, requests: number): ClientTrafficSummary {
  return {
    client: name, requestCount: requests, activeUsers: requests > 0 ? 1 : 0,
    reportedSessionCount: 0, promptTokens: requests * 20, outputTokens: requests * 10,
    avgTokensPerRequest: requests > 0 ? 30 : null, models: [],
  };
}

function model(clients: ClientTrafficSummary[] = [], reported = 2) {
  const metrics = makeAggregatedMetrics();
  metrics.clients.traffic = {
    summary: { recordCount: 4, reportedRecords: reported, activeUsers: 1, clients },
    daily: [{
      day: '2026-10-22', recordCount: 4, reportedRecords: reported, activeUsers: 1, clients,
    }],
  };
  return selectClientsReadModel(metrics);
}

describe('ClientsView model traffic', () => {
  it('shows new client labels and traffic columns separately from editor metrics', () => {
    render(<ClientsView model={model([client('opencode', 20), client('claude_code', 10), client('codex', 0)])} />);
    const traffic = screen.getByRole('region', { name: 'Model traffic by client' });
    for (const name of ['OpenCode', 'Claude Code', 'Codex']) expect(within(traffic).getByText(name)).toBeTruthy();
    expect(within(traffic).getByText('Model Requests')).toBeTruthy();
    expect(within(traffic).getByText('Reported Sessions')).toBeTruthy();
    expect(within(traffic).getByText('Prompt Tokens')).toBeTruthy();
    expect(within(traffic).getByText('Output Tokens')).toBeTruthy();
    expect(within(traffic).getByText('Not available')).toBeTruthy();
    expect(traffic.textContent).toContain('2 of 4 user-day records');
    expect(traffic.textContent).toContain('2026-10-22 to 2026-10-22');
    expect(within(traffic).queryByText('Acceptance Rate')).toBeNull();
    expect(screen.getByText('IDE distribution')).toBeTruthy();
    expect(screen.getByText('Daily IDE users')).toBeTruthy();
  });

  it('distinguishes missing coverage from reported empty traffic', () => {
    const { rerender } = render(<ClientsView model={model([], 0)} />);
    expect(screen.getByText(/Client model traffic is not reported in this upload/)).toBeTruthy();
    rerender(<ClientsView model={model([])} />);
    expect(screen.getByText('No client model traffic was reported in the available records.')).toBeTruthy();
  });

  it('sorts by requests initially and lets users sort by client', () => {
    render(<ClientsView model={model([client('opencode', 2), client('codex', 8)])} />);
    const traffic = screen.getByRole('region', { name: 'Model traffic by client' });
    const rows = () => within(traffic).getAllByRole('row').slice(1);
    expect(rows()[0].textContent).toContain('Codex');
    fireEvent.click(within(traffic).getByRole('button', { name: /Client/ }));
    expect(rows()[0].textContent).toContain('OpenCode');
    fireEvent.click(within(traffic).getByRole('button', { name: /Client/ }));
    expect(rows()[0].textContent).toContain('Codex');
  });

  it('paginates future client keys and resets after sorting or replacing traffic', () => {
    const clients = Array.from({ length: 11 }, (_, index) => client(`future_${index}`, index + 1));
    const { rerender } = render(<ClientsView model={model(clients)} />);
    const traffic = screen.getByRole('region', { name: 'Model traffic by client' });
    expect(within(traffic).getAllByRole('row')).toHaveLength(11);
    expect(within(traffic).getByText('Showing 1-10 of 11 clients')).toBeTruthy();
    expect(within(traffic).queryByText('future_0')).toBeNull();
    expect(within(traffic).queryByRole('button', { name: /Show all/ })).toBeNull();
    fireEvent.click(within(traffic).getByRole('link', { name: 'Page 2' }));
    expect(within(traffic).getAllByRole('row')).toHaveLength(2);
    expect(within(traffic).getByText('Showing 11-11 of 11 clients')).toBeTruthy();
    expect(within(traffic).getByText('future_0')).toBeTruthy();
    fireEvent.click(within(traffic).getByRole('link', { name: 'Page 1' }));
    expect(within(traffic).queryByText('future_0')).toBeNull();
    fireEvent.click(within(traffic).getByRole('link', { name: 'Page 2' }));
    fireEvent.click(within(traffic).getByRole('button', { name: 'Model Requests' }));
    expect(within(traffic).getByText('Showing 1-10 of 11 clients')).toBeTruthy();
    expect(within(traffic).getAllByRole('row')[1].textContent).toContain('future_0');
    fireEvent.click(within(traffic).getByRole('link', { name: 'Page 2' }));
    rerender(<ClientsView model={model([client('new-client', 1)])} />);
    expect(within(traffic).getByText('Showing 1-1 of 1 clients')).toBeTruthy();
    expect(within(traffic).queryByRole('link', { name: 'Page 2' })).toBeNull();
    rerender(<ClientsView model={model([])} />);
    expect(within(traffic).queryByRole('group', { name: 'Pagination for clients' })).toBeNull();
    expect(within(traffic).getByText('No client model traffic was reported in the available records.')).toBeTruthy();
  });

  it('keeps all three table pages independent and preserves the CLI row and sort/data resets', () => {
    const data = model(Array.from({ length: 21 }, (_, index) => client(`future_${index}`, index + 1)));
    data.ideStats = Array.from({ length: 21 }, (_, index) => ({
      ide: `future_ide_${index}`,
      uniqueUsers: index + 3,
      cliOverlapUsers: 0,
      totalEngagements: index + 10,
      totalGenerations: 0,
      totalAcceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    }));
    data.cliUsers = 2;
    data.cliSessions = 1;
    const { rerender } = render(<ClientsView model={data} />);
    const traffic = within(screen.getByRole('region', { name: 'Model traffic by client' }));
    const users = within(screen.getByRole('region', { name: 'Clients Ordered by Number of Users' }));
    const engagements = within(screen.getByRole('region', { name: 'Clients Ordered by Number of Engagements' }));
    const rows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);
    for (const section of [traffic, users, engagements]) {
      expect(rows(section.getByRole('table'))).toHaveLength(10);
      expect(section.queryByRole('button', { name: /Show all/ })).toBeNull();
    }
    fireEvent.click(users.getByRole('link', { name: 'Page 3' }));
    expect(rows(users.getByRole('table'))).toHaveLength(2);
    expect(users.getByText('Showing 21-22 of 22 clients')).toBeTruthy();
    expect(rows(users.getByRole('table'))[1].textContent).toContain('cli');
    expect(traffic.getByText('Showing 1-10 of 21 clients')).toBeTruthy();
    expect(engagements.getByText('Showing 1-10 of 22 clients')).toBeTruthy();
    fireEvent.click(traffic.getByRole('link', { name: 'Page 2' }));
    fireEvent.click(engagements.getByRole('link', { name: 'Page 2' }));
    expect(traffic.getByText('Showing 11-20 of 21 clients')).toBeTruthy();
    expect(engagements.getByText('Showing 11-20 of 22 clients')).toBeTruthy();
    expect(users.getByText('Showing 21-22 of 22 clients')).toBeTruthy();
    fireEvent.click(users.getByRole('button', { name: 'Unique Users' }));
    expect(users.getByText('Showing 1-10 of 22 clients')).toBeTruthy();
    expect(rows(users.getByRole('table'))[0].textContent).toContain('cli');
    expect(traffic.getByText('Showing 11-20 of 21 clients')).toBeTruthy();
    expect(engagements.getByText('Showing 11-20 of 22 clients')).toBeTruthy();
    fireEvent.click(engagements.getByRole('button', { name: 'Engagements' }));
    expect(engagements.getByText('Showing 1-10 of 22 clients')).toBeTruthy();
    expect(rows(engagements.getByRole('table'))[0].textContent).toContain('cli');
    fireEvent.click(users.getByRole('link', { name: 'Page 2' }));
    fireEvent.click(engagements.getByRole('link', { name: 'Page 2' }));
    const replacement = model([client('replacement', 1)]);
    replacement.ideStats = data.ideStats.slice(0, 3);
    rerender(<ClientsView model={replacement} />);
    expect(traffic.getByText('Showing 1-1 of 1 clients')).toBeTruthy();
    for (const section of [users, engagements]) {
      expect(section.getByText('Showing 1-3 of 3 clients')).toBeTruthy();
      expect(rows(section.getByRole('table'))).toHaveLength(3);
      expect(section.queryByRole('link', { name: 'Page 2' })).toBeNull();
    }
    rerender(<ClientsView model={model([], 0)} />);
    for (const section of [traffic, users, engagements]) {
      expect(section.queryByRole('group', { name: 'Pagination for clients' })).toBeNull();
    }
  });
});

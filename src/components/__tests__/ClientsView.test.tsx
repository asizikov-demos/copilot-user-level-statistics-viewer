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

  it('shows top ten clients by default and expands to include future client keys', () => {
    const clients = Array.from({ length: 11 }, (_, index) => client(`future_${index}`, index + 1));
    render(<ClientsView model={model(clients)} />);
    const traffic = screen.getByRole('region', { name: 'Model traffic by client' });
    expect(within(traffic).queryByText('future_0')).toBeNull();
    fireEvent.click(within(traffic).getByRole('button', { name: 'Show all 11 clients' }));
    expect(within(traffic).getByText('future_0')).toBeTruthy();
    fireEvent.click(within(traffic).getByRole('button', { name: 'Show fewer clients' }));
    expect(within(traffic).queryByText('future_0')).toBeNull();
  });
});

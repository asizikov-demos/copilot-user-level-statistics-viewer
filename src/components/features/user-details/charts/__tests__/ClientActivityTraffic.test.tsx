// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientTrafficMetrics, ClientTrafficSummary } from '../../../../../types/clientTraffic';
import ClientActivityChart from '../ClientActivityChart';
import { makeMetric } from '../../../../../__tests__/factories/metrics';

const bar = vi.hoisted(() => vi.fn());
vi.mock('react-chartjs-2', () => ({
  Bar: (props: unknown) => { bar(props); return <div data-testid="session-bars" />; },
}));
afterEach(() => { cleanup(); bar.mockClear(); });

function client(name: string, sessions: number): ClientTrafficSummary {
  return { client: name, reportedSessionCount: sessions, requestCount: 10, promptTokens: 20,
    outputTokens: 10, avgTokensPerRequest: 3, activeUsers: 1, models: [] };
}

function traffic(clients: ClientTrafficSummary[], reportedRecords = 1): ClientTrafficMetrics {
  return {
    summary: { clients, reportedRecords, recordCount: 3, activeUsers: 1 },
    daily: [{
      day: '2026-10-23', clients, reportedRecords, recordCount: 1, activeUsers: 1,
    }],
  };
}

function chart(data: ClientTrafficMetrics) {
  return <ClientActivityChart traffic={data} ideAggregates={[]} days={[]} reportStartDay="2026-10-22" reportEndDay="2026-10-24" />;
}

function selectSessions() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Client activity measure' }), { target: { value: 'sessions' } });
}

describe('ClientActivityChart traffic', () => {
  it('uses daily grouped bars and preserves missing days as null instead of zero', () => {
    render(chart(traffic([client('copilot_cli', 5), client('opencode', 0)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'interactions');
    selectSessions();
    const props = bar.mock.lastCall?.[0];
    expect(props.data.labels).toHaveLength(3);
    expect(props.data.datasets.map((row: { label: string; data: unknown[] }) => [row.label, row.data]))
      .toEqual([['Copilot CLI', [null, 5, null]], ['OpenCode', [null, 0, null]]]);
    expect(props.options.indexAxis).toBe('x');
    expect(props.options.scales.x.stacked).toBe(false);
    expect(props.options.scales.y.title.text).toBe('Reported sessions');
    expect(screen.getAllByRole('table')).toHaveLength(1);
  });

  it('uses zero for a client absent on a reported day and null for unavailable traffic', () => {
    const data = traffic([client('copilot_cli', 5)]);
    data.daily.unshift({ day: '2026-10-22', clients: [], reportedRecords: 0, recordCount: 1, activeUsers: 0 });
    data.daily.push({ day: '2026-10-24', clients: [], reportedRecords: 1, recordCount: 1, activeUsers: 0 });
    render(chart(data));
    selectSessions();
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 5, 0]);
  });

  it('expands large client lists and falls back to interactions when traffic becomes unavailable', () => {
    const { rerender } = render(chart(traffic(Array.from({ length: 12 }, (_, i) => client(`client_${i}`, i)))));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 12 clients' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(13);
    selectSessions();
    rerender(chart(traffic([], 0)));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Reported sessions' })).toBeNull();
  });

  it('hides the measure selector for unavailable traffic and preserves reported-empty and zero-session states', () => {
    const { rerender } = render(chart(traffic([], 0)));
    expect(screen.queryByRole('combobox')).toBeNull();
    rerender(chart(traffic([])));
    selectSessions();
    expect(screen.getByText('No client sessions were reported in the available records.')).toBeTruthy();
    rerender(chart(traffic([client('opencode', 0)])));
    expect(screen.getByTestId('session-bars')).toBeTruthy();
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 0, null]);
  });

  it('joins canonical client rows without combining sessions and legacy activity, and expands metric details', () => {
    const activity = {
      ide: 'copilot_cli', user_initiated_interaction_count: 7,
      code_generation_activity_count: 4, code_acceptance_activity_count: 2,
      loc_added_sum: 9, loc_deleted_sum: 1,
      loc_suggested_to_add_sum: 12, loc_suggested_to_delete_sum: 3,
    };
    render(
      <ClientActivityChart
        traffic={traffic([client('copilot_cli', 5), client('opencode', 0), client('github_web', 2), client('github_mobile', 1)])}
        ideAggregates={[activity, { ...activity, ide: 'vscode' }]}
        days={[{ ...makeMetric(), used_copilot_coding_agent: false, used_copilot_code_review_active: false, used_copilot_code_review_passive: false, day: '2026-10-22', totals_by_ide: [activity], totals_by_feature: [] }]}
        reportStartDay="2026-10-22" reportEndDay="2026-10-24"
      />,
    );
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    const cli = rows.find(row => row.textContent?.includes('Copilot CLI'))!;
    expect(within(cli).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['Copilot CLI', '7', '4', '2', '5']);
    const openCode = rows.find(row => row.textContent?.includes('OpenCode'))!;
    expect(within(openCode).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['OpenCode', 'Not reported', 'Not reported', 'Not reported', '0']);
    const vscode = rows.find(row => row.textContent?.includes('VS Code'))!;
    expect(within(vscode).getAllByRole('cell').at(-1)?.textContent).toBe('Not reported');
    expect(screen.queryByRole('columnheader', { name: 'LOC Added' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show metric details' }));
    expect(screen.getByRole('columnheader', { name: 'LOC Added' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Prompt tokens' })).toBeTruthy();
    selectSessions();
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 5, null]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'interactions' } });
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([7, 0, 0]);
  });
});

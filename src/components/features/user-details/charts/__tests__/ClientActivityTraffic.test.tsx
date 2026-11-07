// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientTrafficMetrics, ClientTrafficSummary } from '../../../../../types/clientTraffic';
import type { UserDayData } from '../../../../../types/metrics';
import ClientActivityChart from '../ClientActivityChart';
import { makeMetric } from '../../../../../__tests__/factories/metrics';

const bar = vi.hoisted(() => vi.fn());
vi.mock('react-chartjs-2', () => ({
  Bar: (props: unknown) => { bar(props); return <div data-testid="session-bars" />; },
}));
afterEach(() => { cleanup(); bar.mockClear(); });

function client(name: string, sessions: number, requests = 10): ClientTrafficSummary {
  return { client: name, reportedSessionCount: sessions, requestCount: requests, promptTokens: 20,
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
  it.each([
    ['copilot_app', 'github_app'],
    ['github_app', 'copilot_app'],
  ])('joins %s activity with %s traffic in one Copilot App row', (activityKey, trafficKey) => {
    const activity = {
      ide: activityKey, user_initiated_interaction_count: 7,
      code_generation_activity_count: 20, code_acceptance_activity_count: 20,
      loc_added_sum: 3648, loc_deleted_sum: 13,
      loc_suggested_to_add_sum: 3648, loc_suggested_to_delete_sum: 13,
    };
    const appTraffic = { ...client(trafficKey, 4, 13), promptTokens: 1224866, outputTokens: 3130 };
    const data = traffic([appTraffic, client('copilot_sdk', 2)]);
    render(
      <ClientActivityChart
        traffic={data}
        ideAggregates={[activity]}
        days={[]}
        reportStartDay="2026-10-22" reportEndDay="2026-10-24"
      />,
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      'Copilot App', '7', '20', '20', '4', '3,648', '13', '3,648', '13', '13', '1,224,866', '3,130',
    ]);
    expect(within(rows[1]).getByText('Copilot SDK')).toBeTruthy();
    expect(activity.ide).toBe(activityKey);
    expect(data.summary.clients[0].client).toBe(trafficKey);
  });

  it('preserves both App identities when they coexist in activity and traffic', () => {
    const activity = {
      ide: 'copilot_app', user_initiated_interaction_count: 7,
      assumed_user_initiated_interaction_count: 2,
      code_generation_activity_count: 20, code_acceptance_activity_count: 10,
      loc_added_sum: 100, loc_deleted_sum: -3,
      loc_suggested_to_add_sum: 200, loc_suggested_to_delete_sum: 5,
    };
    render(
      <ClientActivityChart
        traffic={traffic([client('github_app', 4, 13), client('copilot_app', 0, 6)])}
        ideAggregates={[activity, { ...activity, ide: 'github_app' }]}
        days={[]}
        reportStartDay="2026-10-22" reportEndDay="2026-10-24"
      />,
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      'Copilot App', '18', '40', '20', '4', '200', '-6', '400', '10', '19', '40', '20',
    ]);
  });

  it.each([
    ['legacy IDE interactions', 'ide'],
    ['assumed IDE interactions', 'assumed'],
    ['CLI prompts', 'cli'],
  ])('prefers %s over positive sessions and requests', (_label, source) => {
    const activity = {
      ide: 'vscode', user_initiated_interaction_count: source === 'ide' ? 7 : 0,
      assumed_user_initiated_interaction_count: source === 'assumed' ? 7 : 0,
      code_generation_activity_count: 0, code_acceptance_activity_count: 0,
      loc_added_sum: 0, loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0,
    };
    const day: UserDayData = {
      ...makeMetric(),
      used_copilot_app: false, used_copilot_coding_agent: false,
      used_copilot_code_review_active: false, used_copilot_code_review_passive: false,
      day: '2026-10-23',
      totals_by_ide: source === 'cli' ? [] : [activity],
      ...(source === 'cli' ? {
        totals_by_cli: {
          prompt_count: 7, session_count: 0, request_count: 10,
          token_usage: { prompt_tokens_sum: 20, output_tokens_sum: 10, avg_tokens_per_request: 3 },
        },
      } : {}),
    };
    render(
      <ClientActivityChart
        traffic={traffic([client('opencode', 5)])}
        ideAggregates={source === 'cli' ? [] : [activity]}
        days={[day]}
        reportStartDay="2026-10-22" reportEndDay="2026-10-24"
      />,
    );
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'interactions');
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([0, 7, 0]);
  });

  it('defaults to model requests for traffic with zero sessions and preserves gaps and reported zeros', () => {
    const data = traffic([client('opencode', 0, 176), client('copilot_cli', 0, 0)]);
    data.daily.push({ day: '2026-10-24', clients: [], reportedRecords: 1, recordCount: 1, activeUsers: 0 });
    render(chart(data));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'requests');
    expect(screen.getByText('Daily Client Model Requests')).toBeTruthy();
    const props = bar.mock.lastCall?.[0];
    expect(props.data.datasets.map((row: { label: string; data: unknown[] }) => [row.label, row.data]))
      .toEqual([['OpenCode', [null, 176, 0]], ['Copilot CLI', [null, 0, 0]]]);
    expect(props.options.scales.y.title.text).toBe('Model requests');
    expect(props.options.scales.x.stacked).toBe(false);
    expect(props['aria-label']).toBe('Daily Client Model Requests');
    expect(props.options.plugins.tooltip.callbacks.label({
      dataset: { label: 'OpenCode' }, parsed: { y: 176 },
    })).toBe('OpenCode: 176 model requests');
    selectSessions();
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 0, 0]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'requests' } });
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 176, 0]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'interactions' } });
    expect(screen.getByText('No client interactions were reported in the available records.')).toBeTruthy();
  });

  it('falls back to interactions for all-zero traffic and allows selecting empty request data', () => {
    const { rerender } = render(chart(traffic([client('opencode', 0, 0)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'interactions');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'requests' } });
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 0, null]);
    rerender(chart(traffic([])));
    expect(screen.getByText('No client model requests were reported in the available records.')).toBeTruthy();
  });

  it('adapts the automatic default to new data but preserves a manual selection', () => {
    const { rerender } = render(chart(traffic([])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'interactions');
    rerender(chart(traffic([client('opencode', 0)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'requests');
    rerender(chart(traffic([client('opencode', 5)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'sessions');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'requests' } });
    rerender(chart(traffic([client('opencode', 10)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'requests');
  });

  it('uses daily grouped bars and preserves missing days as null instead of zero', () => {
    render(chart(traffic([client('copilot_cli', 5), client('opencode', 0)])));
    expect(screen.getByRole('combobox')).toHaveProperty('value', 'sessions');
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

  it('paginates large client lists and falls back to interactions when traffic becomes unavailable', () => {
    const { rerender } = render(chart(traffic(Array.from({ length: 12 }, (_, i) => client(`client_${i}`, i)))));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(within(screen.getByRole('table')).getByRole('columnheader', { name: 'LOC Added' })).toBeTruthy();
    expect(within(screen.getByRole('table')).getByRole('columnheader', { name: 'Prompt tokens' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
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

  it('joins canonical client rows and always shows available metric details', () => {
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
    expect(within(cli).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['Copilot CLI', '7', '4', '2', '5', '9', '1', '12', '3', '10', '20', '10']);
    const openCode = rows.find(row => row.textContent?.includes('OpenCode'))!;
    expect(within(openCode).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['OpenCode', 'Not reported', 'Not reported', 'Not reported', '0', 'Not reported', 'Not reported', 'Not reported', 'Not reported', '10', '20', '10']);
    const vscode = rows.find(row => row.textContent?.includes('VS Code'))!;
    expect(within(vscode).getAllByRole('cell').at(-1)?.textContent).toBe('Not reported');
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Client', 'Interactions', 'Generation', 'Acceptance', 'Reported sessions', 'LOC Added', 'LOC Deleted',
      'Suggested Add', 'Suggested Delete', 'Model requests', 'Prompt tokens', 'Output tokens',
    ]);
    expect(screen.queryByRole('button', { name: /metric details/i })).toBeNull();
    selectSessions();
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([null, 5, null]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'interactions' } });
    expect(bar.mock.lastCall?.[0].data.datasets[0].data).toEqual([7, 0, 0]);
  });

  it('shows LOC details without traffic while omitting traffic-specific columns', () => {
    render(
      <ClientActivityChart
        ideAggregates={[{
          ide: 'vscode', user_initiated_interaction_count: 7,
          code_generation_activity_count: 4, code_acceptance_activity_count: 2,
          loc_added_sum: 9, loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 12, loc_suggested_to_delete_sum: 3,
        }]}
        days={[]}
        reportStartDay="2026-10-22" reportEndDay="2026-10-24"
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Client', 'Interactions', 'Generation', 'Acceptance', 'LOC Added', 'LOC Deleted', 'Suggested Add', 'Suggested Delete',
    ]);
    expect(within(table).getAllByRole('cell').map(cell => cell.textContent)).toEqual([
      'VS Code', '7', '4', '2', '9', '1', '12', '3',
    ]);
    expect(screen.queryByRole('button', { name: /metric details/i })).toBeNull();
  });
});

// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '../../../../types/metrics';
import UsersSummarySection from '../sections/UsersSummarySection';
import UsersTableSection from '../sections/UsersTableSection';

function makeUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    user_login: 'octocat',
    user_id: 1,
    total_user_initiated_interactions: 10,
    total_code_acceptance_activities: 3,
    total_loc_added: 20,
    total_loc_deleted: 4,
    total_loc_suggested_to_add: 30,
    total_loc_suggested_to_delete: 6,
    total_ai_credits_used: 55.053015,
    net_loc_contribution: 16,
    days_active: 2,
    cloud_agent_days: 1,
    code_review_days: 1,
    top_client: 'vscode',
    clients_used: ['copilot_cli', 'vscode'],
    used_code_completion: true,
    used_agent: true,
    used_chat: true,
    used_cli: true,
    used_copilot_app: true,
    used_copilot_coding_agent: true,
    used_copilot_code_review_active: true,
    used_copilot_code_review_passive: false,
    used_auto_mode: true,
    ai_adoption_phase: {
      phase_number: 2,
      phase: 'Phase 2',
      version: 'v1',
    },
    ...overrides,
  };
}

function renderTable(users: UserSummary[], onUserClick = vi.fn()) {
  return render(<UsersTableSection sectionId="users-table" users={users} onUserClick={onUserClick} />);
}

function getResultCount() {
  return screen.getByText(/^Showing [\d,]+ of [\d,]+ users$/).textContent;
}

describe('Users feature sections', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the total population and feature adoption rails', () => {
    const users = [
      makeUser(),
      makeUser({
        user_login: 'hubot',
        user_id: 2,
        used_agent: false,
        used_chat: false,
        used_cli: false,
        used_copilot_coding_agent: false,
        used_copilot_code_review_active: false,
        used_code_completion: false,
      }),
    ];

    const markup = renderToStaticMarkup(
      <UsersSummarySection sectionId="users-summary" users={users} />
    );

    for (const rail of ['Chat', 'Completions', 'Agent mode', 'Code review', 'CLI']) {
      expect(markup).toContain(rail);
    }
    expect(markup).toContain('>2<');
    expect(markup.match(/>1</g)?.length).toBeGreaterThanOrEqual(5);
    expect(markup.match(/users · 50%/g)?.length).toBe(5);
    expect(markup.match(/role="progressbar"/g)?.length).toBe(5);
  });

  it('pages the users table, renders feature chips, and shows the empty state', () => {
    const users = Array.from({ length: 501 }, (_, index) => makeUser({
      user_login: `user-${String(index).padStart(3, '0')}`,
      user_id: index + 1,
      total_user_initiated_interactions: index + 1,
    }));

    renderTable(users);

    expect(within(screen.getByLabelText('Feature used')).getByRole('option', { name: 'App' })).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).queryByText('GENERATIONS')).toBeNull();
    for (const chip of ['Cloud Agent', 'Code Review', 'Auto Mode']) {
      expect(within(table).getAllByText(chip).length).toBe(500);
    }
    expect(screen.getByText('Showing 1-500 of 501 users')).toBeTruthy();

    const pagination = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pagination).getByRole('link', { current: 'page' }).textContent).toContain('1');
    fireEvent.click(within(pagination).getByRole('link', { name: 'Next Page' }));

    expect(screen.getByText('Showing 501-501 of 501 users')).toBeTruthy();
    expect(within(pagination).getByRole('link', { current: 'page' }).textContent).toContain('2');
    expect(window.location.hash).toBe('');

    cleanup();
    renderTable([]);
    expect(screen.getByText('No user data available')).toBeTruthy();
  });

  it('hides pagination when all users fit on one page', () => {
    renderTable([makeUser()]);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('orders users by days active descending and omits the interactions column', () => {
    const markup = renderToStaticMarkup(
      <UsersTableSection
        sectionId="users-table"
        users={[
          makeUser({ user_login: 'busy-chatter', user_id: 1, days_active: 3, total_user_initiated_interactions: 900 }),
          makeUser({ user_login: 'daily-regular', user_id: 2, days_active: 20, total_user_initiated_interactions: 50 }),
          makeUser({ user_login: 'weekly-visitor', user_id: 3, days_active: 8, total_user_initiated_interactions: 400 }),
        ]}
        onUserClick={vi.fn()}
      />
    );

    const order = ['daily-regular', 'weekly-visitor', 'busy-chatter'].map(login => markup.indexOf(login));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(markup).not.toContain('INTERACTIONS');
  });

  it('combines client and feature filters and clears them', async () => {
    renderTable([
      makeUser(),
      makeUser({
        user_login: 'hubot',
        user_id: 2,
        clients_used: ['jetbrains'],
        top_client: 'jetbrains',
        used_chat: false,
        used_cli: false,
      }),
      makeUser({
        user_login: 'monalisa',
        user_id: 3,
        clients_used: ['copilot_cli'],
        top_client: 'copilot_cli',
        used_chat: false,
      }),
    ]);

    const clearButton = screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement;
    expect(clearButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Search by user login'), { target: { value: 'oct' } });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
    });
    fireEvent.change(screen.getByLabelText('IDE used'), { target: { value: 'copilot_cli' } });
    fireEvent.change(screen.getByLabelText('Feature used'), { target: { value: 'chat' } });

    const table = screen.getByRole('table');
    expect(getResultCount()).toBe('Showing 1 of 3 users');
    expect(within(table).getByText('octocat')).toBeTruthy();
    expect(within(table).queryByText('hubot')).toBeNull();
    expect(within(table).queryByText('monalisa')).toBeNull();

    fireEvent.click(clearButton);

    expect(getResultCount()).toBe('Showing 3 of 3 users');
    expect(within(screen.getByRole('table')).getByText('hubot')).toBeTruthy();
    expect(within(screen.getByRole('table')).getByText('monalisa')).toBeTruthy();
    expect((screen.getByLabelText('Search by user login') as HTMLInputElement).value).toBe('');
  });

  it('shows a filtered empty state when no users match', () => {
    renderTable([makeUser()]);

    fireEvent.change(screen.getByLabelText('Feature used'), { target: { value: 'vscode_agent' } });

    expect(screen.getByText('No users match the selected filters')).toBeTruthy();
  });

  it.each([
    {
      filter: 'app',
      included: makeUser({ user_login: 'app-user', used_copilot_app: true }),
      excluded: [makeUser({ user_id: 2, user_login: 'non-app-user', used_copilot_app: false })],
    },
    {
      filter: 'vscode_agent',
      included: makeUser({ user_login: 'agents-window-user', used_agent: false, used_vscode_agent: true }),
      excluded: [
        makeUser({ user_id: 2, user_login: 'editor-only-user', used_vscode_agent: false }),
        makeUser({ user_id: 3, user_login: 'unreported-user', used_vscode_agent: null }),
      ],
    },
  ])('filters users by the $filter feature', ({ filter, included, excluded }) => {
    renderTable([included, ...excluded]);

    fireEvent.change(screen.getByLabelText('Feature used'), { target: { value: filter } });

    const table = screen.getByRole('table');
    expect(within(table).getByText(included.user_login)).toBeTruthy();
    for (const user of excluded) expect(within(table).queryByText(user.user_login)).toBeNull();
  });

  it('labels explicit VS Code Agents usage with a feature chip', () => {
    renderTable([makeUser({ used_vscode_agent: true })]);

    expect(within(screen.getByRole('table')).getByText('VS Code Agents')).toBeTruthy();
  });

  it('forwards row selection with the selected user login and id', () => {
    const onUserClick = vi.fn();
    renderTable([
      makeUser({ user_login: 'octocat', user_id: 42 }),
      makeUser({
        user_login: 'hubot',
        user_id: 7,
        total_user_initiated_interactions: 5,
      }),
    ], onUserClick);

    fireEvent.click(within(screen.getByRole('table')).getByText('octocat'));

    expect(onUserClick).toHaveBeenCalledWith('octocat', 42);
  });
});

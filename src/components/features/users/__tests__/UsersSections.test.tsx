// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '../../../../types/metrics';
import UsersSummarySection from '../sections/UsersSummarySection';
import UsersTableSection from '../sections/UsersTableSection';

// The package's Node export uses an SSR shim instead of registering the custom element in jsdom.
vi.mock('@primer/live-region-element', () => ({
  announce: vi.fn(() => Promise.resolve()),
  announceFromElement: vi.fn(() => Promise.resolve()),
}));

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

function toggleFilterOptions(label: string, options: string[]) {
  const anchor = screen.getByRole('button', { name: new RegExp(`^${label}`) });
  fireEvent.click(anchor);
  for (const name of options) {
    fireEvent.click(screen.getByRole('option', { name }));
  }
  fireEvent.click(anchor);
}

describe('Users feature sections', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

    expect(screen.getByRole('button', { name: 'Feature used All features' })).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: /days active/i })).toBeTruthy();
    expect(within(table).queryByRole('columnheader', { name: /generations/i })).toBeNull();
    const [, tableBody] = within(table).getAllByRole('rowgroup');
    for (const chip of ['Cloud Agent', 'Code Review', 'Auto Mode']) {
      expect(within(tableBody).getAllByText(chip).length).toBe(500);
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

  it('resets pagination when selecting additional feature filters', () => {
    const users = Array.from({ length: 501 }, (_, index) => makeUser({
      user_login: `user-${index}`,
      user_id: index + 1,
      used_chat: false,
      used_code_completion: false,
      used_agent: false,
      used_copilot_app: false,
      used_copilot_coding_agent: false,
      used_copilot_code_review_active: false,
      used_auto_mode: false,
    }));
    renderTable(users);
    const pagination = screen.getByRole('navigation', { name: 'Pagination' });

    fireEvent.click(within(pagination).getByRole('link', { name: 'Next Page' }));
    toggleFilterOptions('Feature used', ['CLI']);
    expect(screen.getByText('Showing 1-500 of 501 users')).toBeTruthy();
    fireEvent.click(within(pagination).getByRole('link', { name: 'Next Page' }));
    toggleFilterOptions('Feature used', ['Chat']);
    expect(screen.getByText('Showing 1-500 of 501 users')).toBeTruthy();
  });

  it('hides pagination when all users fit on one page', () => {
    renderTable([makeUser()]);

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('uses table container width for secondary activity and feature columns', () => {
    const { container } = renderTable([makeUser()]);

    expect(container.querySelector('#users-table')?.classList.contains('@container/users')).toBe(true);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const cells = within(table).getAllByRole('cell');
    const secondaryHeaders = ['Days Active', 'Cloud Agent', 'Code Review', 'Features Used'];

    headers.forEach((header, index) => {
      const isSecondary = secondaryHeaders.some(label => header.textContent?.includes(label));
      for (const element of [header, cells[index]]) {
        expect(element.classList.contains('hidden')).toBe(isSecondary);
        expect(element.classList.contains('@min-[100rem]/users:table-cell'))
          .toBe(isSecondary && !header.textContent?.includes('Features Used'));
        expect(element.classList.contains('@min-[80rem]/users:table-cell'))
          .toBe(header.textContent?.includes('Features Used'));
      }
    });
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
    expect(markup).not.toMatch(/interactions/i);
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
    toggleFilterOptions('IDE used', ['Copilot CLI']);
    toggleFilterOptions('Feature used', ['Chat']);

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
    expect(screen.getByRole('button', { name: 'IDE used All IDEs' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Feature used All features' })).toBeTruthy();
    expect(clearButton.disabled).toBe(true);
  });

  it('matches any selected IDE and feature, intersects groups, and supports deselection', () => {
    renderTable([
      makeUser({ user_login: 'alice', clients_used: ['vscode'], used_chat: true, used_cli: false }),
      makeUser({ user_login: 'bob', user_id: 2, clients_used: ['intellij'], used_chat: false, used_cli: true }),
      makeUser({ user_login: 'carol', user_id: 3, clients_used: ['copilot_cli'], used_chat: true, used_cli: false }),
      makeUser({ user_login: 'dave', user_id: 4, clients_used: ['vscode'], used_chat: false, used_cli: false }),
    ]);

    toggleFilterOptions('IDE used', ['VS Code', 'JetBrains']);
    expect(getResultCount()).toBe('Showing 3 of 4 users');
    toggleFilterOptions('Feature used', ['Chat', 'CLI']);
    expect(getResultCount()).toBe('Showing 2 of 4 users');
    const table = screen.getByRole('table');
    expect(within(table).getByText('alice')).toBeTruthy();
    expect(within(table).getByText('bob')).toBeTruthy();
    expect(within(table).queryByText('carol')).toBeNull();
    expect(within(table).queryByText('dave')).toBeNull();

    toggleFilterOptions('Feature used', ['Chat']);
    expect(getResultCount()).toBe('Showing 1 of 4 users');
    expect(within(table).getByText('bob')).toBeTruthy();
    toggleFilterOptions('Feature used', ['CLI']);
    expect(getResultCount()).toBe('Showing 3 of 4 users');
    toggleFilterOptions('IDE used', ['VS Code', 'JetBrains']);
    expect(getResultCount()).toBe('Showing 4 of 4 users');
    expect((screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('searches panel options without dropping hidden selections and resets the panel search on close', () => {
    renderTable([makeUser()]);
    const anchor = screen.getByRole('button', { name: 'Feature used All features' });
    fireEvent.click(anchor);
    expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');
    fireEvent.click(screen.getByRole('option', { name: 'Chat' }));
    const search = screen.getByRole('combobox', { name: 'Filter feature used...' });
    fireEvent.change(search, { target: { value: '  CLI ' } });
    expect(screen.queryByRole('option', { name: 'Chat' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('option', { name: 'CLI' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Deselect all' }));
    expect(screen.getByRole('option', { name: 'CLI' }).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(screen.getByRole('option', { name: 'CLI' }));
    fireEvent.change(search, { target: { value: 'missing-option' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.click(anchor);

    fireEvent.click(anchor);
    expect((screen.getByRole('combobox', { name: 'Filter feature used...' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('option', { name: 'Chat' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: 'CLI' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(anchor);
  });

  it('preserves selections and returns focus to the anchor on Escape', async () => {
    renderTable([makeUser()]);
    const anchor = screen.getByRole('button', { name: 'Feature used All features' });
    fireEvent.click(anchor);
    const search = screen.getByRole('combobox', { name: 'Filter feature used...' });
    fireEvent.click(screen.getByRole('option', { name: 'Chat' }));
    expect(screen.getByRole('option', { name: 'Chat' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(anchor);
    });
    expect(anchor.textContent).toContain('Chat');
  });

  it('renders IDE visuals and limits both anchor summaries without hiding selected options', () => {
    renderTable([makeUser({ clients_used: ['vscode', 'jetbrains', 'copilot_cli'] })]);
    const ideAnchor = screen.getByRole('button', { name: 'IDE used All IDEs' });
    fireEvent.click(ideAnchor);
    for (const name of ['VS Code', 'JetBrains', 'Copilot CLI']) {
      expect(screen.getByRole('option', { name }).querySelector('svg')).not.toBeNull();
    }
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(3);
    fireEvent.click(ideAnchor);
    expect(ideAnchor.textContent).toBe('Copilot CLI, JetBrains, ...');
    expect(ideAnchor.getAttribute('aria-label')).toBe('IDE used Copilot CLI, JetBrains, VS Code');
    expect(ideAnchor.getAttribute('title')).toBe('Copilot CLI, JetBrains, VS Code');

    toggleFilterOptions('Feature used', ['Chat', 'Completions', 'Agent']);
    const featureAnchor = screen.getByRole('button', { name: 'Feature used Chat, Completions, Agent' });
    expect(featureAnchor.textContent).toBe('Chat, Completions, ...');
    fireEvent.click(featureAnchor);
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(3);
    fireEvent.click(featureAnchor);
    toggleFilterOptions('Feature used', ['Agent']);
    expect(featureAnchor.textContent).toBe('Chat, Completions');
    expect(getResultCount()).toBe('Showing 1 of 1 users');
  });

  it('shows a filtered empty state when no users match', () => {
    renderTable([makeUser()]);

    toggleFilterOptions('Feature used', ['VS Code Agents']);

    expect(screen.getByText('No users match the selected filters')).toBeTruthy();
  });

  it.each([
    {
      filter: 'app',
      label: 'App',
      included: makeUser({ user_login: 'app-user', used_copilot_app: true }),
      excluded: [makeUser({ user_id: 2, user_login: 'non-app-user', used_copilot_app: false })],
    },
    {
      filter: 'vscode_agent',
      label: 'VS Code Agents',
      included: makeUser({ user_login: 'agents-window-user', used_agent: false, used_vscode_agent: true }),
      excluded: [
        makeUser({ user_id: 2, user_login: 'editor-only-user', used_vscode_agent: false }),
        makeUser({ user_id: 3, user_login: 'unreported-user', used_vscode_agent: null }),
      ],
    },
  ])('filters users by the $filter feature', ({ label, included, excluded }) => {
    renderTable([included, ...excluded]);

    toggleFilterOptions('Feature used', [label]);

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

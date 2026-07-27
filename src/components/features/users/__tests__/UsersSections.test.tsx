import { renderToStaticMarkup } from 'react-dom/server';
import {
  act,
  create,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '../../../../types/metrics';
import UsersSummarySection from '../sections/UsersSummarySection';
import UsersTableSection from '../sections/UsersTableSection';

function makeUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    user_login: 'octocat',
    user_id: 1,
    total_user_initiated_interactions: 10,
    total_code_generation_activities: 5,
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
    used_agent: true,
    used_chat: true,
    used_cli: true,
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

describe('Users feature sections', () => {
  it('renders summary cards with the same feature-user counts', () => {
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
        total_code_generation_activities: 0,
      }),
    ];

    const markup = renderToStaticMarkup(
      <UsersSummarySection sectionId="users-summary" users={users} />
    );

    expect(markup).toContain('Total Users');
    expect(markup).toContain('Chat Users');
    expect(markup).toContain('Agent Users');
    expect(markup).toContain('Code Review Users');
    expect(markup).toContain('CLI Users');
    expect(markup).toContain('Completion Users');
    expect(markup).toContain('>2<');
    expect(markup.match(/>1</g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps the paged users table labels, feature chips, and empty state', () => {
    const users = Array.from({ length: 501 }, (_, index) => makeUser({
      user_login: `user-${String(index).padStart(3, '0')}`,
      user_id: index + 1,
      total_user_initiated_interactions: index + 1,
    }));

    const populatedMarkup = renderToStaticMarkup(
      <UsersTableSection sectionId="users-table" users={users} onUserClick={vi.fn()} />
    );
    const emptyMarkup = renderToStaticMarkup(
      <UsersTableSection sectionId="users-table" users={[]} onUserClick={vi.fn()} />
    );

    expect(populatedMarkup).toContain('Search by user login');
    expect(populatedMarkup).toContain('USER');
    expect(populatedMarkup).toContain('DAYS ACTIVE');
    expect(populatedMarkup).toContain('AI ADOPTION');
    expect(populatedMarkup).toContain('FEATURES USED');
    expect(populatedMarkup).toContain('Cloud Agent');
    expect(populatedMarkup).toContain('Code Review');
    expect(populatedMarkup).toContain('Auto Mode');
    expect(populatedMarkup).toContain('Showing 1-500 of 501 users');
    expect(populatedMarkup).toContain('Page 1 of 2');
    expect(emptyMarkup).toContain('No user data available');
  });

  it('forwards row selection with the selected user login and id', async () => {
    const onUserClick = vi.fn();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(
        <UsersTableSection
          sectionId="users-table"
          users={[
            makeUser({ user_login: 'octocat', user_id: 42 }),
            makeUser({
              user_login: 'hubot',
              user_id: 7,
              total_user_initiated_interactions: 5,
            }),
          ]}
          onUserClick={onUserClick}
        />
      );
    });

    const rows = renderer?.root.findAllByType('tr') ?? [];
    rows[1].props.onClick();

    expect(onUserClick).toHaveBeenCalledWith('octocat', 42);

    await act(async () => {
      renderer?.unmount();
    });
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NavigationProvider } from '../../../../state/NavigationContext';
import UserDetailsView from '../UserDetailsView';
import { makeAgentActivity, makeUserDetails, makeUserDetailsViewModel } from './helpers/userDetailsFixtures';
import type { ThirdPartyAgentActivity } from '../../../../types/agentActivity';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Doughnut: () => null,
  Radar: () => null,
}));

function profile(activity?: ThirdPartyAgentActivity, nativeActivity = true) {
  const model = makeUserDetailsViewModel({
    userDetails: makeUserDetails({
      thirdPartyAgentActivity: activity,
      agentActivity: nativeActivity
        ? makeAgentActivity({ cli: { sessions: 1, userInputs: 1, requests: 1 } })
        : makeAgentActivity(),
    }),
  });
  return renderToStaticMarkup(
    <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
  );
}

const activity: ThirdPartyAgentActivity = {
  agents: [{ id: '1', name: 'Claude', interactions: 3 }],
  daily: [{ date: '2024-01-15', interactions: { '1': 3 } }],
};

describe('user profile third-party agent activity', () => {
  it('places the chart below agent-native activity and above usage summary', () => {
    const markup = profile(activity);
    const native = markup.indexOf('id="user-details-agent-activity"');
    const thirdParty = markup.indexOf('id="user-details-third-party-agent-activity"');
    const summary = markup.indexOf('id="user-details-summary"');
    expect(native).toBeGreaterThan(-1);
    expect(thirdParty).toBeGreaterThan(native);
    expect(summary).toBeGreaterThan(thirdParty);
    expect(markup).toContain('Daily third-party agent activity');
  });

  it('hides the chart when the user has no third-party entries', () => {
    expect(profile()).not.toContain('user-details-third-party-agent-activity');
  });

  it('shows third-party activity even without native agent activity', () => {
    const markup = profile(activity, false);
    expect(markup).toContain('Daily third-party agent activity');
    expect(markup).not.toContain('id="user-details-agent-activity"');
  });
});

import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContextPanel from '../ContextPanel';

const mocks = vi.hoisted(() => ({
  view: 'userDetails',
  activeSection: vi.fn(),
}));

vi.mock('../../../state/NavigationContext', () => ({
  useNavigation: () => ({ currentView: mocks.view }),
}));

vi.mock('../../../hooks/useActiveSection', () => ({
  useActiveSection: (ids: string[]) => {
    mocks.activeSection(ids);
    return ids[0] ?? null;
  },
}));

describe('ContextPanel rendered sections', () => {
  let renderer: ReactTestRenderer | undefined;
  let notifyMutation: () => void;
  let ids: Set<string>;
  const disconnect = vi.fn();

  beforeEach(() => {
    mocks.view = 'userDetails';
    mocks.activeSection.mockClear();
    disconnect.mockClear();
    ids = new Set(['user-details-overview', 'user-details-cli-customizations']);
    vi.stubGlobal('document', {
      body: {},
      getElementById: (id: string) => ids.has(id) ? { id } : null,
    });
    vi.stubGlobal('MutationObserver', class {
      constructor(callback: () => void) { notifyMutation = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });
  });

  afterEach(async () => {
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    vi.unstubAllGlobals();
  });

  it('lists only rendered sections and updates when profile data changes', async () => {
    await act(async () => { renderer = create(<ContextPanel />); });
    expect(renderer!.root.findAllByType('button').map(button => button.children.join(''))).toEqual([
      'Activity Overview', 'Customizations',
    ]);

    ids.delete('user-details-cli-customizations');
    ids.add('user-details-agent-activity');
    await act(async () => { notifyMutation(); });
    expect(renderer!.root.findAllByType('button').map(button => button.children.join(''))).toEqual([
      'Activity Overview', 'Agent-native activity',
    ]);
    expect(mocks.activeSection).toHaveBeenLastCalledWith(['user-details-overview', 'user-details-agent-activity']);
  });

  it('waits for sections to mount and hides the panel if all sections disappear', async () => {
    ids.clear();
    await act(async () => { renderer = create(<ContextPanel />); });
    expect(renderer!.toJSON()).toBeNull();
    ids.add('user-details-overview');
    await act(async () => { notifyMutation(); });
    expect(renderer!.root.findAllByType('button')).toHaveLength(1);
    ids.clear();
    await act(async () => { notifyMutation(); });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('replaces observed section IDs on route changes and disconnects on unmount', async () => {
    await act(async () => { renderer = create(<ContextPanel />); });
    mocks.view = 'cliAdoption';
    ids = new Set(['cli-daily-users']);
    await act(async () => { renderer!.update(<ContextPanel />); });
    expect(renderer!.root.findAllByType('button').map(button => button.children.join(''))).toEqual(['Daily CLI Users']);
    expect(disconnect).toHaveBeenCalledTimes(1);
    await act(async () => { renderer!.unmount(); });
    renderer = undefined;
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});

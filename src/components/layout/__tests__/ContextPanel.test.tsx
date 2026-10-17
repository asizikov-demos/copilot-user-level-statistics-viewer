// @vitest-environment jsdom
import { BaseStyles, ThemeProvider } from '@primer/react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function stubMatchMedia(prefersReducedMotion: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
}

function renderPanel() {
  return render(
    <ThemeProvider colorMode="day">
      <BaseStyles>
        <ContextPanel />
      </BaseStyles>
    </ThemeProvider>,
  );
}

function addSection(id: string) {
  const section = document.createElement('section');
  section.id = id;
  document.body.appendChild(section);
  return section;
}

function linkLabels() {
  const nav = screen.queryByRole('navigation', { name: 'On this page' });
  return nav ? within(nav).queryAllByRole('link').map(link => link.textContent) : [];
}

describe('ContextPanel', () => {
  let sections: HTMLElement[];

  beforeEach(() => {
    mocks.view = 'userDetails';
    mocks.activeSection.mockClear();
    sections = [addSection('user-details-overview'), addSection('user-details-cli-customizations')];
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists only rendered sections and updates when profile data changes', async () => {
    renderPanel();
    expect(linkLabels()).toEqual(['Activity Overview', 'Customizations']);

    sections[1].remove();
    addSection('user-details-agent-activity');
    await waitFor(() => expect(linkLabels()).toEqual(['Activity Overview', 'Agent-native activity']));
    expect(mocks.activeSection).toHaveBeenLastCalledWith(['user-details-overview', 'user-details-agent-activity']);
  });

  it('waits for sections to mount and hides the panel if all sections disappear', async () => {
    sections.forEach(section => section.remove());
    const { container } = renderPanel();
    expect(screen.queryByRole('navigation')).toBeNull();

    const overview = addSection('user-details-overview');
    await waitFor(() => expect(linkLabels()).toEqual(['Activity Overview']));

    overview.remove();
    await waitFor(() => expect(screen.queryByRole('navigation')).toBeNull());
    expect(container.textContent).toBe('');
  });

  it('replaces observed section IDs on route changes and disconnects on unmount', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const { rerender, unmount } = renderPanel();

    mocks.view = 'cliAdoption';
    addSection('cli-daily-users');
    rerender(
      <ThemeProvider colorMode="day">
        <BaseStyles>
          <ContextPanel />
        </BaseStyles>
      </ThemeProvider>,
    );
    expect(linkLabels()).toEqual(['Daily CLI Users']);
    expect(disconnect).toHaveBeenCalledTimes(1);

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('marks the active section with aria-current="location"', () => {
    renderPanel();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const [active, inactive] = within(nav).getAllByRole('link');

    expect(active.getAttribute('aria-current')).toBe('location');
    expect(inactive.hasAttribute('aria-current')).toBe(false);
    expect(within(nav).getByRole('heading', { name: 'On this page' })).toBeTruthy();
  });

  it('scrolls to the section and updates the hash without default navigation', () => {
    const scrollIntoView = vi.fn();
    sections[1].scrollIntoView = scrollIntoView;
    renderPanel();

    const link = screen.getByRole('link', { name: 'Customizations' });
    expect(link.getAttribute('href')).toBe('#user-details-cli-customizations');

    let defaultPrevented = false;
    act(() => {
      defaultPrevented = !fireEvent.click(link);
    });

    expect(defaultPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(window.location.hash).toBe('#user-details-cli-customizations');
  });

  it('jumps without smooth scrolling when reduced motion is preferred', () => {
    stubMatchMedia(true);
    const scrollIntoView = vi.fn();
    sections[0].scrollIntoView = scrollIntoView;
    renderPanel();

    fireEvent.click(screen.getByRole('link', { name: 'Activity Overview' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});

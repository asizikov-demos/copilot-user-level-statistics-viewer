// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StickyHeader from '../StickyHeader';
import { AppThemeProvider } from '../../../state/AppThemeProvider';

const mocks = vi.hoisted(() => ({
  hasData: true,
  view: 'userDetails',
  navigateTo: vi.fn(),
  resetAppState: vi.fn(),
}));

vi.mock('../../MetricsContext', () => ({
  useMetrics: () => ({ hasData: mocks.hasData }),
}));

vi.mock('../../../state/NavigationContext', () => ({
  useNavigation: () => ({ currentView: mocks.view, navigateTo: mocks.navigateTo }),
}));

vi.mock('../../../hooks/useResetAppState', () => ({
  useResetAppState: () => mocks.resetAppState,
}));

function renderHeader(sections: { id: string; label: string }[] = [], activeSectionId: string | null = null) {
  return render(
    <AppThemeProvider>
      <StickyHeader sections={sections} activeSectionId={activeSectionId} />
    </AppThemeProvider>,
  );
}

describe('StickyHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.hasData = true;
    mocks.view = 'userDetails';
    mocks.navigateTo.mockClear();
    mocks.resetAppState.mockClear();
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps the theme toggle available before data is loaded', () => {
    mocks.hasData = false;
    renderHeader();

    expect(screen.getByRole('banner').textContent).toContain('Copilot Usage Metrics');
    expect(screen.getByRole('button', { name: 'Light / Dimmed theme' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('button', { name: /upload new file/i })).toBeNull();
  });

  it('switches between light and dimmed and remembers the selection', () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: 'Light / Dimmed theme' });
    expect(screen.getByRole('button', { name: /Light/, pressed: false })).toBe(toggle);
    expect(toggle.textContent).toBe('Light');
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Light / Dimmed theme', pressed: true })).toBe(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toBe('Dimmed');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(localStorage.getItem('copilot-metrics-theme')).toBe('dimmed');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Light / Dimmed theme', pressed: false })).toBe(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Light');
    expect(document.documentElement.dataset.colorMode).toBe('light');
  });

  it('opens the section menu with the current view selected and navigates on selection', () => {
    renderHeader();
    const menuButton = screen.getByRole('button', { name: 'Navigate to section: Users' });
    expect(menuButton.textContent).toContain('Users');

    fireEvent.click(menuButton);
    const menu = screen.getByRole('menu');
    expect(menu).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Users' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'Overview' }).getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'AI Credits' }));
    expect(mocks.navigateTo).toHaveBeenCalledWith('aiCredits');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('resets the app state from the upload button', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /upload new file/i }));

    expect(mocks.resetAppState).toHaveBeenCalledTimes(1);
  });

  it('only offers page sections that exist and focuses the selected section', async () => {
    const section = document.createElement('section');
    section.id = 'usage-trend';
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    const { rerender } = renderHeader([{ id: 'usage-trend', label: 'Usage trend' }], 'usage-trend');
    fireEvent.click(screen.getByRole('button', { name: 'On this page' }));
    const item = screen.getByRole('menuitemradio', { name: 'Usage trend' });
    expect(item.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(item);
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(window.location.hash).toBe('#usage-trend');
    await waitFor(() => expect(document.activeElement).toBe(section));

    rerender(
      <AppThemeProvider>
        <StickyHeader sections={[]} activeSectionId={null} />
      </AppThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: 'On this page' })).toBeNull();
    section.remove();
    window.history.replaceState(null, '', '/');
  });
});

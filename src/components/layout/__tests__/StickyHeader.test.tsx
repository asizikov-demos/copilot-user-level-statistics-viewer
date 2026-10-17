// @vitest-environment jsdom
import { BaseStyles, ThemeProvider } from '@primer/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StickyHeader from '../StickyHeader';

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

function renderHeader() {
  return render(
    <ThemeProvider colorMode="day">
      <BaseStyles>
        <StickyHeader />
      </BaseStyles>
    </ThemeProvider>,
  );
}

describe('StickyHeader', () => {
  beforeEach(() => {
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

  it('shows only the brand before data is loaded', () => {
    mocks.hasData = false;
    renderHeader();

    expect(screen.getByRole('banner').textContent).toContain('Copilot Usage Metrics');
    expect(screen.queryByRole('button')).toBeNull();
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
});

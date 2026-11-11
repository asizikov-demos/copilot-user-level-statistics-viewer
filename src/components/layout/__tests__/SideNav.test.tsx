// @vitest-environment jsdom
import { BaseStyles, ThemeProvider } from '@primer/react';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SideNav from '../SideNav';
import { NAV_ITEMS } from '../navigationItems';

const mocks = vi.hoisted(() => ({
  view: 'overview',
  navigateTo: vi.fn(),
}));

vi.mock('../../../state/NavigationContext', () => ({
  useNavigation: () => ({ currentView: mocks.view, navigateTo: mocks.navigateTo }),
}));

function renderSideNav() {
  function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    return <SideNav collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} />;
  }

  return render(
    <ThemeProvider colorMode="day">
      <BaseStyles>
        <Sidebar />
      </BaseStyles>
    </ThemeProvider>,
  );
}

describe('SideNav', () => {
  beforeEach(() => {
    mocks.view = 'overview';
    mocks.navigateTo.mockClear();
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

  it('renders every view as a keyboard-focusable button with a decorative icon', () => {
    renderSideNav();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const buttons = within(nav).getAllByRole('button');

    expect(buttons.map(button => button.textContent)).toEqual(NAV_ITEMS.map(({ label }) => label));
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button');
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(button.querySelector('svg')?.getAttribute('width')).toBe('16');
      expect(button.querySelector('svg')?.getAttribute('height')).toBe('16');
    }
    expect(within(nav).getByRole('button', { name: 'Model Usage' }).querySelector('.octicon-ai-model')).not.toBeNull();
  });

  it('marks only the active view with aria-current="page"', () => {
    renderSideNav();
    const current = screen.getAllByRole('button').filter(button => button.hasAttribute('aria-current'));

    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('Overview');
    expect(current[0].getAttribute('aria-current')).toBe('page');
  });

  it('keeps Users current while viewing user details', () => {
    mocks.view = 'userDetails';
    renderSideNav();

    expect(screen.getByRole('button', { name: 'Users' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false);
  });

  it('navigates to the selected view', () => {
    renderSideNav();
    fireEvent.click(screen.getByRole('button', { name: 'Executive Summary' }));

    expect(mocks.navigateTo).toHaveBeenCalledTimes(1);
    expect(mocks.navigateTo).toHaveBeenCalledWith('executiveSummary');
  });

  it('collapses to labeled icons and expands again without losing the active view', () => {
    mocks.view = 'userDetails';
    renderSideNav();
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    toggle.focus();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBe(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('main-navigation');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const { label } of NAV_ITEMS) {
      const button = within(nav).getByRole('button', { name: label });
      expect(button.querySelector('.sr-only')?.textContent).toBe(label);
    }
    expect(within(nav).getByRole('button', { name: 'Users' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(nav).getByRole('button', { name: 'Model Usage' }));
    expect(mocks.navigateTo).toHaveBeenCalledWith('modelDetails');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(nav).getByRole('button', { name: 'Users' }).querySelector('.sr-only')).toBeNull();
  });
});

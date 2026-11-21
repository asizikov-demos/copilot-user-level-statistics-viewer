// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from '../../../app/page';
import styles from '../AppShell.module.css';

const mocks = vi.hoisted(() => ({
  sections: [] as { id: string; label: string }[],
}));

vi.mock('../../MetricsContext', () => ({
  useMetrics: () => ({ hasData: true }),
}));

vi.mock('../useContextSections', () => ({
  useContextSections: () => ({ sections: mocks.sections, activeId: null }),
}));

vi.mock('../index', () => ({
  AppHeader: () => null,
  ViewRouter: () => <span>Page content</span>,
  StickyHeader: () => null,
  SideNav: () => null,
  ContextPanel: () => null,
  DataInfoBar: () => null,
}));

describe('page navigation layout', () => {
  afterEach(() => {
    cleanup();
    mocks.sections = [];
  });

  it('reserves rail space only while sections are rendered', () => {
    const { rerender } = render(<Home />);
    const content = screen.getByText('Page content').parentElement?.parentElement;
    expect(content?.classList.contains(styles.withContextPanel)).toBe(false);

    mocks.sections = [{ id: 'overview', label: 'Overview' }];
    rerender(<Home />);
    expect(content?.classList.contains(styles.withContextPanel)).toBe(true);

    mocks.sections = [];
    rerender(<Home />);
    expect(content?.classList.contains(styles.withContextPanel)).toBe(false);
  });
});

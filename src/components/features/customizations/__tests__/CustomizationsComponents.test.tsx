// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chartColors } from '../../../charts/utils/chartColors';
import type { CustomizationsReadModel } from '../../../../read-models/customizations';
import type { CustomizationTypeStats } from '../../../../types/customizationsOverview';
import { CustomizationsSummaryCards } from '../CustomizationsOverview';
import ExplorerTable from '../ExplorerTable';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="daily-activity-chart" />,
}));

function makeModel(): CustomizationsReadModel {
  const emptyType = (type: CustomizationTypeStats['type']): CustomizationTypeStats => ({
    type,
    totalEvents: 0,
    unnamedEvents: 0,
    users: 0,
    items: [],
  });

  return {
    dates: ['2026-01-01'],
    totalUsers: 2,
    cliUsers: 0,
    types: {
      skill: {
        type: 'skill',
        totalEvents: 3,
        unnamedEvents: 1,
        users: 1,
        items: [
          { name: 'named-skill', unnamed: false, totalEvents: 2, users: 1, activeDays: 1, dailyEvents: [2], topUsers: [] },
          { name: 'other', unnamed: true, totalEvents: 1, users: 1, activeDays: 1, dailyEvents: [1], topUsers: [] },
        ],
      },
      custom_agent: emptyType('custom_agent'),
      mcp: emptyType('mcp'),
      slash_cmd: emptyType('slash_cmd'),
      plugin: emptyType('plugin'),
    },
  };
}

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

describe('customizations components', () => {
  it('renders accessible Primer progress bars for each customization type', () => {
    render(<CustomizationsSummaryCards model={makeModel()} />);

    expect(screen.getAllByRole('progressbar')).toHaveLength(5);
    const skillsProgress = screen.getByRole('progressbar', { name: 'Skills adoption' });
    expect(skillsProgress.getAttribute('aria-valuenow')).toBe('50');
    expect(skillsProgress.style.getPropertyValue('--progress-bg')).toBe(chartColors.blue.solid);
  });

  it('includes unnamed buckets only when the checkbox is enabled', () => {
    render(<ExplorerTable model={makeModel()} />);

    expect(screen.getByText('Showing 1 of 1 items')).toBeTruthy();
    expect(screen.queryByText('other')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include unnamed buckets' }));

    expect(screen.getByText('Showing 2 of 2 items')).toBeTruthy();
    expect(screen.getByText('other')).toBeTruthy();
  });

  it('places controls and a single-page range in the card and keeps empty results inside it', () => {
    const { container } = render(<ExplorerTable model={makeModel()} />);
    const card = screen.getByRole('region', { name: 'Explorer' });

    expect(within(card).getByLabelText('Search by name')).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'Type All types' })).toBeTruthy();
    expect(container.querySelector('footer')?.textContent).toContain('Showing 1-1 of 1 items');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Search by name'), { target: { value: 'missing' } });
    expect(within(card).getByText('No items match the filters')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(container.querySelector('footer')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('named-skill')).toBeTruthy();
    expect(container.querySelector('footer')?.textContent).toContain('Showing 1-1 of 1 items');
  });

  it('preserves 20-row paging, sorting, expansion, and type filtering', () => {
    const model = makeModel();
    model.types.skill.items = Array.from({ length: 21 }, (_, index) => ({
      name: `skill-${String(index).padStart(2, '0')}`,
      unnamed: false,
      totalEvents: index + 1,
      users: 1,
      activeDays: 1,
      dailyEvents: [index + 1],
      topUsers: [],
    }));
    render(<ExplorerTable model={model} />);

    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Showing 1-20 of 21 items')).toBeTruthy();
    fireEvent.click(screen.getByText('skill-20'));
    expect(screen.getByTestId('daily-activity-chart')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    expect(screen.getByText('Showing 21-21 of 21 items')).toBeTruthy();
    expect(screen.getByText('skill-00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(screen.getByText('Showing 1-20 of 21 items')).toBeTruthy();
    expect(screen.queryByTestId('daily-activity-chart')).toBeNull();
    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('skill-20');
    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('skill-00');

    const typeFilter = screen.getByRole('button', { name: 'Type All types' });
    fireEvent.click(typeFilter);
    for (const label of ['All types', 'Skills', 'Custom agents', 'MCP servers', 'Slash commands', 'Plugins']) {
      expect(screen.getByRole('menuitemradio', { name: label }).querySelector('svg')).not.toBeNull();
    }
    expect(screen.getByRole('menuitemradio', { name: 'MCP servers' }).querySelector('svg.octicon-mcp')).not.toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Filter types...' })).toBeNull();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(6);
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'MCP servers' }));
    expect(screen.getByRole('button', { name: 'Type MCP servers' })).toBeTruthy();
    expect(screen.getByText('No items match the filters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Showing 1-20 of 21 items')).toBeTruthy();
  });
});

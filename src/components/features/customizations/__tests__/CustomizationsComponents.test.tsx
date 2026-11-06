// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { chartColors } from '../../../charts/utils/chartColors';
import type { CustomizationsReadModel } from '../../../../read-models/customizations';
import type { CustomizationTypeStats } from '../../../../types/customizationsOverview';
import { CustomizationsSummaryCards } from '../CustomizationsOverview';
import ExplorerTable from '../ExplorerTable';

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

afterEach(cleanup);

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
});

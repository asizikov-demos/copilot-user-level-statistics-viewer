// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompositionChartCard from '../CompositionChartCard';

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <canvas data-testid="composition-canvas" />,
}));

afterEach(cleanup);

const entries = [
  { label: 'VS Code', value: 8, color: 'rgb(0, 110, 219)', clientKey: 'vscode' },
  { label: 'Copilot CLI', value: 2, color: 'rgb(0, 0, 0)', clientKey: 'copilot_cli' },
];

describe('CompositionChartCard', () => {
  it('renders the shared card with its description and accessible breakdown', () => {
    const { container } = render(
      <CompositionChartCard
        title="Clients"
        description="Reported interactions by client."
        entries={entries}
        unit="interactions"
        label="Client breakdown"
      />,
    );

    expect(container.querySelectorAll('[data-component="ChartContainer"]')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Clients', level: 3 })).toBeTruthy();
    expect(screen.getByText('Reported interactions by client.')).toBeTruthy();
    expect(screen.getByText('Total:').parentElement?.textContent).toBe('Total: 10interactions');
    expect(within(screen.getByRole('list', { name: 'Client breakdown' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('keeps header controls usable when the selected data is empty', () => {
    const onChange = vi.fn();
    const props = {
      title: 'Clients',
      unit: 'requests',
      label: 'Client breakdown',
      description: 'Reported requests.',
      headerActions: (
        <select aria-label="Client measure" onChange={onChange}>
          <option value="requests">Requests</option>
          <option value="interactions">Interactions</option>
        </select>
      ),
      emptyState: 'No requests reported',
    };
    const { rerender } = render(<CompositionChartCard {...props} entries={[]} />);
    const selector = screen.getByRole('combobox', { name: 'Client measure' });

    expect(screen.getByText('No requests reported')).toBeTruthy();
    expect(screen.getByText('Reported requests.')).toBeTruthy();
    expect(screen.queryByTestId('composition-canvas')).toBeNull();
    fireEvent.change(selector, { target: { value: 'interactions' } });
    expect(onChange).toHaveBeenCalledOnce();

    rerender(<CompositionChartCard {...props} entries={entries} />);
    expect(screen.getByRole('combobox', { name: 'Client measure' })).toBe(selector);
    expect(screen.queryByText('No requests reported')).toBeNull();
    expect(screen.getByTestId('composition-canvas')).toBeTruthy();
  });

  it('preserves the option to hide totals for overlapping entries', () => {
    render(
      <CompositionChartCard
        title="Clients"
        entries={entries}
        unit="users"
        label="Users by client"
        showTotal={false}
        legendPlacement="right"
      />,
    );

    expect(screen.queryByText('Total:')).toBeNull();
    expect(screen.getByRole('list', { name: 'Users by client' })).toBeTruthy();
  });
});

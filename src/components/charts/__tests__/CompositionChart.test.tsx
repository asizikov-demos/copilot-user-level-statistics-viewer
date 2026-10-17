// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CompositionChart from '../CompositionChart';
import type { CompositionEntry } from '../utils/compositionChart';

const { doughnut } = vi.hoisted(() => ({ doughnut: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: Record<string, unknown>) => {
    doughnut(props);
    return <canvas aria-hidden={props['aria-hidden'] as boolean | undefined} data-testid="composition-canvas" />;
  },
}));

interface DoughnutProps {
  data: { labels: string[]; datasets: Array<{ data: number[]; borderColor: string }> };
  options: { cutout: string | number };
}

const lastDoughnutProps = () => doughnut.mock.calls.at(-1)?.[0] as DoughnutProps & Record<string, unknown>;

const entry = (label: string, value: number): CompositionEntry => ({ label, value, color: `rgb(${value}, 0, 0)` });

const rowTexts = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map(item => item.textContent);

afterEach(() => {
  cleanup();
  doughnut.mockClear();
});

describe('CompositionChart', () => {
  it('draws a pie with a ranked legend of values and shares', () => {
    render(
      <CompositionChart
        variant="pie"
        entries={[entry('JetBrains', 25), entry('Unused', 0), entry('VS Code', 75)]}
        unit="interactions"
        label="Client interactions breakdown"
        surface="muted"
      />,
    );

    const legend = screen.getByRole('list', { name: 'Client interactions breakdown' });
    expect(rowTexts(legend)).toEqual(['VS Code75 interactions75.0%', 'JetBrains25 interactions25.0%']);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('Total:')).toBeNull();

    const props = lastDoughnutProps();
    expect(props['aria-hidden']).toBe('true');
    expect(props.options.cutout).toBe(0);
    expect(props.data.labels).toEqual(['VS Code', 'JetBrains']);
    expect(props.data.datasets[0].borderColor).toBe('rgb(246, 248, 250)');
  });

  it('draws a doughnut with the total in the center', () => {
    render(
      <CompositionChart
        variant="doughnut"
        entries={[entry('VS Code', 1200), entry('Copilot CLI', 34)]}
        unit="interactions"
        label="Clients breakdown"
        legendPlacement="right"
      />,
    );

    const total = screen.getByText('Total:').parentElement;
    expect(total?.textContent).toBe(`Total: ${(1234).toLocaleString()}interactions`);
    expect(lastDoughnutProps().options.cutout).toBe('62%');
    expect(lastDoughnutProps().data.datasets[0].borderColor).toBe('rgb(255, 255, 255)');
  });

  it('omits the doughnut total when entries overlap', () => {
    render(
      <CompositionChart
        variant="doughnut"
        entries={[entry('VS Code', 10), entry('Copilot CLI', 7)]}
        unit="users"
        label="Users by client"
        showTotal={false}
      />,
    );

    expect(screen.queryByText('Total:')).toBeNull();
    expect(rowTexts(screen.getByRole('list', { name: 'Users by client' }))).toEqual([
      'VS Code10 users58.8%',
      'Copilot CLI7 users41.2%',
    ]);
  });

  it('groups the long tail into an expandable "Other" row', () => {
    render(
      <CompositionChart
        variant="pie"
        entries={[
          entry('Go', 4),
          entry('TypeScript', 40),
          entry('Python', 30),
          entry('Rust', 2),
          entry('Java', 14),
          entry('C#', 10),
        ]}
        unit="generations"
        label="Languages breakdown"
      />,
    );

    const toggle = screen.getByRole('button', { name: /Other \(2\)/ });
    const otherList = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Other (2)6 generations6.0%');
    expect(otherList?.hidden).toBe(true);
    expect(lastDoughnutProps().data.labels).toEqual(['TypeScript', 'Python', 'Java', 'C#', 'Other']);

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(otherList?.hidden).toBe(false);
    expect(rowTexts(otherList as HTMLElement)).toEqual(['Go4 generations4.0%', 'Rust2 generations2.0%']);
  });

  it('renders nothing without positive values', () => {
    const { container } = render(
      <CompositionChart variant="pie" entries={[entry('Unused', 0)]} unit="interactions" label="Empty breakdown" />,
    );

    expect(container.innerHTML).toBe('');
    expect(doughnut).not.toHaveBeenCalled();
  });
});

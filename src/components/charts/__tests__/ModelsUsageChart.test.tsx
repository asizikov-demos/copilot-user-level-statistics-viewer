// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ChartData } from 'chart.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModelsUsageChart from '../ModelsUsageChart';

interface BarProps {
  data: ChartData<'bar'>;
}

const { bar } = vi.hoisted(() => ({ bar: vi.fn<(props: BarProps) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: BarProps) => {
    bar(props);
    return <div>Models usage chart</div>;
  },
}));

const datasetLabels = () => bar.mock.lastCall![0].data.datasets.map(dataset => dataset.label);

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider colorMode="day"><BaseStyles>{children}</BaseStyles></ThemeProvider>;
}

describe('ModelsUsageChart', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    bar.mockClear();
    vi.unstubAllGlobals();
  });

  it('lists present vendors with icons, filters the chart, and restores all vendors', () => {
    render(
        <ModelsUsageChart
          modelEntries={[
            {
              model: 'gpt-4.1',
              total: 8,
              dailyData: { '2026-01-15': 5, '2026-01-16': 3 },
              users: 2,
            },
            {
              model: 'claude-sonnet-4.5',
              total: 4,
              dailyData: { '2026-01-15': 1, '2026-01-16': 3 },
              users: 1,
            },
            {
              model: 'custom-model',
              total: 2,
              dailyData: { '2026-01-16': 2 },
              users: 1,
            },
            {
              model: 'my-provider/some-model',
              total: 3,
              dailyData: { '2026-01-16': 3 },
              users: 1,
            },
          ]}
          dates={['2026-01-15', '2026-01-16']}
          totalInteractions={17}
          variant="all"
        />,
      { wrapper: Wrapper },
    );

    expect(datasetLabels()).toEqual(['GPT-4.1', 'Claude Sonnet 4.5', 'my-provider/some-model', 'custom-model']);
    fireEvent.click(screen.getByRole('button', { name: 'Model vendor: All Vendors' }));
    expect(screen.getAllByRole('menuitemradio').map(item => item.textContent)).toEqual([
      'All Vendors',
      'OpenAI',
      'Anthropic',
      'Unattributed',
      'Custom Provider',
    ]);
    expect(screen.getByRole('menuitemradio', { name: 'All Vendors' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'OpenAI' }).querySelector('path[d^="M22.2819"]')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Anthropic' }).querySelector('path[d^="M17.3041"]')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Unattributed' }).querySelector('.octicon-ai-model')).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Anthropic' }));
    expect(datasetLabels()).toEqual(['Claude Sonnet 4.5']);
    const anthropicButton = screen.getByRole('button', { name: 'Model vendor: Anthropic' });
    expect(anthropicButton.querySelector('svg path')?.getAttribute('d')).toMatch(/^M17.3041/);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(anthropicButton);
    expect(screen.getByRole('menuitemradio', { name: 'Anthropic' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Unattributed' }));

    expect(datasetLabels()).toEqual(['custom-model']);
    expect(bar.mock.lastCall![0].data.datasets[0].data).toEqual([0, 2]);
    const total = screen.getByText('Total Interactions').parentElement!;
    expect(within(total).getByText('2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Model vendor: Unattributed' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Custom Provider' }));
    expect(datasetLabels()).toEqual(['my-provider/some-model']);

    fireEvent.click(screen.getByRole('button', { name: 'Model vendor: Custom Provider' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'All Vendors' }));
    expect(datasetLabels()).toEqual(['GPT-4.1', 'Claude Sonnet 4.5', 'my-provider/some-model', 'custom-model']);
    expect(within(total).getByText('17')).toBeTruthy();
  });

  it.each(['auto', 'cli', 'app'] as const)('uses canonical model labels in the %s variant without a vendor filter', (variant) => {
    render(
        <ModelsUsageChart
          modelEntries={[{
            model: 'gpt-4.1',
            total: 1,
            dailyData: { '2026-01-15': 1 },
            users: 1,
          }]}
          dates={['2026-01-15']}
          totalInteractions={1}
          variant={variant}
        />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('button', { name: /^Model vendor:/ })).toBeNull();
    expect(datasetLabels()).toEqual(['GPT-4.1']);
  });

  it('clears a vendor selection that is no longer present in refreshed data', () => {
    const dates = ['2026-01-15'];
    const openAiEntry = {
      model: 'gpt-4.1',
      total: 1,
      dailyData: { '2026-01-15': 1 },
      users: 1,
    };
    const anthropicEntry = {
      model: 'claude-sonnet-4.5',
      total: 2,
      dailyData: { '2026-01-15': 2 },
      users: 1,
    };

    const { rerender } = render(
        <ModelsUsageChart
          modelEntries={[openAiEntry, anthropicEntry]}
          dates={dates}
          totalInteractions={3}
          variant="all"
        />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Model vendor: All Vendors' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'OpenAI' }));
    rerender(
        <ModelsUsageChart
          modelEntries={[anthropicEntry]}
          dates={dates}
          totalInteractions={2}
          variant="all"
        />,
    );
    expect(screen.getByRole('button', { name: 'Model vendor: All Vendors' })).toBeTruthy();
    rerender(
        <ModelsUsageChart
          modelEntries={[openAiEntry, anthropicEntry]}
          dates={dates}
          totalInteractions={3}
          variant="all"
        />,
    );

    expect(screen.getByRole('button', { name: 'Model vendor: All Vendors' })).toBeTruthy();
    expect(datasetLabels()).toEqual(['Claude Sonnet 4.5', 'GPT-4.1']);
  });
});

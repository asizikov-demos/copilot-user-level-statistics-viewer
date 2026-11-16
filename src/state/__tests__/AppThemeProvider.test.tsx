// @vitest-environment jsdom

import { useState } from 'react';
import { useTheme } from '@primer/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ChartData, ChartOptions } from 'chart.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppThemeProvider, useAppTheme } from '../AppThemeProvider';
import ModelsUsageChart from '../../components/charts/ModelsUsageChart';
import CompositionChart from '../../components/charts/CompositionChart';
import { ChartJS } from '../../components/charts/utils/chartSetup';
import { resetChartThemeCache } from '../../components/charts/utils/chartTheme';

const { bar, doughnut } = vi.hoisted(() => ({
  bar: vi.fn<(props: { data: ChartData<'bar'>; options: ChartOptions<'bar'> }) => void>(),
  doughnut: vi.fn<(props: { data: ChartData<'doughnut'> }) => void>(),
}));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Parameters<typeof bar>[0]) => { bar(props); return null; },
  Doughnut: (props: Parameters<typeof doughnut>[0]) => { doughnut(props); return null; },
}));

function Controls() {
  const { theme, setTheme } = useAppTheme();
  const { colorScheme } = useTheme();
  const [filter, setFilter] = useState('');
  return (
    <>
      <button onClick={() => setTheme(theme === 'light' ? 'dimmed' : 'light')}>Toggle theme</button>
      <output>{colorScheme}</output>
      <input aria-label="Retained filter" value={filter} onChange={event => setFilter(event.target.value)} />
    </>
  );
}

const modelEntries = [
  { model: 'gpt-4.1', total: 8, dailyData: { '2026-01-15': 8 }, users: 2 },
  { model: 'claude-sonnet-4.5', total: 4, dailyData: { '2026-01-15': 4 }, users: 1 },
];
const entries = Array.from({ length: 6 }, (_, index) => ({
  label: `Category ${index}`, value: index + 1, color: '#123456',
}));
let style: HTMLStyleElement;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.colorMode = 'light';
  resetChartThemeCache();
  style = document.createElement('style');
  style.textContent = `
    :root[data-color-mode="light"] {
      --data-blue-color-emphasis: #006edb;
      --data-gray-color-emphasis: #808fa3;
      --fgColor-muted: #59636e;
      --bgColor-default: #ffffff;
      --borderColor-muted: #d1d9e0b3;
    }
    :root[data-color-mode="dark"] {
      --data-blue-color-emphasis: #0576ff;
      --data-gray-color-emphasis: #7a8a9e;
      --fgColor-muted: #9198a1;
      --bgColor-default: #212830;
      --borderColor-muted: #3d444db3;
    }
  `;
  document.head.append(style);
});

afterEach(() => {
  cleanup();
  style.remove();
  localStorage.clear();
  document.documentElement.dataset.colorMode = 'light';
  document.documentElement.style.removeProperty('color-scheme');
  resetChartThemeCache();
  vi.restoreAllMocks();
  bar.mockClear();
  doughnut.mockClear();
});

describe('AppThemeProvider', () => {
  it('uses deterministic light markup before restoring a stored preference', () => {
    localStorage.setItem('copilot-metrics-theme', 'dimmed');
    expect(renderToString(<AppThemeProvider><Controls /></AppThemeProvider>)).toContain('data-color-mode="light"');

    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    expect(screen.getByRole('status').textContent).toBe('dark_dimmed');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
    expect(document.documentElement.dataset.darkTheme).toBe('dark_dimmed');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it.each([null, 'light', 'unsupported'])('defaults to light for stored value %s', stored => {
    if (stored) localStorage.setItem('copilot-metrics-theme', stored);
    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    expect(screen.getByRole('status').textContent).toBe('light');
    expect(document.documentElement.dataset.colorMode).toBe('light');
  });

  it('refreshes memoized canvas colors and options without clearing view or chart filters', () => {
    render(
      <AppThemeProvider>
        <Controls />
        <ModelsUsageChart modelEntries={modelEntries} dates={['2026-01-15']} totalInteractions={12} variant="all" />
        <CompositionChart variant="doughnut" entries={entries} unit="requests" label="Breakdown" />
      </AppThemeProvider>,
    );
    fireEvent.change(screen.getByLabelText('Retained filter'), { target: { value: 'octocat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Model vendor: All Vendors' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Anthropic' }));

    const lightBar = bar.mock.lastCall![0];
    const lightDoughnut = doughnut.mock.lastCall![0];
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    const dimmedBar = bar.mock.lastCall![0];
    const dimmedDoughnut = doughnut.mock.lastCall![0];
    expect(dimmedBar.data.datasets).toHaveLength(1);
    expect(dimmedBar.data.datasets[0].label).toBe('Claude Sonnet 4.5');
    expect(dimmedBar.data.datasets[0].borderColor).toBe('rgb(5, 118, 255)');
    expect(dimmedBar.data.datasets[0].borderColor).not.toBe(lightBar.data.datasets[0].borderColor);
    expect(dimmedBar.options.plugins?.tooltip?.backgroundColor).toBe('rgb(33, 40, 48)');
    expect(dimmedDoughnut.data.datasets[0].borderColor).toBe('rgb(33, 40, 48)');
    expect(dimmedDoughnut.data.datasets[0].backgroundColor).not.toEqual(lightDoughnut.data.datasets[0].backgroundColor);
    expect(ChartJS.defaults.color).toBe('rgb(145, 152, 161)');
    expect(screen.getByRole('button', { name: 'Model vendor: Anthropic' })).toBeTruthy();
    expect((screen.getByLabelText('Retained filter') as HTMLInputElement).value).toBe('octocat');
    expect(localStorage.getItem('copilot-metrics-theme')).toBe('dimmed');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(bar.mock.lastCall![0].data.datasets[0].borderColor).toBe(lightBar.data.datasets[0].borderColor);
    expect(doughnut.mock.lastCall![0].data.datasets[0].borderColor).toBe('rgb(255, 255, 255)');
    expect(localStorage.getItem('copilot-metrics-theme')).toBe('light');
  });

  it('keeps the toggle working and logs storage access failures', () => {
    const error = new DOMException('Storage blocked', 'SecurityError');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw error; });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw error; });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    expect(warn).toHaveBeenCalledWith('Unable to read the saved theme preference.', error);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(screen.getByRole('status').textContent).toBe('dark_dimmed');
    expect(warn).toHaveBeenCalledWith('Unable to save the theme preference.', error);
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../../__tests__/factories/metrics';
import { AppThemeProvider, useAppTheme } from '../../../../../state/AppThemeProvider';
import { resetChartThemeCache } from '../../../../charts/utils/chartTheme';
import ClientActivityChart from './helpers/PreparedClientActivityChart';

const { bar } = vi.hoisted(() => ({ bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <canvas />;
  },
}));
afterEach(() => {
  cleanup();
  bar.mockClear();
  document.getElementById('client-theme-tokens')?.remove();
  document.documentElement.dataset.colorMode = 'light';
  document.documentElement.style.removeProperty('color-scheme');
  localStorage.clear();
  resetChartThemeCache();
});

const totals = {
  user_initiated_interaction_count: 10, code_generation_activity_count: 1,
  code_acceptance_activity_count: 1, loc_added_sum: 1, loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 1, loc_suggested_to_delete_sum: 0,
};
const day = {
  ...makeMetric(),
  used_copilot_code_review_active: false,
  used_copilot_code_review_passive: false,
  totals_by_ide: [{ ...totals, ide: 'vscode' }, { ...totals, ide: 'azure_devops' }],
  totals_by_feature: [],
};
const props = () => bar.mock.calls.at(-1)?.[0];

function ThemeToggle() {
  const { theme, setTheme } = useAppTheme();
  return <button onClick={() => setTheme(theme === 'light' ? 'dimmed' : 'light')}>Toggle theme</button>;
}

describe('client chart visual identity', () => {
  it('updates Copilot App bars and legend on theme changes without resetting hidden clients', () => {
    const style = document.createElement('style');
    style.id = 'client-theme-tokens';
    style.textContent = `
      :root[data-color-mode="light"] { --fgColor-default: #1f2328; }
      :root[data-color-mode="dark"] { --fgColor-default: #d1d7e0; }
    `;
    document.head.append(style);
    const app = { ...totals, ide: 'github_app' };
    const days = [{ ...day, totals_by_ide: [app] }];
    render(
      <AppThemeProvider>
        <ThemeToggle />
        <ClientActivityChart ideAggregates={[app]} days={days} reportStartDay={day.day} reportEndDay={day.day} />
      </AppThemeProvider>,
    );
    const legend = () => screen.getByRole('button', { name: 'Copilot App' }).querySelector('pattern > rect')!;
    expect(props().data.datasets[0].backgroundColor).toBe('rgb(31, 35, 40)');
    expect(legend().getAttribute('fill')).toBe('rgb(31, 35, 40)');
    fireEvent.click(screen.getByRole('button', { name: 'Copilot App', pressed: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(props().data.datasets[0]).toMatchObject({ backgroundColor: 'rgb(209, 215, 224)', hidden: true });
    expect(legend().getAttribute('fill')).toBe('rgb(209, 215, 224)');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(props().data.datasets[0]).toMatchObject({ backgroundColor: 'rgb(31, 35, 40)', hidden: true });
    expect(legend().getAttribute('fill')).toBe('rgb(31, 35, 40)');
  });

  it('uses fixed colors and a keyboard-operable legend without a pattern control', () => {
    render(<ClientActivityChart ideAggregates={day.totals_by_ide} days={[day]} reportStartDay={day.day} reportEndDay={day.day} />);
    expect(props().datasetIdKey).toBe('clientKey');
    expect(props().data.datasets).toMatchObject([
      { clientKey: 'azure_devops', backgroundColor: '#003B70', hidden: false },
      { clientKey: 'vscode', backgroundColor: '#006EDB', hidden: false },
    ]);
    expect(screen.queryByRole('checkbox', { name: 'Show client patterns' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'VS Code', pressed: true }));
    expect(props().data.datasets[1].hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'VS Code', pressed: false }));
    expect(props().data.datasets[1].hidden).toBe(false);
  });
});

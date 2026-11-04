// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../../__tests__/factories/metrics';
import ClientActivityChart from '../ClientActivityChart';

const { bar } = vi.hoisted(() => ({ bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <canvas />;
  },
}));
afterEach(() => { cleanup(); bar.mockClear(); });

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

describe('client chart visual identity', () => {
  it('uses fixed colors and a keyboard-operable legend with opt-in textures', () => {
    render(<ClientActivityChart ideAggregates={day.totals_by_ide} days={[day]} reportStartDay={day.day} reportEndDay={day.day} />);
    expect(props().datasetIdKey).toBe('clientKey');
    expect(props().data.datasets).toMatchObject([
      { clientKey: 'azure_devops', backgroundColor: '#003B70', hidden: false },
      { clientKey: 'vscode', backgroundColor: '#006EDB', hidden: false },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'VS Code', pressed: true }));
    expect(props().data.datasets[1].hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'VS Code', pressed: false }));
    expect(props().data.datasets[1].hidden).toBe(false);
    const before = props().data.datasets.map((dataset: { data: number[] }) => dataset.data);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show client patterns' }));
    expect(props().data.datasets[0].backgroundColor).toEqual(expect.any(Function));
    expect(props().data.datasets.map((dataset: { data: number[] }) => dataset.data)).toEqual(before);
  });
});

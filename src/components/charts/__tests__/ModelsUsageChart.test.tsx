import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModelsUsageChart from '../ModelsUsageChart';

const { bar } = vi.hoisted(() => ({ bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <div>Models usage chart</div>;
  },
}));

describe('ModelsUsageChart', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    bar.mockClear();
  });

  it('lists vendors found in the data and filters the chart by vendor', async () => {
    await act(async () => {
      renderer = create(
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
          ]}
          dates={['2026-01-15', '2026-01-16']}
          totalInteractions={14}
          variant="all"
        />
      );
    });

    const select = renderer!.root.findByType('select');
    expect(select.findAllByType('option').map(option => option.children.join(''))).toEqual([
      'All Vendors',
      'OpenAI',
      'Anthropic',
      'Unattributed',
    ]);

    await act(async () => {
      select.props.onChange({ target: { value: 'Unattributed' } });
    });

    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [
          expect.objectContaining({ label: 'custom-model', data: [0, 2] }),
        ],
      }),
    }));
    expect(renderer!.root.findByType('select').props.value).toBe('Unattributed');
  });

  it('does not add the vendor filter to specialized chart variants', async () => {
    await act(async () => {
      renderer = create(
        <ModelsUsageChart
          modelEntries={[{
            model: 'gpt-4.1',
            total: 1,
            dailyData: { '2026-01-15': 1 },
            users: 1,
          }]}
          dates={['2026-01-15']}
          totalInteractions={1}
          variant="auto"
        />
      );
    });

    expect(renderer!.root.findAllByType('select')).toHaveLength(0);
  });

  it('clears a vendor selection that is no longer present in refreshed data', async () => {
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

    await act(async () => {
      renderer = create(
        <ModelsUsageChart
          modelEntries={[openAiEntry, anthropicEntry]}
          dates={dates}
          totalInteractions={3}
          variant="all"
        />
      );
    });

    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'OpenAI' } });
    });
    await act(async () => {
      renderer!.update(
        <ModelsUsageChart
          modelEntries={[anthropicEntry]}
          dates={dates}
          totalInteractions={2}
          variant="all"
        />
      );
    });
    await act(async () => {
      renderer!.update(
        <ModelsUsageChart
          modelEntries={[openAiEntry, anthropicEntry]}
          dates={dates}
          totalInteractions={3}
          variant="all"
        />
      );
    });

    expect(renderer!.root.findByType('select').props.value).toBe('');
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: expect.arrayContaining([
          expect.objectContaining({ label: 'gpt-4.1' }),
          expect.objectContaining({ label: 'claude-sonnet-4.5' }),
        ]),
      }),
    }));
  });
});

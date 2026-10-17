import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import ChartToggleButtons from '../ChartToggleButtons';

const OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
] as const;

function textContent(node: ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(textContent).join('');
}

describe('ChartToggleButtons', () => {
  it('renders a labelled segmented control and reports the selected option value', async () => {
    const onChange = vi.fn();
    let renderer: ReactTestRenderer | undefined;

    await act(async () => {
      renderer = create(
        <ChartToggleButtons options={[...OPTIONS]} value="daily" onChange={onChange} ariaLabel="Trend granularity" />
      );
    });

    try {
      const root = renderer!.root;
      expect(root.findByType('ul').props['aria-label']).toBe('Trend granularity');

      const buttons = root.findAllByType('button');
      expect(buttons.map(textContent)).toEqual(['Daily', 'Weekly']);
      expect(buttons.map(button => button.props['aria-pressed'])).toEqual([true, false]);

      await act(async () => { buttons[0].props.onClick(); });
      expect(onChange).not.toHaveBeenCalled();

      await act(async () => { buttons[1].props.onClick(); });
      expect(onChange).toHaveBeenCalledWith('weekly');
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });
});

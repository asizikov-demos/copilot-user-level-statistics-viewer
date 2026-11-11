import { fireEvent, screen, within } from '@testing-library/react';
import { expect } from 'vitest';

type Root = HTMLElement | undefined;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const queries = (root: Root) => (root ? within(root) : screen);
const triggerName = (name: string) => new RegExp(`^${escape(name)}: `);

/** Trigger button of a SimpleSelect, found by the label prefix of its aria-label. */
export function getSelect(name: string, root?: Root): HTMLElement {
  return queries(root).getByRole('button', { name: triggerName(name) });
}

export function querySelect(name: string, root?: Root): HTMLElement | null {
  return queries(root).queryByRole('button', { name: triggerName(name) });
}

export function openSelect(name: string, root?: Root) {
  fireEvent.click(getSelect(name, root));
}

export function chooseOption(name: string, optionLabel: string, root?: Root) {
  openSelect(name, root);
  fireEvent.click(screen.getByRole('menuitemradio', { name: optionLabel }));
}

export function expectSelected(name: string, optionLabel: string, root?: Root) {
  expect(getSelect(name, root).getAttribute('aria-label')).toBe(`${name}: ${optionLabel}`);
}

/** Option labels in menu order; leaves the menu open. */
export function listOptions(name: string, root?: Root) {
  openSelect(name, root);
  return screen.getAllByRole('menuitemradio').map(item => item.textContent ?? '');
}

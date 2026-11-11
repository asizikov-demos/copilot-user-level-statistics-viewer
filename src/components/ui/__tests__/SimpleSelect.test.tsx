// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FormControl } from '@primer/react';
import { afterEach, describe, expect, it } from 'vitest';
import SimpleSelect from '../SimpleSelect';

const OPTIONS = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
] as const;

afterEach(cleanup);

describe('SimpleSelect', () => {
  it('inherits the FormControl id so clicking the label focuses the trigger button', () => {
    render(
      <FormControl>
        <FormControl.Label>Paper</FormControl.Label>
        <SimpleSelect label="Paper" value="a4" onChange={() => {}} options={[...OPTIONS]} />
      </FormControl>
    );

    const button = screen.getByRole('button', { name: 'Paper: A4' });
    const label = screen.getByText('Paper');
    expect(label.getAttribute('for')).toBe(button.id);
    expect(button.id).not.toBe('');

    fireEvent.click(label);
    expect(document.getElementById(label.getAttribute('for')!)).toBe(button);
  });

  it('prefers an explicit id', () => {
    render(<SimpleSelect label="Paper" value="a4" onChange={() => {}} options={[...OPTIONS]} id="own" />);
    expect(screen.getByRole('button', { name: 'Paper: A4' }).id).toBe('own');
  });
});

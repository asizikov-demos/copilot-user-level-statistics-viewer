// @vitest-environment jsdom
import { BaseStyles, Dialog, ThemeProvider } from '@primer/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AboutView from '../AboutView';

function renderWithPrimer(ui: React.ReactNode) {
  return render(
    <ThemeProvider colorMode="day">
      <BaseStyles>{ui}</BaseStyles>
    </ThemeProvider>,
  );
}

describe('Primer in jsdom', () => {
  it('renders the About page Primer button inside the Primer providers', () => {
    renderWithPrimer(<AboutView />);

    const link = screen.getByRole('link', { name: 'View source on GitHub' });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/asizikov-demos/copilot-user-level-statistics-viewer',
    );
    expect(link.className).toMatch(/prc-Button-ButtonBase-/);
  });

  it('renders portal-based components such as Dialog', () => {
    const onClose = vi.fn();
    renderWithPrimer(
      <Dialog title="Smoke dialog" onClose={onClose}>
        Dialog body
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Smoke dialog' });
    expect(dialog.textContent).toContain('Dialog body');
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledWith('close-button');
  });
});

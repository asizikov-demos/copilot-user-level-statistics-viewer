// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CustomModelProviderUsage } from '../../types/metrics';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import { selectModelDetailsReadModel } from '../../read-models/models';
import CustomModelProvidersTable from '../CustomModelProvidersTable';
import ModelDetailsView from '../ModelDetailsView';

afterEach(cleanup);

const providers: CustomModelProviderUsage[] = [{
  provider: 'Foundry Anthropic',
  interactions: 15,
  users: 2,
  models: [
    { model: 'claude-opus-5-5', interactions: 11, users: 1 },
    { model: 'claude-sonnet-5-5', interactions: 4, users: 2 },
  ],
}, {
  provider: 'Local_LLM',
  interactions: 6,
  users: 1,
  models: [{ model: 'smart-router', interactions: 6, users: 1 }],
}];

describe('CustomModelProvidersTable', () => {
  it('expands provider rows independently with reported model names, interactions, and users', () => {
    render(<CustomModelProvidersTable providers={providers} totalInteractions={30} />);
    const button = screen.getByRole('button', { name: /^Foundry Anthropic/ });
    expect(button.textContent).toContain('2 models');
    expect(button.textContent).toContain('15 interactions');
    expect(button.textContent).toContain('50.0%');
    expect(button.textContent).toContain('2 unique users');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('claude-opus-5-5')).toBeNull();

    fireEvent.click(button);
    const details = screen.getByRole('region', { name: 'Foundry Anthropic models' });
    expect(within(details).queryByText(/^Showing /)).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(details.parentElement?.id).toBe(button.getAttribute('aria-controls'));
    const modelRows = within(details).getAllByRole('row').slice(1);
    expect(modelRows.map(modelRow => within(modelRow).getAllByRole('cell').map(cell => cell.textContent)))
      .toEqual([['claude-opus-5-5', '11', '36.7%', '1'], ['claude-sonnet-5-5', '4', '13.3%', '2']]);
    expect(modelRows[0].querySelector('svg path')?.getAttribute('d')).toMatch(/^M17.3041/);

    fireEvent.click(screen.getByRole('button', { name: /^Local_LLM/ }));
    expect(screen.getByText('smart-router')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Local_LLM models' })).queryByText(/^Showing /)).toBeNull();
    expect(screen.getByText('smart-router').closest('td')?.querySelector('.octicon-ai-model')).toBeTruthy();
    expect(screen.getByText('claude-opus-5-5')).toBeTruthy();
    fireEvent.click(button);
    expect(screen.queryByRole('region', { name: 'Foundry Anthropic models' })).toBeNull();
    expect(screen.getByText('smart-router')).toBeTruthy();
  });

  it('paginates providers and underlying models separately', () => {
    const manyProviders = Array.from({ length: 11 }, (_, i) => ({
      provider: `Provider ${i}`, interactions: 11, users: 1,
      models: Array.from({ length: 11 }, (_, j) => ({ model: `model-${j}`, interactions: 1, users: 1 })),
    }));
    render(<CustomModelProvidersTable providers={manyProviders} totalInteractions={121} />);
    expect(screen.queryByRole('button', { name: /^Provider 10 / })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Provider 0 / }));
    const details = screen.getByRole('region', { name: 'Provider 0 models' });
    expect(within(details).getByText('Showing 1-10 of 11 Provider 0 models')).toBeTruthy();
    expect(within(details).queryByText('model-10')).toBeNull();
    fireEvent.click(within(details).getByRole('link', { name: 'Next Page' }));
    expect(within(details).getByText('model-10')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Provider 1 / })).toBeTruthy();

    const pager = screen.getByRole('group', { name: 'Pagination for providers' });
    fireEvent.click(within(pager).getByRole('link', { name: 'Next Page' }));
    expect(screen.getByRole('button', { name: /^Provider 10 / })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Provider 0 / })).toBeNull();
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
  });

  it('explains empty data without showing a table', () => {
    render(<CustomModelProvidersTable providers={[]} totalInteractions={0} />);
    expect(screen.getByText('No custom model providers')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('resets provider pagination when a different report is supplied', () => {
    const manyProviders = Array.from({ length: 11 }, (_, i) => ({ ...providers[0], provider: `Provider ${i}` }));
    const { rerender } = render(<CustomModelProvidersTable providers={manyProviders} totalInteractions={165} />);
    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    expect(screen.getByText('Provider 10')).toBeTruthy();

    rerender(<CustomModelProvidersTable providers={providers} totalInteractions={21} />);
    expect(screen.getByText('Foundry Anthropic')).toBeTruthy();
    expect(screen.getByText('Showing 1-2 of 2 providers')).toBeTruthy();
  });

  it('renders the provider card immediately before Local BYOK in Model Details', () => {
    const model = selectModelDetailsReadModel(makeAggregatedMetrics());
    const { container } = render(<ModelDetailsView model={model} />);
    const section = container.querySelector('#model-custom-providers');
    expect(section?.nextElementSibling?.id).toBe('model-local-byok');
    expect(section?.previousElementSibling?.id).toBe('model-auto-adoption');
  });

  it.each([
    { totalInteractions: 0, share: '0.0%' },
    { totalInteractions: 100000, share: '<0.1%' },
  ])('formats provider and model shares for a total of $totalInteractions', ({ totalInteractions, share }) => {
    render(<CustomModelProvidersTable providers={[providers[1]]} totalInteractions={totalInteractions} />);
    const button = screen.getByRole('button', { name: /^Local_LLM/ });
    expect(button.textContent).toContain(share);
    fireEvent.click(button);
    expect(within(screen.getByRole('region', { name: 'Local_LLM models' })).getByText(share)).toBeTruthy();
  });
});

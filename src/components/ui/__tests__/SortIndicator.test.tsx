import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SortIndicator, getSortIndicatorAriaSort } from '../SortIndicator';

describe('getSortIndicatorAriaSort', () => {
  it('returns "none" for inactive columns', () => {
    expect(getSortIndicatorAriaSort(false, 'asc')).toBe('none');
    expect(getSortIndicatorAriaSort(false, 'desc')).toBe('none');
  });

  it('returns "ascending" for active ascending column', () => {
    expect(getSortIndicatorAriaSort(true, 'asc')).toBe('ascending');
  });

  it('returns "descending" for active descending column', () => {
    expect(getSortIndicatorAriaSort(true, 'desc')).toBe('descending');
  });
});

describe('SortIndicator', () => {
  it('renders a hidden Octicon describing the active sort direction', () => {
    const ascending = renderToStaticMarkup(<SortIndicator active direction="asc" />);
    const descending = renderToStaticMarkup(<SortIndicator active direction="desc" />);

    expect(ascending).toContain('data-active="true"');
    expect(ascending).toContain('data-direction="asc"');
    expect(ascending).toContain('octicon-triangle-up');
    expect(descending).toContain('data-direction="desc"');
    expect(descending).toContain('octicon-triangle-down');
  });

  it('renders a neutral sortable affordance for inactive columns', () => {
    const markup = renderToStaticMarkup(<SortIndicator active={false} direction="desc" />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-active="false"');
    expect(markup).toContain('data-direction="none"');
    expect(markup).toContain('octicon-arrow-switch');
  });
});

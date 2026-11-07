import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TableCard from '../TableCard';

describe('TableCard', () => {
  it('associates the section with its heading and renders the supplied slots', () => {
    const markup = renderToStaticMarkup(
      <TableCard
        id="client-traffic"
        title="Model traffic by client"
        description={<p>Successful model calls by client.</p>}
        headingAs="h3"
        headerActions={<button type="button">Filter</button>}
        footer={<p>Showing 1-3 of 3 clients</p>}
      >
        <table><tbody><tr><td>Editor</td></tr></tbody></table>
      </TableCard>
    );
    const headingId = markup.match(/aria-labelledby="([^"]+)"/)?.[1];

    expect(headingId).toBeTruthy();
    expect(markup).toContain(`<section id="client-traffic" aria-labelledby="${headingId}"`);
    expect(markup).toContain(`<h3 id="${headingId}"`);
    expect(markup).toContain('Model traffic by client');
    expect(markup).toContain('Successful model calls by client.');
    expect(markup).toContain('<button type="button">Filter</button>');
    expect(markup).toContain('<td>Editor</td>');
    expect(markup).toContain('<footer');
    expect(markup).toContain('Showing 1-3 of 3 clients');
  });

  it('omits the footer when none is provided', () => {
    const markup = renderToStaticMarkup(
      <TableCard title="Version drift">
        <p>No outdated versions.</p>
      </TableCard>
    );

    expect(markup).toContain('<h3');
    expect(markup).not.toContain('<footer');
  });
});

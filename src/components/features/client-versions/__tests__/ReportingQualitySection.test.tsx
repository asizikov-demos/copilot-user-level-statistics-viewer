// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ChartData, ChartOptions } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { chooseOption } from '../../../../__tests__/helpers/simpleSelect';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import ReportingQualitySection from '../ReportingQualitySection';

const { line } = vi.hoisted(() => ({
  line: vi.fn<(props: { data: ChartData<'line', (number | null)[]>; options: ChartOptions<'line'> }) => void>(),
}));
vi.mock('react-chartjs-2', () => ({
  Line: (props: Parameters<typeof line>[0]) => {
    line(props);
    return <div>Reporting trend chart</div>;
  },
}));

const sectionIds = { summary: 'quality', trend: 'trend', requirements: 'requirements', users: 'affected' };
const qualityFor = (records: Parameters<typeof aggregateMetrics>[0]) =>
  aggregateMetrics(records).aggregated.clients.reportingQuality;
const record = (overrides: Parameters<typeof makeMetric>[0] = {}) => makeMetric({
  day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-03',
  ...overrides,
});

afterEach(() => { cleanup(); line.mockClear(); });

describe('Client Versions reporting quality', () => {
  it('shows independent coverage, full-period gaps, explicit zeros and raw component identities', () => {
    const quality = qualityFor([
      record({
        client_telemetry_present: false,
        usage_metrics_requirements: {
          met: ['vscode'], unmet: ['vscode/copilot-chat'], unknown: ['1.138.0:'],
        },
      }),
      record({ user_id: 8, client_telemetry_present: true }),
      record({
        day: '2026-11-03', usage_metrics_requirements: { met: [], unmet: [], unknown: [] },
      }),
    ]);
    render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getByText('Telemetry coverage: 2 of 3 uploaded records.')).toBeTruthy();
    expect(screen.getByText('Requirements coverage: 2 of 3 uploaded records.')).toBeTruthy();
    expect(screen.getByText(/Affected anywhere in the uploaded period/).textContent).toContain('Nov 1, 2026 to Nov 3, 2026');
    const requirementTable = screen.getAllByRole('table')[0];
    expect(within(requirementTable).getByText('vscode')).toBeTruthy();
    expect(within(requirementTable).getByText('vscode/copilot-chat')).toBeTruthy();
    expect(within(requirementTable).getByText('1.138.0:')).toBeTruthy();
    const chart = line.mock.lastCall![0];
    expect(chart.data.datasets).toEqual([
      expect.objectContaining({ label: 'Missing telemetry', data: [null, 1, null], spanGaps: false }),
      expect.objectContaining({ label: 'Below minimum', data: [null, 1, 0], spanGaps: false, borderDash: [5, 3] }),
    ]);
    expect(chart.data.labels).toEqual(['Nov 1', 'Nov 2', 'Nov 3']);
    const issueCell = within(screen.getAllByRole('table')[1]).getAllByRole('cell')[1];
    expect(within(issueCell).getByText('Missing telemetry').tagName).toBe('SPAN');
    expect(within(issueCell).getByText('Below minimum').tagName).toBe('SPAN');
    expect(issueCell.textContent).not.toContain(', ');
    fireEvent.click(within(requirementTable).getByRole('button', { name: 'Component identifier' }));
    expect(within(requirementTable).getAllByRole('row')[1].textContent).toContain('vscode/copilot-chat');
    fireEvent.click(within(requirementTable).getByRole('button', { name: 'Component identifier' }));
    expect(within(requirementTable).getAllByRole('row')[1].textContent).toContain('1.138.0:');
  });

  it('paginates affected users, resets pages on sorting/filtering and opens existing profiles', () => {
    const quality = qualityFor(Array.from({ length: 32 }, (_, index) => record({
      user_id: index + 1,
      user_login: `user-${String(index + 1).padStart(2, '0')}`,
      client_telemetry_present: index < 24 ? false : true,
      usage_metrics_requirements: { met: [], unmet: index >= 8 ? ['vscode/copilot-chat'] : [], unknown: [] },
    })));
    const onUserClick = vi.fn();
    render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={onUserClick} />);
    const table = screen.getAllByRole('table')[1];
    expect(within(table).queryByRole('columnheader', { name: 'Last issue' })).toBeNull();
    expect(within(table).getByRole('columnheader', { name: 'Last missing telemetry' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Last below minimum' })).toBeTruthy();
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Showing 1-10 of 32 affected users')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }));
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Showing 11-20 of 32 affected users')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open profile for user-01' })).toBeNull();
    fireEvent.click(within(table).getByRole('button', { name: 'User' }));
    expect(screen.getByText('Showing 1-10 of 32 affected users')).toBeTruthy();
    expect(within(table).getAllByRole('row')[1].textContent).toContain('user-32');
    fireEvent.click(within(table).getByRole('button', { name: 'User' }));
    expect(within(table).getAllByRole('row')[1].textContent).toContain('user-01');
    fireEvent.click(screen.getByRole('button', { name: 'Open profile for user-01' }));
    expect(onUserClick).toHaveBeenCalledWith('user-01', 1);
    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }));
    chooseOption('Filter affected users', 'Missing telemetry');
    expect(screen.getByText('Showing 1-10 of 24 affected users')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open profile for user-01' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }));
    expect(screen.getAllByRole('table')[1].querySelectorAll('tbody tr')).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Open profile for user-32' })).toBeNull();
    chooseOption('Filter affected users', 'Below minimum');
    expect(screen.getByText('Showing 1-10 of 24 affected users')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open profile for user-01' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Page 3' }));
    expect(screen.getByRole('button', { name: 'Open profile for user-32' })).toBeTruthy();
    chooseOption('Filter affected users', 'Either issue');
    expect(screen.getByText('Showing 1-10 of 32 affected users')).toBeTruthy();
    expect(screen.getAllByRole('table')[1].querySelectorAll('tbody tr')).toHaveLength(10);
  });

  it('distinguishes legacy unavailability from reported empty requirements and excludes unknown-only users', () => {
    const { rerender } = render(<ReportingQualitySection quality={qualityFor([record()])} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getAllByText('Not reported')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Requirements were not reported' })).toBeTruthy();
    expect(line).not.toHaveBeenCalled();
    rerender(<ReportingQualitySection quality={qualityFor([record({
      client_telemetry_present: true,
      usage_metrics_requirements: { met: [], unmet: [], unknown: [] },
    })])} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.queryByText('Not reported')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No components were reported' })).toBeTruthy();
    rerender(<ReportingQualitySection quality={qualityFor([record({
      usage_metrics_requirements: { met: [], unmet: [], unknown: ['future/editor'] },
    })])} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getByText('future/editor')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No affected users match this filter' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Open profile/ })).toBeNull();
  });

  it('bounds a 10,000-user report to 10 rendered rows and resets pagination for new data', () => {
    const quality = qualityFor([record({ client_telemetry_present: false })]);
    quality.summary = { ...quality.summary, recordCount: 10000, telemetryReportedRecords: 10000, missingTelemetryUsers: 10000 };
    quality.affectedUsers = Array.from({ length: 10000 }, (_, index) => ({
      ...quality.affectedUsers[0],
      userId: index + 1,
      userLogin: `user-${String(index + 1).padStart(5, '0')}`,
    }));
    const { rerender } = render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /Open profile/ })).toHaveLength(10);
    expect(screen.getByText('Showing 1-10 of 10,000 affected users')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Page 1000' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Page 1000' }));
    expect(screen.getAllByRole('button', { name: /Open profile/ })).toHaveLength(10);
    expect(screen.getByText('Showing 9,991-10,000 of 10,000 affected users')).toBeTruthy();
    rerender(<ReportingQualitySection quality={qualityFor([record({ user_login: 'new-upload', client_telemetry_present: false })])} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getByText('Showing 1-1 of 1 affected users')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open profile for new-upload' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Page 1000' })).toBeNull();
  });

  it('keeps component and affected-user pagination independent', () => {
    const quality = qualityFor(Array.from({ length: 21 }, (_, index) => record({
      user_id: index + 1,
      client_telemetry_present: false,
      usage_metrics_requirements: { met: [], unmet: [`component-${index}`], unknown: [] },
    })));
    render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    const componentPages = within(screen.getByRole('group', { name: 'Pagination for components' }));
    const userPages = within(screen.getByRole('group', { name: 'Pagination for affected users' }));
    fireEvent.click(componentPages.getByRole('link', { name: 'Page 2' }));
    expect(componentPages.getByText('Showing 11-20 of 21 components')).toBeTruthy();
    expect(userPages.getByText('Showing 1-10 of 21 affected users')).toBeTruthy();
    fireEvent.click(userPages.getByRole('link', { name: 'Page 3' }));
    expect(userPages.getByText('Showing 21-21 of 21 affected users')).toBeTruthy();
    expect(componentPages.getByText('Showing 11-20 of 21 components')).toBeTruthy();
    expect(within(screen.getAllByRole('table')[0]).getAllByRole('row')).toHaveLength(11);
    expect(within(screen.getAllByRole('table')[1]).getAllByRole('row')).toHaveLength(2);
  });

  it('adds canonical IDE names and icons without merging requirement identities or guessing unknown components', () => {
    const quality = qualityFor([record({
      usage_metrics_requirements: {
        met: ['vscode'],
        unmet: ['vscode/copilot-chat', 'goland/copilot-intellij', 'visual_studio', 'intellij'],
        unknown: ['future/editor', '1.138.0:'],
      },
    })]);
    const before = structuredClone(quality);
    render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    const table = screen.getAllByRole('table')[0];
    for (const [raw, canonical] of [
      ['vscode', 'VS Code'],
      ['vscode/copilot-chat', 'VS Code / copilot-chat'],
      ['goland/copilot-intellij', 'GoLand / copilot-intellij'],
      ['visual_studio', 'Visual Studio'],
      ['intellij', 'JetBrains'],
    ]) {
      const label = within(table).getByText(canonical);
      const row = label.closest('tr')!;
      expect(within(row).getByText(raw)).toBeTruthy();
      expect(row.querySelector('svg[aria-hidden="true"]')?.getAttribute('height')).toBe('24');
    }
    for (const raw of ['future/editor', '1.138.0:']) {
      const row = within(table).getByText(raw).closest('tr')!;
      expect(row.querySelector('svg')).toBeNull();
    }
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(quality).toEqual(before);
  });

  it('paginates requirement components and resets the page on sorting or new uploads', () => {
    const quality = qualityFor([record({
      usage_metrics_requirements: {
        met: Array.from({ length: 35 }, (_, index) => `future-component-${String(index).padStart(2, '0')}`),
        unmet: ['vscode'],
        unknown: [],
      },
    })]);
    const { rerender } = render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    const table = screen.getAllByRole('table')[0];
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Showing 1-10 of 36 components')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Page 2' }));
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Showing 11-20 of 36 components')).toBeTruthy();
    fireEvent.click(within(table).getByRole('button', { name: 'Component identifier' }));
    expect(screen.getByText('Showing 1-10 of 36 components')).toBeTruthy();
    expect(within(table).getAllByRole('row')[1].textContent).toContain('VS Code');
    fireEvent.click(within(table).getByRole('button', { name: 'Component identifier' }));
    expect(within(table).getAllByRole('row')[1].textContent).toContain('future-component-00');
    fireEvent.click(screen.getByRole('link', { name: 'Page 4' }));
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByText('Showing 31-36 of 36 components')).toBeTruthy();
    rerender(<ReportingQualitySection quality={qualityFor([record({
      usage_metrics_requirements: { met: ['goland'], unmet: [], unknown: [] },
    })])} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    expect(screen.getByText('Showing 1-1 of 1 components')).toBeTruthy();
    expect(screen.getByText('GoLand')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Page 2' })).toBeNull();
  });

  it('reuses canonical labels and framed icons for each affected-user unmet component', () => {
    const quality = qualityFor([
      record({
        usage_metrics_requirements: {
          met: [], unmet: ['vscode/copilot-chat', 'goland/copilot-intellij', 'future/editor'], unknown: [],
        },
      }),
      record({ user_id: 2, client_telemetry_present: false }),
    ]);
    render(<ReportingQualitySection quality={quality} sectionIds={sectionIds} onUserClick={vi.fn()} />);
    const table = screen.getAllByRole('table')[1];
    const cells = within(table).getAllByRole('cell');
    const components = cells[4];
    expect(within(components).getByText('VS Code / copilot-chat')).toBeTruthy();
    expect(within(components).getByText('vscode/copilot-chat')).toBeTruthy();
    expect(within(components).getByText('GoLand / copilot-intellij')).toBeTruthy();
    expect(within(components).getByText('goland/copilot-intellij')).toBeTruthy();
    expect(within(components).getByText('future/editor')).toBeTruthy();
    expect(components.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
    const missingOnlyRow = within(table).getAllByRole('row')[2];
    expect(within(missingOnlyRow).getAllByRole('cell')[4].textContent).toBe('Not attributed to a component');
  });
});

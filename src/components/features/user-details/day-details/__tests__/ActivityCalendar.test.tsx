// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { getAnchoredPosition } from '@primer/behaviors';
import ActivityCalendar from '../ActivityCalendar';
import CalendarReportingCard from '../CalendarReportingCard';
import { makeUserDay } from '../../__tests__/helpers/userDetailsFixtures';
import { computeActivityCalendar } from '../../../../../domain/calculators/activityCalendarCalculator';
import { computeUserReportingQuality } from '../../../../../domain/calculators/reportingQualityCalculator';

vi.mock('@primer/behaviors', async importOriginal => {
  const original = await importOriginal<typeof import('@primer/behaviors')>();
  return { ...original, getAnchoredPosition: vi.fn(original.getAnchoredPosition) };
});

function renderCalendar() {
  return renderToStaticMarkup(
    <ActivityCalendar
      activity={computeActivityCalendar([
        makeUserDay({ day: '2024-01-01', user_initiated_interaction_count: 0 }),
        makeUserDay({ day: '2024-01-02', user_initiated_interaction_count: 1 }),
        makeUserDay({ day: '2024-01-03', user_initiated_interaction_count: 1000 }),
      ])}
      days={[
        makeUserDay({ day: '2024-01-01', user_initiated_interaction_count: 0 }),
        makeUserDay({ day: '2024-01-02', user_initiated_interaction_count: 1 }),
        makeUserDay({ day: '2024-01-03', user_initiated_interaction_count: 1000 }),
      ]}
      reportStartDay="2024-01-01"
      reportEndDay="2024-01-07"
      onDayClick={() => {}}
    />,
  );
}

function dayCellClass(markup: string, label: string): string {
  const cell = new RegExp(`<div class="([^"]*)"[^>]*aria-label="${label}"`).exec(markup);
  return cell?.[1] ?? '';
}

function idleDayCellClass(markup: string, label: string): string {
  const cell = new RegExp(`<div class="([^"]*)"[^>]*aria-label="${label}"`).exec(markup);
  return cell?.[1] ?? '';
}

describe('ActivityCalendar', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.mocked(getAnchoredPosition).mockClear();
  });

  it('fills its grid cell and separates the heading with a card-header divider', () => {
    const markup = renderCalendar();

    expect(markup).toMatch(/<div class="[^"]*h-full[^"]*">/);
    expect(markup).toMatch(/<header class="[^"]*border-b[^"]*">/);
    expect(markup).toContain('<h3 class="m-0');
  });

  it('repositions the open card when hovering or focusing another date', async () => {
    render(<ActivityCalendar days={[]} activity={computeActivityCalendar([])}
      reportStartDay="2024-01-01" reportEndDay="2024-01-07" onDayClick={vi.fn()} />);
    const first = screen.getByRole('button', { name: 'Jan 1' });
    fireEvent.mouseEnter(first);
    await screen.findByRole('tooltip');
    expect(getAnchoredPosition).toHaveBeenCalledWith(expect.any(HTMLElement), first, expect.anything());
    vi.mocked(getAnchoredPosition).mockClear();
    const second = screen.getByRole('button', { name: 'Jan 2' });
    fireEvent.mouseEnter(second);
    expect(within(await screen.findByRole('tooltip')).getByText('Jan 2, 2024')).toBeTruthy();
    expect(getAnchoredPosition).toHaveBeenCalledWith(expect.any(HTMLElement), second, expect.anything());
    vi.mocked(getAnchoredPosition).mockClear();
    const third = screen.getByRole('button', { name: 'Jan 3' });
    fireEvent.focus(third);
    expect(within(await screen.findByRole('tooltip')).getByText('Jan 3, 2024')).toBeTruthy();
    expect(getAnchoredPosition).toHaveBeenCalledWith(expect.any(HTMLElement), third, expect.anything());
  });

  it('keeps unavailable telemetry distinct from independently reported requirements and raw unknown identifiers', () => {
    const day = makeUserDay({ client_telemetry_present: null, usage_metrics_requirements: {
      met: ['vscode'], unmet: ['vscode/copilot-chat'], unknown: ['1.138.0:'],
    } });
    const markup = renderToStaticMarkup(<CalendarReportingCard day={day.day} quality={computeUserReportingQuality([day]).daily[0]} />);
    expect(markup).toContain('Telemetry status not reported');
    expect(markup).toContain('1 below minimum · 1 unknown');
    expect(markup).toContain('vscode/copilot-chat');
    expect(markup).toContain('1.138.0:');
    expect(markup).not.toContain('Client telemetry received');
    const calendar = renderToStaticMarkup(<ActivityCalendar days={[day]} activity={computeActivityCalendar([day])}
      reportingQuality={computeUserReportingQuality([day])} reportStartDay="2024-01-01" reportEndDay="2024-01-31" onDayClick={vi.fn()} />);
    expect(calendar).toContain('Telemetry status was not reported for this upload.');
    expect(calendar).not.toContain('Server-side telemetry only · 0');
  });
  it('overlays only explicit missing status and reports distinct uploaded-day coverage without changing intensity', () => {
    const days = [
      makeUserDay({ day: '2024-01-01', client_telemetry_present: false }),
      makeUserDay({ day: '2024-01-01', client_telemetry_present: false }),
      makeUserDay({ day: '2024-01-02', client_telemetry_present: true }),
      makeUserDay({ day: '2024-01-03', client_telemetry_present: null }),
      makeUserDay({ day: '2024-01-04' }),
    ];
    render(<ActivityCalendar days={days} activity={computeActivityCalendar(days)}
      reportingQuality={computeUserReportingQuality(days)} reportStartDay="2024-01-01"
      reportEndDay="2024-01-07" onDayClick={vi.fn()} />);
    expect(screen.getAllByTestId('server-only-day')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Jan 1' }).className).toContain('--contribution-default-bgColor-0');
    expect(screen.getByText('Server-side telemetry only · 1 day')).toBeTruthy();
    expect(screen.getByText(/Status available for 2 of 4 uploaded days/)).toBeTruthy();
    expect(screen.getByText(/0 active days/)).toBeTruthy();
  });

  it('shows independent reporting evidence on hover and keyboard focus without stealing focus or blocking day opening', async () => {
    const days = [
      makeUserDay({ day: '2024-01-01', client_telemetry_present: false, usage_metrics_requirements: {
        met: [], unmet: ['vscode', 'vscode/copilot-chat', 'goland/copilot-intellij'], unknown: ['1.138.0:'],
      } }),
      makeUserDay({ day: '2024-01-02', client_telemetry_present: true, usage_metrics_requirements: null }),
    ];
    const onDayClick = vi.fn();
    render(<ThemeProvider colorMode="day"><BaseStyles>
      <ActivityCalendar days={days} activity={computeActivityCalendar(days)} reportingQuality={computeUserReportingQuality(days)}
        reportStartDay="2024-01-01" reportEndDay="2024-01-03" onDayClick={onDayClick} />
    </BaseStyles></ThemeProvider>);
    const first = screen.getByRole('button', { name: 'Jan 1' });
    fireEvent.mouseEnter(first);
    let card = await screen.findByRole('tooltip');
    expect(within(card).getByText('Server-side telemetry only')).toBeTruthy();
    expect(within(card).getByText('3 below minimum · 1 unknown')).toBeTruthy();
    expect(within(card).getByText('VS Code / copilot-chat')).toBeTruthy();
    expect(within(card).getByText('vscode/copilot-chat')).toBeTruthy();
    expect(within(card).getByText('+1 more')).toBeTruthy();
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    const second = screen.getByRole('button', { name: 'Jan 2' });
    second.focus();
    fireEvent.focus(second);
    card = await screen.findByRole('tooltip');
    expect(document.activeElement).toBe(second);
    expect(within(card).getByText('Client telemetry received')).toBeTruthy();
    expect(within(card).queryByText('Version requirements were not reported for this day.')).toBeNull();
    expect(within(card).getByText('Click to open day details.')).toBeTruthy();
    expect(within(card).queryByText(/below minimum ·/)).toBeNull();
    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onDayClick).toHaveBeenCalledWith('2024-01-02', days[1]);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(first);
    expect(onDayClick).toHaveBeenCalledWith('2024-01-01', days[0]);
    const third = screen.getByRole('button', { name: 'Jan 3' });
    fireEvent.focus(third);
    expect(within(await screen.findByRole('tooltip')).getByText('Telemetry status not reported')).toBeTruthy();
    fireEvent.blur(third);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
  it('places UTC dates under the correct weekday in western timezones', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';

    try {
      const markup = renderToStaticMarkup(
        <ActivityCalendar
          activity={computeActivityCalendar([])}
          days={[]}
          reportStartDay="2024-01-01"
          reportEndDay="2024-01-07"
          onDayClick={() => {}}
        />,
      );
      const firstWeek = markup.split('<div class="grid grid-cols-7">')[2];
      const firstDayCell = firstWeek?.split('>1</div>')[0] ?? '';

      expect(firstDayCell.match(/h-8 text-xs flex/g) ?? []).toHaveLength(1);
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });

  it('colors active days with Primer contribution graph tokens', () => {
    const markup = renderCalendar();

    expect(dayCellClass(markup, 'Jan 1')).toContain('bg-[var(--contribution-default-bgColor-0)]');
    expect(dayCellClass(markup, 'Jan 2')).toContain('bg-[var(--contribution-default-bgColor-1)]');
    expect(dayCellClass(markup, 'Jan 3')).toContain('bg-[var(--contribution-default-bgColor-4)]');
    expect(dayCellClass(markup, 'Jan 3')).toContain('text-[var(--fgColor-onEmphasis)]');
    expect(markup).not.toMatch(/bg-green-\d+/);
  });

  it('renders a legend for all five contribution levels', () => {
    const markup = renderCalendar();

    for (let level = 0; level <= 4; level += 1) {
      expect(markup).toContain(`bg-[var(--contribution-default-bgColor-${level})] border-[var(--contribution-default-borderColor-${level})]`);
    }
  });

  it('alternates neutral token tints for idle days across months', () => {
    const markup = renderToStaticMarkup(
      <ActivityCalendar
        activity={computeActivityCalendar([makeUserDay({ day: '2024-02-15', user_initiated_interaction_count: 3 })])}
        days={[makeUserDay({ day: '2024-02-15', user_initiated_interaction_count: 3 })]}
        reportStartDay="2024-01-29"
        reportEndDay="2024-03-03"
        onDayClick={() => {}}
      />,
    );

    expect(idleDayCellClass(markup, 'Jan 30')).toContain('bg-muted');
    expect(idleDayCellClass(markup, 'Feb 2')).toContain('bg-default');
    expect(idleDayCellClass(markup, 'Mar 2')).toContain('bg-muted');
    expect(markup).not.toMatch(/bg-(slate|sky|amber|rose|emerald|violet)-\d+/);
  });

  it('colors traffic-only days and aligns active days without new tooltip content', () => {
    const days = [
      makeUserDay({ day: '2024-01-01', totals_by_client: [{
        client: 'claude_code', request_count: 20, session_count: 0,
        token_usage: { prompt_tokens_sum: 20, output_tokens_sum: 10, avg_tokens_per_request: 1.5 },
        totals_by_model: [],
      }] }),
      makeUserDay({ day: '2024-01-02' }),
    ];
    const markup = renderToStaticMarkup(<ActivityCalendar
      days={days} activity={computeActivityCalendar(days)}
      reportStartDay="2024-01-01" reportEndDay="2024-01-03" onDayClick={() => {}}
    />);
    expect(dayCellClass(markup, 'Jan 1')).toContain('bg-[var(--contribution-default-bgColor-1)]');
    expect(dayCellClass(markup, 'Jan 2')).toContain('bg-[var(--contribution-default-bgColor-0)]');
    expect(markup).toContain('1 active day');
    expect(markup).not.toContain('20 requests');
    expect(markup).not.toContain('reported sessions');
  });
});

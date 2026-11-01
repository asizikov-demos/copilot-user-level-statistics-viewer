import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ActivityCalendar from '../ActivityCalendar';
import { makeUserDay } from '../../__tests__/helpers/userDetailsFixtures';
import { computeActivityCalendar } from '../../../../../domain/calculators/activityCalendarCalculator';

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
  const cell = new RegExp(`<div class="([^"]*)"[^>]*title="${label} - Click to view details"`).exec(markup);
  return cell?.[1] ?? '';
}

function idleDayCellClass(markup: string, label: string): string {
  const cell = new RegExp(`<div class="([^"]*)"[^>]*title="${label} - No activity"`).exec(markup);
  return cell?.[1] ?? '';
}

describe('ActivityCalendar', () => {
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

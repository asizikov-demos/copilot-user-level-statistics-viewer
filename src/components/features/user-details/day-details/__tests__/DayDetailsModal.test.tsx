// @vitest-environment jsdom
import { useState } from 'react';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import DayDetailsModal from '../DayDetailsModal';
import { computeUserReportingQuality } from '../../../../../domain/calculators/reportingQualityCalculator';
import {
  makeCustomizationDaySummary,
  makeCustomizationItem,
  makeUserDay,
} from '../../__tests__/helpers/userDetailsFixtures';

vi.mock('../DayImpactCard', () => ({
  default: () => <div>Impact card</div>,
}));

vi.mock('../DayFeatureBreakdown', () => ({
  default: () => <div>Feature breakdown</div>,
}));

vi.mock('../../charts/DayClientDistributionChart', () => ({
  default: () => <div>Client distribution</div>,
}));

type IdeTotal = UserDayData['totals_by_ide'][number];

const ZERO_TOTALS = {
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

function makeIdeTotal(ide: string, overrides: Partial<IdeTotal> = {}): IdeTotal {
  return { ...ZERO_TOTALS, ide, user_initiated_interaction_count: 0, ...overrides };
}

function withTheme(children: React.ReactNode) {
  return (
    <ThemeProvider colorMode="day">
      <BaseStyles>{children}</BaseStyles>
    </ThemeProvider>
  );
}

function renderDay(dayMetrics?: UserDayData, extraProps: { userLogin?: string } = {}) {
  render(withTheme(
    <DayDetailsModal
      isOpen
      onClose={vi.fn()}
      date={dayMetrics?.day ?? '2024-01-15'}
      dayMetrics={dayMetrics}
      reportingQuality={dayMetrics ? computeUserReportingQuality([dayMetrics]).daily[0] : undefined}
      onNavigateDay={vi.fn()}
      canNavigateNextDay
      canNavigatePrevDay
      {...extraProps}
    />,
  ));
  return document.body.innerHTML;
}

function formatDialogDate(day: string) {
  return new Date(day).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function DialogHarness({ onNavigateDay = vi.fn() }: { onNavigateDay?: (direction: -1 | 1) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open day</button>
      <DayDetailsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        date="2024-01-15"
        dayMetrics={makeUserDay({ day: '2024-01-15' })}
        userLogin="octocat"
        onNavigateDay={onNavigateDay}
        canNavigatePrevDay={false}
        canNavigateNextDay
      />
    </>
  );
}

function openHarnessDialog(onNavigateDay?: (direction: -1 | 1) => void) {
  render(withTheme(<DialogHarness onNavigateDay={onNavigateDay} />));
  const trigger = screen.getByRole('button', { name: 'Open day' });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole('dialog') };
}

describe('DayDetailsModal', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('day-local reporting quality', () => {
    it('reports missing telemetry independently of met/unmet/unknown requirements, preserving component identities', () => {
      renderDay(makeUserDay({
        client_telemetry_present: false,
        usage_metrics_requirements: {
          met: ['vscode'], unmet: ['vscode/copilot-chat'], unknown: ['1.138.0:'],
        },
      }));
      const quality = within(screen.getByRole('region', { name: 'Day reporting quality' }));
      expect(quality.getByText('Missing')).toBeTruthy();
      expect(quality.getByText(/Check IDE telemetry settings, connectivity, and any reported version failures/)).toBeTruthy();
      expect(quality.getByRole('cell', { name: 'Meets minimum' })).toBeTruthy();
      expect(quality.getByRole('cell', { name: 'Below minimum' })).toBeTruthy();
      expect(quality.getByRole('cell', { name: 'Unknown' })).toBeTruthy();
      expect(quality.getByText('VS Code / copilot-chat')).toBeTruthy();
      expect(quality.getByText('vscode/copilot-chat')).toBeTruthy();
      expect(quality.getByText('1.138.0:')).toBeTruthy();
      expect(quality.queryByText(/October|upgrade|uploaded period/i)).toBeNull();
    });

    it.each([undefined, null])('shows compact unavailable states for legacy/null input: %s', value => {
      renderDay(makeUserDay({ client_telemetry_present: value, usage_metrics_requirements: value }));
      const quality = within(screen.getByRole('region', { name: 'Day reporting quality' }));
      expect(quality.getByText('Not reported')).toBeTruthy();
      expect(quality.getByText('Version requirements were not reported for this day.')).toBeTruthy();
      expect(quality.queryByRole('table')).toBeNull();
      expect(quality.queryByText('Meets minimum')).toBeNull();
    });

    it('keeps received telemetry independent of unmet requirements and distinguishes reported empty arrays', () => {
      const first = makeUserDay({ client_telemetry_present: true, usage_metrics_requirements: { met: [], unmet: ['goland/copilot-intellij'], unknown: [] } });
      const second = makeUserDay({ day: '2024-01-16', client_telemetry_present: null, usage_metrics_requirements: { met: [], unmet: [], unknown: [] } });
      const modal = (day: UserDayData, userLogin: string) => withTheme(
        <DayDetailsModal isOpen onClose={vi.fn()} date={day.day} dayMetrics={day} userLogin={userLogin}
          reportingQuality={computeUserReportingQuality([day]).daily[0]} />,
      );
      const { rerender } = render(modal(first, 'first-user'));
      let quality = within(screen.getByRole('region', { name: 'Day reporting quality' }));
      expect(quality.getByText('Received')).toBeTruthy();
      expect(quality.getByText('Below minimum')).toBeTruthy();
      expect(quality.getByText('GoLand / copilot-intellij')).toBeTruthy();
      rerender(modal(second, 'first-user'));
      quality = within(screen.getByRole('region', { name: 'Day reporting quality' }));
      expect(quality.getByText('Not reported')).toBeTruthy();
      expect(quality.getByText(/No components were listed in the reported requirements/)).toBeTruthy();
      expect(quality.queryByRole('table')).toBeNull();
      rerender(modal(makeUserDay({ day: second.day }), 'second-user'));
      quality = within(screen.getByRole('region', { name: 'Day reporting quality' }));
      expect(quality.getByText('Version requirements were not reported for this day.')).toBeTruthy();
      expect(quality.queryByText(/No components were listed/)).toBeNull();
      expect(quality.queryByText('Below minimum')).toBeNull();
    });
  });

  describe('daily client and model measures', () => {
    const requestDay = makeUserDay({
      totals_by_client: [{
        client: 'opencode', request_count: 176, session_count: 0,
        token_usage: { prompt_tokens_sum: 36316766, output_tokens_sum: 104427, avg_tokens_per_request: 206938.6 },
        totals_by_model: [{
          model: 'gpt-4o', model_selection_mode: 'user_selected', request_count: 174,
          token_usage: { prompt_tokens_sum: 36315763, output_tokens_sum: 104415, avg_tokens_per_request: 209311.4 },
        }, {
          model: 'unknown', model_selection_mode: 'auto', request_count: 2,
          token_usage: { prompt_tokens_sum: 1003, output_tokens_sum: 12, avg_tokens_per_request: 507.5 },
        }],
      }],
    });

    it('defaults traffic-only clients and models to requests and displays day-local counts', () => {
      renderDay(requestDay);
      expect(screen.getByRole('combobox', { name: 'Day client measure' })).toHaveProperty('value', 'requests');
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'requests');
      expect(screen.getByText('Client distribution')).toBeTruthy();
      const tables = screen.getAllByRole('table');
      expect(within(tables[0]).getAllByRole('cell').map(cell => cell.textContent))
        .toEqual(['OpenCode', '176', '0', '36,316,766', '104,427']);
      expect(within(tables[1]).getAllByRole('cell').map(cell => cell.textContent))
        .toEqual(['OpenCode', 'GPT-4o', 'user_selected', '174', '36,315,763', '104,415',
          'OpenCode', 'Unknown Model', 'auto', '2', '1,003', '12']);
      for (const cell of [
        within(tables[0]).getByRole('cell', { name: 'OpenCode' }),
        within(tables[1]).getByRole('cell', { name: 'GPT-4o' }),
        within(tables[1]).getByRole('cell', { name: 'Unknown Model' }),
      ]) {
        expect(cell.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
      }
      expect(screen.queryByRole('columnheader', { name: 'Language' })).toBeNull();
    });

    it('paginates both day measures with five client and ten model rows, resetting on date changes', () => {
      const client = requestDay.totals_by_client![0];
      const model = client.totals_by_model[0];
      const day = makeUserDay({
        totals_by_ide: Array.from({ length: 6 }, (_, index) =>
          makeIdeTotal(`client-${index}`, { user_initiated_interaction_count: 1 })),
        totals_by_language_model: Array.from({ length: 11 }, (_, index) => ({
          ...ZERO_TOTALS, language: `language-${index}`, model: 'gpt-4o', code_generation_activity_count: 1,
        })),
        totals_by_client: Array.from({ length: 6 }, (_, index) => ({
          ...client, client: `client-${index}`,
          totals_by_model: index === 0
            ? Array.from({ length: 11 }, (_, modelIndex) => ({ ...model, model: `model-${modelIndex}` }))
            : [],
        })),
      });
      const modal = (date: string) => withTheme(
        <DayDetailsModal isOpen onClose={vi.fn()} date={date} dayMetrics={day} />,
      );
      const { rerender } = render(modal(day.day));
      for (const measure of ['interactions', 'requests']) {
        fireEvent.change(screen.getByRole('combobox', { name: 'Day client measure' }), { target: { value: measure } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Day model measure' }), { target: { value: measure } });
        const tables = screen.getAllByRole('table');
        expect(within(tables[0]).getAllByRole('row')).toHaveLength(6);
        expect(within(tables[1]).getAllByRole('row')).toHaveLength(11);
        const pagers = screen.getAllByRole('group', { name: /^Pagination for day/ });
        fireEvent.click(within(pagers[0]).getByRole('link', { name: 'Next Page' }));
        expect(within(tables[0]).getAllByRole('row')).toHaveLength(2);
        expect(within(tables[1]).getAllByRole('row')).toHaveLength(11);
        fireEvent.click(within(pagers[1]).getByRole('link', { name: 'Next Page' }));
        expect(within(tables[1]).getAllByRole('row')).toHaveLength(2);
        fireEvent.change(screen.getByRole('combobox', { name: 'Day client measure' }), {
          target: { value: measure === 'interactions' ? 'requests' : 'interactions' },
        });
        expect(within(tables[1]).getAllByRole('row')).toHaveLength(2);
        fireEvent.change(screen.getByRole('combobox', { name: 'Day client measure' }), { target: { value: measure } });
        expect(within(tables[1]).getAllByRole('row')).toHaveLength(2);
      }
      rerender(modal('2024-01-16'));
      const tables = screen.getAllByRole('table');
      expect(within(tables[0]).getAllByRole('row')).toHaveLength(6);
      expect(within(tables[1]).getAllByRole('row')).toHaveLength(11);
      expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
    });

    it('switches client and model measures independently and permits unavailable legacy views', () => {
      renderDay(requestDay);
      fireEvent.change(screen.getByRole('combobox', { name: 'Day client measure' }), { target: { value: 'interactions' } });
      expect(screen.getByText('No legacy client activity reported for this day.')).toBeTruthy();
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'requests');
      fireEvent.change(screen.getByRole('combobox', { name: 'Day model measure' }), { target: { value: 'interactions' } });
      expect(screen.getByText('No legacy language and model activity reported for this day.')).toBeTruthy();
      fireEvent.change(screen.getByRole('combobox', { name: 'Day client measure' }), { target: { value: 'requests' } });
      expect(screen.getByRole('cell', { name: '176' })).toBeTruthy();
    });

    it('prefers existing positive legacy data but retains request views', () => {
      renderDay({
        ...requestDay,
        totals_by_ide: [makeIdeTotal('vscode', { assumed_user_initiated_interaction_count: 7 })],
        totals_by_language_model: [{ ...ZERO_TOTALS, language: 'typescript', model: 'legacy-model', code_generation_activity_count: 3 }],
      });
      expect(screen.getByRole('combobox', { name: 'Day client measure' })).toHaveProperty('value', 'interactions');
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'interactions');
      expect(screen.getByRole('cell', { name: 'Legacy model' })).toBeTruthy();
      expect(screen.getByRole('cell', { name: 'Legacy model' }).querySelector('[aria-hidden="true"] svg')).toBeTruthy();
      fireEvent.change(screen.getByRole('combobox', { name: 'Day model measure' }), { target: { value: 'requests' } });
      expect(screen.getByRole('cell', { name: 'GPT-4o' })).toBeTruthy();
      expect(screen.queryByRole('cell', { name: 'Legacy model' })).toBeNull();
    });

    it.each([
      ['gpt-4o', 'GPT-4o'],
      ['claude-3.7-sonnet', 'Claude 3.7 Sonnet'],
      ['unknown', 'Unknown Model'],
      ['', 'Unknown Model'],
    ])('uses the canonical display name for legacy model %s', (model, displayName) => {
      renderDay(makeUserDay({
        totals_by_language_model: [{
          ...ZERO_TOTALS, language: 'typescript', model, code_generation_activity_count: 1,
        }],
      }));
      const cell = screen.getByRole('cell', { name: displayName });
      expect(cell.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
    });

    it('falls back from zero-only legacy data and defaults all-zero data to legacy', () => {
      const zeroLegacy = {
        totals_by_ide: [makeIdeTotal('vscode')],
        totals_by_language_model: [{ ...ZERO_TOTALS, language: 'typescript', model: 'legacy-model' }],
      };
      const { rerender } = render(withTheme(
        <DayDetailsModal isOpen onClose={vi.fn()} date={requestDay.day} dayMetrics={{ ...requestDay, ...zeroLegacy }} />,
      ));
      expect(screen.getByRole('combobox', { name: 'Day client measure' })).toHaveProperty('value', 'requests');
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'requests');
      rerender(withTheme(
        <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-16" dayMetrics={makeUserDay(zeroLegacy)} />,
      ));
      expect(screen.getByRole('combobox', { name: 'Day client measure' })).toHaveProperty('value', 'interactions');
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'interactions');
    });

    it('resets manual choices on date changes and reopening, without intercepting select arrow keys', () => {
      const navigate = vi.fn();
      const modal = (date: string, isOpen = true) => withTheme(
        <DayDetailsModal isOpen={isOpen} date={date} dayMetrics={requestDay}
          onClose={vi.fn()} onNavigateDay={navigate} canNavigatePrevDay canNavigateNextDay />,
      );
      const { rerender } = render(modal(requestDay.day));
      const select = screen.getByRole('combobox', { name: 'Day client measure' });
      fireEvent.keyDown(select, { key: 'ArrowRight' });
      expect(navigate).not.toHaveBeenCalled();
      fireEvent.change(select, { target: { value: 'interactions' } });
      rerender(modal('2024-01-16'));
      expect(screen.getByRole('combobox', { name: 'Day client measure' })).toHaveProperty('value', 'requests');
      fireEvent.change(screen.getByRole('combobox', { name: 'Day model measure' }), { target: { value: 'interactions' } });
      rerender(modal('2024-01-16', false));
      rerender(modal('2024-01-16'));
      expect(screen.getByRole('combobox', { name: 'Day model measure' })).toHaveProperty('value', 'requests');
    });
  });

  describe('dialog behavior', () => {
    beforeEach(() => {
      // JSDOM has no layout, so Primer's focus trap would treat every element as hidden.
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(24);
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(24);
      vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(() => document.body);
      vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 24, 24)] as unknown as DOMRectList);
    });

    it('is a modal dialog named by the selected date and described by the user summary', () => {
      const { dialog } = openHarnessDialog();

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(screen.getByRole('dialog', { name: formatDialogDate('2024-01-15') })).toBe(dialog);
      const descriptionId = dialog.getAttribute('aria-describedby');
      expect(descriptionId && document.getElementById(descriptionId)?.textContent).toMatch(/User: octocat.*AI cost:/);
      expect(document.body.innerHTML).not.toContain('bg-black/50');
    });

    it('moves focus to the dialog title and restores it to the trigger when Escape closes it', () => {
      const { trigger } = openHarnessDialog();

      // Initial focus on an IconButton would open its tooltip, and the tooltip would consume the first Escape.
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: formatDialogDate('2024-01-15') }));

      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('keeps focus inside the dialog while it is open', () => {
      const { trigger, dialog } = openHarnessDialog();

      trigger.focus();

      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('closes from the labelled close button and restores focus', () => {
      const { trigger } = openHarnessDialog();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('renders nothing while closed', () => {
      render(withTheme(<DayDetailsModal isOpen={false} onClose={vi.fn()} date="2024-01-15" />));

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('selected day', () => {
    it('formats the selected report date in UTC for viewers west of UTC', () => {
      const originalTimeZone = process.env.TZ;
      process.env.TZ = 'America/Los_Angeles';

      try {
        renderDay(makeUserDay({ day: '2024-01-15' }));

        expect(screen.getByRole('heading', { name: 'Monday, January 15, 2024' })).toBeDefined();
      } finally {
        if (originalTimeZone === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = originalTimeZone;
        }
      }
    });

    it('renders the given day with navigation controls', () => {
      const markup = renderDay(makeUserDay({
        day: '2024-01-16',
        cliCustomizations: [makeCustomizationDaySummary('skill', 2)],
      }));

      expect(markup).toContain('>2</td>');
      expect(markup).toContain('Previous day');
      expect(markup).toContain('Next day');
    });

    it('shows the no-record state when the day has no metrics', () => {
      const markup = renderDay();

      expect(markup).toContain('No activity recorded');
      expect(markup).not.toContain('id="day-details-cli-customizations"');
    });

    it('omits optional sections for payloads without newer fields', () => {
      const markup = renderDay(makeUserDay());

      expect(markup).toContain('Impact card');
      for (const absent of [
        'id="day-details-cli-customizations"',
        'VS Code Agents window',
        'Activity by Feature',
        'Activity by Client',
        'Activity by Language',
        'Client distribution',
      ]) {
        expect(markup).not.toContain(absent);
      }
    });

    it.each([
      { used_local_byok: true, showsFeature: true },
      { used_local_byok: false, showsFeature: false },
      { showsFeature: false },
    ])('shows Local BYOK only when the day flag is true: %j', ({ showsFeature, ...fields }) => {
      const markup = renderDay(makeUserDay(fields));

      expect(markup.includes('Local BYOK')).toBe(showsFeature);
    });
  });

  describe('customizations', () => {
    it('shows collapsed day-local distinct counts per category', () => {
      const markup = renderDay(makeUserDay({
        cliCustomizations: [
          makeCustomizationDaySummary('skill', 65, [makeCustomizationItem('other', 19)]),
          makeCustomizationDaySummary('custom_agent', 1, [makeCustomizationItem('daily-reviewer', 7)]),
          makeCustomizationDaySummary('mcp', 1, [makeCustomizationItem('daily-server', 12)]),
          makeCustomizationDaySummary('slash_cmd', 2, [makeCustomizationItem('custom', 3)]),
        ],
      }));

      expect(markup).toContain('id="day-details-cli-customizations"');
      expect(markup).toContain('Distinct items used on this day.');
      for (const title of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
        expect(markup).toContain(title);
      }
      for (const count of [65, 1, 2]) {
        expect(markup).toContain(`>${count}</td>`);
      }
      expect(markup.match(/aria-expanded="false"/g)).toHaveLength(4);
      expect(markup).not.toContain('daily-reviewer');
      expect(markup).not.toContain('CLI Customizations');
      expect(markup).not.toContain('Average distinct items');
    });

    it('renders reported zero counts and omits missing categories', () => {
      const markup = renderDay(makeUserDay({
        cliCustomizations: [
          makeCustomizationDaySummary('custom_agent', 0),
          makeCustomizationDaySummary('skill', 2),
          makeCustomizationDaySummary('mcp', null),
          makeCustomizationDaySummary('slash_cmd', null),
        ],
      }));
      const tableMarkup = markup.slice(markup.indexOf('<table'), markup.indexOf('</table>') + '</table>'.length);

      expect(markup).toContain('>0</td>');
      expect(markup).toContain('>2</td>');
      expect(tableMarkup).not.toContain('MCP servers');
      expect(tableMarkup).not.toContain('Slash commands');
      expect(tableMarkup).not.toContain('Not reported');
      expect(markup).not.toContain('aria-expanded');
    });
  });

  describe('VS Code Agents', () => {
    it.each([
      { used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 7 }, expected: ['Yes', '>2<', '>7<'] },
      { used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 }, expected: ['No', '>0<'] },
    ])('shows reported day metrics: %j', ({ expected, ...fields }) => {
      const markup = renderDay(makeUserDay(fields));

      expect(markup).toContain('Dedicated Agents-window activity');
      expect(markup).toContain('Used VS Code Agents window');
      for (const value of expected) expect(markup).toContain(value);
      expect(markup).not.toContain('IDE Agent');
    });

    it('omits missing fields but preserves reported zeros', () => {
      const markup = renderDay(makeUserDay({
        totals_by_vscode_agent: { session_count: 0, total_user_messages: null },
      }));

      expect(markup).toContain('VS Code Agents window');
      expect(markup).toContain('Sessions');
      expect(markup).toContain('>0<');
      expect(markup).not.toContain('Used VS Code Agents window');
      expect(markup).not.toContain('User messages');
      expect(screen.getByText('VS Code Agents window').closest('div')?.textContent).not.toContain('Not reported');
    });
  });

  describe('activity tables', () => {
    it('keeps feature, language and client tables when rows report zero values', () => {
      const markup = renderDay(makeUserDay({
        totals_by_feature: [{ ...ZERO_TOTALS, feature: 'code_completion', user_initiated_interaction_count: 0 }],
        totals_by_language_model: [{ ...ZERO_TOTALS, language: 'typescript', model: 'test-model' }],
        totals_by_ide: [makeIdeTotal('vscode')],
      }));

      expect(markup).toContain('Activity by Feature');
      expect(markup).toContain('Activity by Language &amp; Model');
      expect(markup).toContain('typescript');
      expect(markup).toContain('Activity by Client');
      expect(markup).not.toContain('Client distribution');
    });
  });

  describe('client-specific activity', () => {
    it('keeps reported-zero CLI rows without an empty client chart or usage pill', () => {
      const markup = renderDay(makeUserDay({
        totals_by_cli: {
          session_count: 0, request_count: 0, prompt_count: 0,
          token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
        },
      }));

      expect(markup).toContain('Activity by Client');
      expect(markup).toContain('<span>Copilot CLI</span>');
      expect(markup).not.toContain('Client distribution');
      expect(markup).not.toContain('Features used:');
    });

    const copilotAppDay = makeUserDay({
      used_copilot_app: true,
      totals_by_copilot_app: {
        session_count: 1,
        request_count: 90,
        prompt_count: 7,
        token_usage: {
          avg_tokens_per_request: 138654.93,
          output_tokens_sum: 49838,
          prompt_tokens_sum: 12429106,
        },
      },
      totals_by_ide: [
        makeIdeTotal('copilot_app', { user_initiated_interaction_count: 90 }),
        makeIdeTotal('vscode', {
          user_initiated_interaction_count: 3,
          last_known_plugin_version: {
            sampled_at: '2024-01-15T00:00:00Z',
            plugin: 'vscode-copilot',
            plugin_version: '1.2.3',
          },
        }),
      ],
    });

    it.each([
      ['Sessions', '1'],
      ['Requests', '90'],
      ['Prompts', '7'],
      ['Prompt tokens', '12,429,106'],
      ['Output tokens', '49,838'],
      ['Avg tokens / request', '138,654.9'],
    ])('shows Copilot App usage %s', (label, value) => {
      const markup = renderDay(copilotAppDay, { userLogin: 'octocat' });

      expect(markup).toContain('Copilot App Usage');
      expect(markup).toContain(label);
      expect(markup).toContain(`>${value}<`);
    });

    it('lists Copilot App separately from IDE clients', () => {
      const markup = renderDay(copilotAppDay, { userLogin: 'octocat' });

      expect(markup).toContain('Session and token totals reported by totals_by_copilot_app for this day.');
      expect(markup).toContain('vscode-copilot v1.2.3');
      expect(markup).not.toContain('<span>Copilot App</span>');
    });
  });
});

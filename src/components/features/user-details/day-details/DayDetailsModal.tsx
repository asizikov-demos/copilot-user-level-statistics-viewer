'use client';

import React from 'react';
import { Dialog, IconButton, Label } from '@primer/react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import type { UserDayData } from '../../../../types/metrics';
import { computeCliDayTotals } from '../../../../domain/calculators/cliUsageCalculator';
import { createCliClientActivityRow, mapIdeClientActivityRows } from '../../../../domain/calculators/clientActivityRows';
import { formatIDEName, getIDEIcon } from '../../../icons/IDEIcons';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import EmptyState from '../../../ui/EmptyState';
import { FEATURE_LABEL_VARIANT, type FeatureLabelKey } from '../../../ui/featureLabels';
import DayImpactCard from './DayImpactCard';
import DayFeatureBreakdown from './DayFeatureBreakdown';
import UserDetailsCustomizationsSection from '../sections/UserDetailsCustomizationsSection';
import DayClientDistributionChart from '../charts/DayClientDistributionChart';
import type { VoidCallback } from '../../../../types/events';
import { isAgentFeature, isCliFeature, isCodeCompletionFeature, isCopilotAppFeature } from '../../../../domain/featureCategories';
import { formatAiCreditCost } from '../../../../utils/formatters';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: VoidCallback;
  date: string;
  dayMetrics?: UserDayData;
  userLogin?: string;
  onNavigateDay?: (direction: -1 | 1) => void;
  canNavigatePrevDay?: boolean;
  canNavigateNextDay?: boolean;
}

type LanguageModelRow = UserDayData['totals_by_language_model'][number];

interface ClientRow {
  name: string;
  iconName: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  plugin_version: string;
}

const cellLeft = 'px-4 py-3 text-sm font-medium text-default';
const cellRight = 'px-4 py-3 text-sm text-default text-right';
const headerLeft = 'px-4 py-3 text-left';
const headerRight = 'px-4 py-3 text-right';

interface FeaturePill {
  label: string;
  feature: FeatureLabelKey;
}

function hasCopilotAppActivity(dayMetrics: UserDayData): boolean {
  const appTotals = dayMetrics.totals_by_copilot_app;
  return Boolean(dayMetrics.used_copilot_app)
    || Boolean(appTotals && (
      appTotals.session_count > 0
      || appTotals.request_count > 0
      || appTotals.prompt_count > 0
      || appTotals.token_usage.prompt_tokens_sum > 0
      || appTotals.token_usage.output_tokens_sum > 0
    ))
    || dayMetrics.totals_by_feature.some(
      (f) => isCopilotAppFeature(f.feature) && (
        f.user_initiated_interaction_count > 0
        || f.code_generation_activity_count > 0
        || f.code_acceptance_activity_count > 0
      )
    )
    || dayMetrics.totals_by_ide.some(
      (ide) => ide.ide === 'copilot_app' && getTotalUserInitiatedInteractionCount(ide) > 0
    );
}

function buildFeaturePills(dayMetrics: UserDayData, hasCliActivity: boolean): FeaturePill[] {
  const features = dayMetrics.totals_by_feature ?? [];
  const usedCompletions = features.some(
    (f) => isCodeCompletionFeature(f.feature) && f.code_generation_activity_count > 0
  );
  const usedIdeAgent = features.some(
    (f) => isAgentFeature(f.feature) && !isCliFeature(f.feature) && f.user_initiated_interaction_count > 0
  );

  const reviewActive = dayMetrics.used_copilot_code_review_active;
  const reviewPassive = dayMetrics.used_copilot_code_review_passive;
  const reviewMode = reviewActive && reviewPassive
    ? 'Active & Passive'
    : reviewActive
      ? 'Active'
      : reviewPassive
        ? 'Passive'
        : null;

  const pills: FeaturePill[] = [];
  if (dayMetrics.used_vscode_agent) {
    pills.push({ label: 'VS Code Agents', feature: 'vscodeAgent' });
  }
  if (dayMetrics.used_copilot_coding_agent) {
    pills.push({ label: 'Cloud Agent', feature: 'cloudAgent' });
  }
  if (reviewMode) {
    pills.push({ label: `Code Review (${reviewMode})`, feature: 'codeReview' });
  }
  if (hasCliActivity) {
    pills.push({ label: 'CLI', feature: 'cli' });
  }
  if (hasCopilotAppActivity(dayMetrics)) {
    pills.push({ label: 'Copilot App', feature: 'copilotApp' });
  }
  if (usedCompletions) {
    pills.push({ label: 'Completions', feature: 'completions' });
  }
  if (usedIdeAgent) {
    pills.push({ label: 'IDE Agent', feature: 'ideAgent' });
  }
  return pills;
}

const clientColumns: TableColumn<ClientRow>[] = [
  {
    id: 'name',
    header: 'Client',
    headerClassName: headerLeft,
    className: cellLeft,
    renderCell: (r) => {
      const ClientIcon = getIDEIcon(r.iconName);
      return (
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0" aria-hidden="true">
            <ClientIcon />
          </span>
          <span>{r.name}</span>
        </div>
      );
    },
  },
  { id: 'interactions', header: 'Interactions', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.user_initiated_interaction_count.toLocaleString() },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
  { id: 'pluginVersion', header: 'Plugin Version', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.plugin_version },
];

const usageStatLabelClass = 'text-xs font-medium text-muted uppercase tracking-wider';
const usageStatValueClass = 'mt-1 text-2xl font-semibold text-default';

const languageModelColumns: TableColumn<LanguageModelRow>[] = [
  { id: 'language', header: 'Language', headerClassName: headerLeft, className: cellLeft, renderCell: (r) => r.language || 'Unknown' },
  { id: 'model', header: 'Model', headerClassName: headerLeft, className: 'px-4 py-3 text-sm text-default', renderCell: (r) => r.model || 'Unknown' },
  { id: 'generation', header: 'Generation', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_generation_activity_count.toLocaleString() },
  { id: 'acceptance', header: 'Acceptance', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.code_acceptance_activity_count.toLocaleString() },
  { id: 'locAdded', header: 'LOC Added', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_added_sum.toLocaleString() },
  { id: 'locDeleted', header: 'LOC Deleted', headerClassName: headerRight, className: cellRight, renderCell: (r) => r.loc_deleted_sum.toLocaleString() },
];

export default function DayDetailsModal({ isOpen, onClose, date, dayMetrics, userLogin, onNavigateDay, canNavigatePrevDay = false, canNavigateNextDay = false }: DayDetailsModalProps) {
  // Focus the title on open: focusing an IconButton would open its tooltip, which swallows the first Escape.
  const titleRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && onNavigateDay && canNavigatePrevDay) {
        event.preventDefault();
        onNavigateDay(-1);
      } else if (event.key === 'ArrowRight' && onNavigateDay && canNavigateNextDay) {
        event.preventDefault();
        onNavigateDay(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canNavigatePrevDay, canNavigateNextDay, onNavigateDay]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasData = !!dayMetrics;
  const cliDayTotals = computeCliDayTotals(dayMetrics);
  const cliClientRow = createCliClientActivityRow(cliDayTotals,
    dayMetrics?.totals_by_cli != null
    || dayMetrics?.totals_by_feature.some(feature => isCliFeature(feature.feature))
  );
  const hasCliActivity = cliDayTotals.interactionCount > 0;
  const cliInteractionCount = cliDayTotals.interactionCount;
  const hasClientInteractions = cliInteractionCount > 0
    || dayMetrics?.totals_by_ide.some(ide => getTotalUserInitiatedInteractionCount(ide) > 0);
  const hasVSCodeAgentData = dayMetrics?.used_vscode_agent != null
    || dayMetrics?.totals_by_vscode_agent?.session_count != null
    || dayMetrics?.totals_by_vscode_agent?.total_user_messages != null;

  const featurePills = hasData ? buildFeaturePills(dayMetrics!, hasCliActivity) : [];
  const ideClientRows = hasData ? mapIdeClientActivityRows(
    dayMetrics!.totals_by_ide.filter((ide) => ide.ide !== 'copilot_app')
  ) : [];
  const ideVersionByClient = hasData
    ? new Map(dayMetrics!.totals_by_ide.map((ide) => [
      ide.ide,
      ide.last_known_plugin_version
        ? `${ide.last_known_plugin_version.plugin} v${ide.last_known_plugin_version.plugin_version}`
        : 'Unknown',
    ]))
    : new Map<string, string>();

  const clientRows: ClientRow[] = hasData ? [
    ...ideClientRows.map((client) => ({
      name: formatIDEName(client.ide),
      iconName: client.ide,
      user_initiated_interaction_count: client.user_initiated_interaction_count,
      code_generation_activity_count: client.code_generation_activity_count,
      code_acceptance_activity_count: client.code_acceptance_activity_count,
      loc_added_sum: client.loc_added_sum,
      loc_deleted_sum: client.loc_deleted_sum,
      plugin_version: ideVersionByClient.get(client.ide) ?? 'Unknown',
    })),
    ...(cliClientRow ? [{
      name: formatIDEName(cliClientRow.ide),
      iconName: cliClientRow.ide,
      user_initiated_interaction_count: cliClientRow.user_initiated_interaction_count,
      code_generation_activity_count: cliClientRow.code_generation_activity_count,
      code_acceptance_activity_count: cliClientRow.code_acceptance_activity_count,
      loc_added_sum: cliClientRow.loc_added_sum,
      loc_deleted_sum: cliClientRow.loc_deleted_sum,
      plugin_version: dayMetrics!.totals_by_cli?.last_known_cli_version
        ? `v${dayMetrics!.totals_by_cli.last_known_cli_version.cli_version}`
        : 'Unknown',
    }] : []),
  ] : [];
  const copilotAppUsage = hasData && hasCopilotAppActivity(dayMetrics!)
    ? dayMetrics!.totals_by_copilot_app
    : undefined;

  const formatCount = (value: number) => value.toLocaleString();
  const formatAverageTokens = (value: number) => value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });

  const renderCopilotAppUsageStat = (label: string, value: string) => (
    <div className="rounded-md border border-default bg-muted p-4">
      <div className={usageStatLabelClass}>{label}</div>
      <div className={usageStatValueClass}>{value}</div>
    </div>
  );

  return (
    <Dialog
      width="72rem"
      position={{ narrow: 'fullscreen', regular: 'center' }}
      onClose={onClose}
      initialFocusRef={titleRef}
      renderHeader={({ dialogLabelId, dialogDescriptionId, onClose: closeDialog }) => (
        <Dialog.Header>
          <div className="flex items-start gap-2">
            {onNavigateDay && (
              <IconButton
                icon={ChevronLeftIcon}
                aria-label="Previous day"
                keybindingHint="ArrowLeft"
                variant="invisible"
                onClick={() => onNavigateDay(-1)}
                disabled={!canNavigatePrevDay}
              />
            )}
            <div className="min-w-0 flex-1 self-center">
              <Dialog.Title id={dialogLabelId} ref={titleRef} tabIndex={-1} className="focus:outline-none">
                {formatDate(date)}
              </Dialog.Title>
              {hasData && userLogin && (
                <Dialog.Subtitle id={dialogDescriptionId}>
                  User: {userLogin}
                  <span aria-hidden="true"> • </span>
                  AI cost: {formatAiCreditCost(dayMetrics?.ai_credits_used ?? 0)}
                </Dialog.Subtitle>
              )}
            </div>
            {onNavigateDay && (
              <IconButton
                icon={ChevronRightIcon}
                aria-label="Next day"
                keybindingHint="ArrowRight"
                variant="invisible"
                onClick={() => onNavigateDay(1)}
                disabled={!canNavigateNextDay}
              />
            )}
            <Dialog.CloseButton onClose={() => closeDialog('close-button')} />
          </div>
        </Dialog.Header>
      )}
    >
      {!hasData ? (
        <EmptyState
          icon={CalendarIcon}
          heading="No activity recorded"
          description="There was no GitHub Copilot activity on this date."
        />
      ) : (
        <div className="space-y-6">
          {/* Features used pills */}
          {featurePills.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">Features used:</span>
              {featurePills.map((pill) => (
                <Label key={pill.label} variant={FEATURE_LABEL_VARIANT[pill.feature]}>{pill.label}</Label>
              ))}
            </div>
          )}

          {/* Clients & Impact cards */}
          <div className={`grid grid-cols-1 gap-4 items-stretch${hasClientInteractions ? ' md:grid-cols-2' : ''}`}>
            {hasClientInteractions && (
              <DayClientDistributionChart
                dayMetrics={dayMetrics}
                cliInteractionCount={cliInteractionCount}
              />
            )}
            <DayImpactCard
              locAdded={dayMetrics.loc_added_sum}
              locDeleted={dayMetrics.loc_deleted_sum}
            />
          </div>

          <UserDetailsCustomizationsSection
            key={`${userLogin}-${date}`}
            sectionId="day-details-cli-customizations"
            summaries={dayMetrics.cliCustomizations ?? []}
            mode="day"
          />

          {/* Features Section */}
          {dayMetrics.totals_by_feature.length > 0 && (
            <div className="bg-default rounded-md border border-default p-6">
              <h4 className="text-lg font-semibold text-default mb-1">Activity by Feature</h4>
              <p className="text-sm text-muted mb-4">Expand a feature to see the languages and models used.</p>
              <DayFeatureBreakdown
                totalsByFeature={dayMetrics.totals_by_feature}
                totalsByLanguageFeature={dayMetrics.totals_by_language_feature}
                totalsByModelFeature={dayMetrics.totals_by_model_feature}
              />
            </div>
          )}

          {copilotAppUsage && (
            <div className="bg-default rounded-md border border-default p-6">
              <h4 className="text-lg font-semibold text-default mb-1">Copilot App Usage</h4>
              <p className="text-sm text-muted mb-4">
                Session and token totals reported by totals_by_copilot_app for this day.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderCopilotAppUsageStat('Sessions', formatCount(copilotAppUsage.session_count))}
                {renderCopilotAppUsageStat('Requests', formatCount(copilotAppUsage.request_count))}
                {renderCopilotAppUsageStat('Prompts', formatCount(copilotAppUsage.prompt_count))}
                {renderCopilotAppUsageStat('Prompt tokens', formatCount(copilotAppUsage.token_usage.prompt_tokens_sum))}
                {renderCopilotAppUsageStat('Output tokens', formatCount(copilotAppUsage.token_usage.output_tokens_sum))}
                {renderCopilotAppUsageStat(
                  'Avg tokens / request',
                  formatAverageTokens(copilotAppUsage.token_usage.avg_tokens_per_request)
                )}
              </div>
            </div>
          )}

          {hasVSCodeAgentData && (
            <div className="bg-default rounded-md border border-default p-6">
              <h4 className="text-lg font-semibold text-default mb-1">VS Code Agents</h4>
              <p className="text-sm text-muted mb-4">
                Dedicated Agents-window activity, separate from editor Agent Mode.
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {dayMetrics.used_vscode_agent != null && (
                  <div>
                    <dt className={usageStatLabelClass}>Used VS Code Agents</dt>
                    <dd className={usageStatValueClass}>{dayMetrics.used_vscode_agent ? 'Yes' : 'No'}</dd>
                  </div>
                )}
                {dayMetrics.totals_by_vscode_agent?.session_count != null && (
                  <div>
                    <dt className={usageStatLabelClass}>Sessions</dt>
                    <dd className={usageStatValueClass}>{dayMetrics.totals_by_vscode_agent.session_count.toLocaleString()}</dd>
                  </div>
                )}
                {dayMetrics.totals_by_vscode_agent?.total_user_messages != null && (
                  <div>
                    <dt className={usageStatLabelClass}>User messages</dt>
                    <dd className={usageStatValueClass}>{dayMetrics.totals_by_vscode_agent.total_user_messages.toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Activity by Client section (includes IDE & CLI clients) */}
          {clientRows.length > 0 && (
            <div className="bg-default rounded-md border border-default p-6">
              <h4 className="text-lg font-semibold text-default mb-4">Activity by Client</h4>
              <MetricsTable
                data={clientRows}
                columns={clientColumns}
                tableClassName="w-full divide-y divide-default"
                tableContainerClassName="overflow-x-auto"
                theadClassName="bg-muted"
                tbodyClassName="bg-default divide-y divide-default"
                rowClassName={() => 'hover:bg-muted'}
                getRowKey={(_, idx) => idx}
                initialCount={5}
              />
            </div>
          )}

          {/* Language + Model Section */}
          {dayMetrics.totals_by_language_model.length > 0 && (
            <div className="bg-default rounded-md border border-default p-6">
              <h4 className="text-lg font-semibold text-default mb-4">Activity by Language &amp; Model</h4>
              <MetricsTable
                data={dayMetrics.totals_by_language_model}
                columns={languageModelColumns}
                tableClassName="w-full divide-y divide-default"
                tableContainerClassName="overflow-x-auto"
                theadClassName="bg-muted"
                tbodyClassName="bg-default divide-y divide-default"
                rowClassName={() => 'hover:bg-muted'}
                getRowKey={(_, idx) => idx}
                initialCount={10}
              />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

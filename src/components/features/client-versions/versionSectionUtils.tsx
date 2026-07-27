import ExpandableInlineList from '../../ui/ExpandableInlineList';
import { parseReportDayInclusiveEnd } from '../../../domain/vscodeVersionClassifier';

export const tableHeaderClass = 'px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
export const narrowCellClass = 'px-4 py-2 text-sm text-gray-900 whitespace-nowrap';
export const usernameCellClass = 'px-4 py-2 text-sm text-gray-900';

export type ClientVersionScope = 'jetbrains' | 'vscode';

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function formatReportDay(reportDay: string): string {
  const parsedReportDay = parseReportDayInclusiveEnd(reportDay);
  if (parsedReportDay === null) return reportDay;

  try {
    return parsedReportDay.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return reportDay;
  }
}

export function createUsernamesContainerId(
  scope: ClientVersionScope,
  pluginVersion: string
) {
  const encodedVersion = Array.from(pluginVersion)
    .map((char) => char.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('-');
  return `${scope}-usernames-${encodedVersion || 'empty-version'}`;
}

export function renderVersionUsernames(
  scope: ClientVersionScope,
  pluginVersion: string,
  usernames: string[]
) {
  return (
    <ExpandableInlineList
      items={usernames}
      initialCount={3}
      contentId={createUsernamesContainerId(scope, pluginVersion)}
    />
  );
}

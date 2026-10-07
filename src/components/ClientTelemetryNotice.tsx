'use client';

import { useId } from 'react';
import {
  CLIENT_TELEMETRY_ANNOUNCEMENT_URL,
  type ClientTelemetryWarning,
} from '../domain/calculators/clientTelemetryCalculator';
import { formatIDEName } from './icons/IDEIcons';
import { useExpandableList } from '../hooks/useExpandableList';

interface ClientTelemetryNoticeProps {
  warnings: ClientTelemetryWarning[];
  showUserCounts?: boolean;
}

export default function ClientTelemetryNotice({
  warnings,
  showUserCounts = true,
}: ClientTelemetryNoticeProps) {
  const listId = useId();
  const { visibleItems, canExpand, isExpanded, toggleExpanded } = useExpandableList(warnings, 3);
  if (warnings.length === 0) return null;

  return (
    <aside
      aria-label="Copilot client telemetry warning"
      className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <h2 className="font-semibold">Copilot agent telemetry: client upgrades may be needed</h2>
      <p className="mt-2">
        Versions requiring an upgrade or verification were detected in this report.
        SDK-based IDE agent activity and lines of code may be undercounted, and some
        activity may be attributed to Copilot CLI. Only SDK-based releases are affected;
        GitHub has not published the first affected versions, so older versions are not
        necessarily faulty.
      </p>
      <ul id={listId} className="mt-2 list-disc space-y-1 pl-5">
        {visibleItems.map(warning => (
          <li key={`${warning.ide}-${warning.versionKind}-${warning.version}`}>
            <strong>{formatIDEName(warning.ide)} {warning.versionKind} {warning.version}</strong>
            {showUserCounts && ` (${warning.userCount} ${warning.userCount === 1 ? 'user' : 'users'})`}
            {' — '}{warning.action === 'verify' ? 'Verify whether this release is affected. ' : ''}
            {warning.recommendation}
          </li>
        ))}
      </ul>
      {canExpand && (
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-controls={listId}
          className="mt-2 font-medium underline"
        >
          {isExpanded ? 'Show less' : `Show all ${warnings.length} versions`}
        </button>
      )}
      <p className="mt-2">
        Observed versions are historical, not proof of a current installation. Upgrading
        restores future reporting; missing activity cannot be backfilled. Billing is
        unaffected, and Copilot CLI users do not need to upgrade for this issue.{' '}
        <a
          href={CLIENT_TELEMETRY_ANNOUNCEMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Read the GitHub announcement for details
        </a>.
      </p>
    </aside>
  );
}

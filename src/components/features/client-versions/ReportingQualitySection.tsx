'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, FormControl, Label, Link, Select } from '@primer/react';
import { AlertIcon, QuestionIcon } from '@primer/octicons-react';
import type { ReportingQualityComponent, ReportingQualityMetrics, ReportingQualityUser } from '../../../types/reportingQuality';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { MetricTile } from '../../ui/MetricTile';
import MetricsTable, { type TableColumn } from '../../ui/MetricsTable';
import EmptyState from '../../ui/EmptyState';
import ReportingQualityTrendChart from '../../charts/ReportingQualityTrendChart';
import { formatReportDay } from './versionSectionUtils';
import RequirementComponent from '../../ui/RequirementComponent';
import TablePagination, { TABLE_PAGE_SIZE } from '../../ui/TablePagination';

type IssueFilter = 'either' | 'missing' | 'below';
interface UserRow extends ReportingQualityUser {
  issues: string;
  components: string;
}

const textColumn = {
  headerClassName: 'px-6 py-3 text-left whitespace-nowrap',
  className: 'px-6 py-4 text-sm text-default whitespace-nowrap',
};

const numericColumn = {
  headerClassName: 'px-6 py-3 text-right whitespace-nowrap',
  className: 'px-6 py-4 text-sm text-default text-right tabular-nums whitespace-nowrap',
};

function RequirementsTable({ quality }: { quality: ReportingQualityMetrics }) {
  const [page, setPage] = useState(1);
  const { sortField, sortDirection, sortedItems, handleSort } = useSortableTable<ReportingQualityComponent, keyof ReportingQualityComponent>(quality.components, 'unmetUsers');
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * TABLE_PAGE_SIZE;
  const pagedComponents = sortedItems.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
  useEffect(() => { setPage(1); }, [sortField, sortDirection, quality.components]);
  const columns: TableColumn<ReportingQualityComponent>[] = [
    { id: 'component', header: 'Component identifier', sortable: true, ...textColumn, className: 'px-6 py-4 text-sm text-default whitespace-pre-wrap break-words', renderCell: row => <RequirementComponent component={row.component} /> },
    { id: 'unmetUsers', header: 'Users observed unmet', accessor: 'unmetUsers', sortable: true, ...numericColumn },
    { id: 'unknownUsers', header: 'Users observed unknown', accessor: 'unknownUsers', sortable: true, ...numericColumn },
  ];
  return (
    <div className="space-y-4">
      <MetricsTable
        data={pagedComponents}
        columns={columns}
        sortState={{ field: sortField ?? 'unmetUsers', direction: sortDirection }}
        onSortChange={({ field }) => {
          if (field === 'component' || field === 'unmetUsers' || field === 'unknownUsers') handleSort(field);
        }}
        getRowKey={row => row.component}
        tableContainerClassName="overflow-x-auto border border-default"
        tableClassName="w-full divide-y divide-default"
        theadClassName="bg-muted"
        emptyState={
          <EmptyState heading={quality.summary.requirementsReportedRecords === 0 ? 'Requirements were not reported' : 'No components were reported'} headingAs="h3"
            description={quality.summary.requirementsReportedRecords === 0
              ? 'Missing or null requirements cannot establish component status.'
              : 'Reported requirements lists are empty; this is not proof of complete telemetry.'}
          />
        }
      />
      <TablePagination itemCount={sortedItems.length} currentPage={currentPage} itemLabel="components" onPageChange={setPage} />
    </div>
  );
}

function AffectedUsersTable({
  quality,
  onUserClick,
}: {
  quality: ReportingQualityMetrics;
  onUserClick: (userLogin: string, userId: number) => void;
}) {
  const [filter, setFilter] = useState<IssueFilter>('either');
  const [page, setPage] = useState(1);
  const rows = useMemo<UserRow[]>(() => quality.affectedUsers
    .filter(user => filter === 'either' || (filter === 'missing' ? user.missingTelemetryDays > 0 : user.belowMinimumDays > 0))
    .map(user => ({
      ...user,
      issues: [
        ...(user.missingTelemetryDays > 0 ? ['Missing telemetry'] : []),
        ...(user.belowMinimumDays > 0 ? ['Below minimum'] : []),
      ].join(', '),
      components: user.affectedComponents.join(', '),
    })), [quality.affectedUsers, filter]);
  const { sortField, sortDirection, sortedItems, handleSort } = useSortableTable<UserRow, keyof UserRow>(rows, 'lastIssueDay');
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * TABLE_PAGE_SIZE;
  const pagedUsers = sortedItems.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter, sortField, sortDirection, quality.affectedUsers]);
  const columns: TableColumn<UserRow>[] = [
    {
      id: 'userLogin', header: 'User', sortable: true, ...textColumn,
      renderCell: user => (
        <Button variant="link" onClick={() => onUserClick(user.userLogin, user.userId)} aria-label={`Open profile for ${user.userLogin}`}>
          {user.userLogin}
        </Button>
      ),
    },
    {
      id: 'issues', header: 'Issue types', sortable: true, ...textColumn,
      renderCell: user => (
        <div className="flex flex-wrap gap-2">
          {user.missingTelemetryDays > 0 && <Label variant="attention">Missing telemetry</Label>}
          {user.belowMinimumDays > 0 && <Label variant="danger">Below minimum</Label>}
        </div>
      ),
    },
    { id: 'missingTelemetryDays', header: 'Missing-telemetry days', accessor: 'missingTelemetryDays', sortable: true, ...numericColumn },
    { id: 'belowMinimumDays', header: 'Below-minimum days', accessor: 'belowMinimumDays', sortable: true, ...numericColumn },
    {
      id: 'components', header: 'Components observed unmet', sortable: true, ...textColumn,
      className: 'min-w-[12rem] max-w-[24rem] px-6 py-4 text-sm text-default whitespace-pre-wrap break-words',
      renderCell: user => user.affectedComponents.length > 0 ? (
        <div className="space-y-3">
          {user.affectedComponents.map(component => <RequirementComponent key={component} component={component} />)}
        </div>
      ) : 'Not attributed to a component',
    },
    {
      id: 'lastMissingTelemetryDay', header: 'Last missing telemetry', sortable: true, ...textColumn,
      renderCell: user => user.lastMissingTelemetryDay ? formatReportDay(user.lastMissingTelemetryDay) : 'Not observed',
    },
    {
      id: 'lastBelowMinimumDay', header: 'Last below minimum', sortable: true, ...textColumn,
      renderCell: user => user.lastBelowMinimumDay ? formatReportDay(user.lastBelowMinimumDay) : 'Not observed',
    },
  ];
  return (
    <div className="space-y-4">
      <FormControl>
        <FormControl.Label>Filter affected users</FormControl.Label>
        <Select
          value={filter}
          onChange={event => {
            const value = event.target.value;
            if (value === 'either' || value === 'missing' || value === 'below') setFilter(value);
          }}
        >
          <Select.Option value="either">Either issue</Select.Option>
          <Select.Option value="missing">Missing telemetry</Select.Option>
          <Select.Option value="below">Below minimum</Select.Option>
        </Select>
      </FormControl>
      <MetricsTable
        data={pagedUsers}
        columns={columns}
        sortState={{ field: sortField ?? 'lastIssueDay', direction: sortDirection }}
        onSortChange={({ field }) => {
          if (field === 'userLogin' || field === 'issues' || field === 'missingTelemetryDays'
            || field === 'belowMinimumDays' || field === 'components'
            || field === 'lastMissingTelemetryDay' || field === 'lastBelowMinimumDay') handleSort(field);
        }}
        getRowKey={user => user.userId}
        tableContainerClassName="overflow-x-auto border border-default"
        tableClassName="w-full divide-y divide-default"
        theadClassName="bg-muted"
        emptyState={
          <EmptyState heading={quality.summary.telemetryReportedRecords + quality.summary.requirementsReportedRecords === 0 ? 'Reporting signals were not reported' : 'No affected users match this filter'} headingAs="h3"
            description="Only explicit missing-telemetry or unmet-requirement observations identify affected users."
          />
        }
      />
      <TablePagination itemCount={sortedItems.length} currentPage={currentPage} itemLabel="affected users" onPageChange={setPage} />
    </div>
  );
}

export default function ReportingQualitySection({
  quality,
  onUserClick,
  sectionIds,
}: {
  quality: ReportingQualityMetrics;
  onUserClick: (userLogin: string, userId: number) => void;
  sectionIds: { summary: string; trend: string; requirements: string; users: string };
}) {
  const { summary } = quality;
  return (
    <>
      <section id={sectionIds.summary} className="space-y-4 scroll-mt-28">
        <div>
          <h2 className="text-lg font-semibold text-default">Reported telemetry and requirements</h2>
          <p className="mt-1 text-sm text-muted">
            Affected anywhere in the uploaded period{quality.reportStartDay && quality.reportEndDay
              ? `: ${formatReportDay(quality.reportStartDay)} to ${formatReportDay(quality.reportEndDay)}`
              : ''}. Historical observations, not current installation status.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricTile
            title="Users missing client telemetry"
            value={summary.missingTelemetryUsers ?? 'Not reported'}
            subtitle="Distinct users with an explicit false telemetry flag"
            icon={<QuestionIcon size={24} />}
            accent="orange"
          />
          <MetricTile
            title="Users with below-minimum components"
            value={summary.belowMinimumUsers ?? 'Not reported'}
            subtitle="Distinct users with at least one reported unmet requirement"
            icon={<AlertIcon size={24} />}
            accent="orange"
          />
        </div>
        <div className="space-y-1 text-sm text-muted">
          <p>Telemetry coverage: {summary.telemetryReportedRecords.toLocaleString()} of {summary.recordCount.toLocaleString()} uploaded records.</p>
          <p>Requirements coverage: {summary.requirementsReportedRecords.toLocaleString()} of {summary.recordCount.toLocaleString()} uploaded records.</p>
          <p>
            Users may appear in both categories. Missing telemetry does not diagnose inactivity or an upgrade problem;
            telemetry present does not prove completeness. Missing/null signals are unavailable.{' '}
            <Link inline href="https://github.blog/changelog/2026-11-05-usage-metrics-api-flags-telemetry-and-version-gaps/" target="_blank" rel="noopener noreferrer">
              API signal definitions
            </Link>.
          </p>
        </div>
      </section>
      <section id={sectionIds.trend} className="scroll-mt-28">
        <ReportingQualityTrendChart daily={quality.daily} />
      </section>
      <section id={sectionIds.requirements} className="space-y-3 scroll-mt-28">
        <h2 className="text-lg font-semibold text-default">Reported requirements by component</h2>
        <p className="text-sm text-muted">
          Distinct users observed in each status across the period. IDE and extension identifiers stay separate.
          Unknown means unverifiable, not below minimum. A user can appear in both statuses across dates;
          counts across components or statuses are not additive.
        </p>
        <RequirementsTable quality={quality} />
      </section>
      <section id={sectionIds.users} className="space-y-3 scroll-mt-28">
        <h2 className="text-lg font-semibold text-default">Affected users</h2>
        <p className="text-sm text-muted">
          Days are distinct observed dates per issue. Components apply only to reported unmet requirements,
          not to missing telemetry. Last dates describe observations, not unresolved current faults.
        </p>
        <AffectedUsersTable quality={quality} onUserClick={onUserClick} />
      </section>
    </>
  );
}

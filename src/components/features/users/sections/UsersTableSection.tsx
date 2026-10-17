'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, FormControl, Label, Pagination, Select, TextInput } from '@primer/react';
import { FilterIcon, PeopleIcon, SearchIcon } from '@primer/octicons-react';
import type { UserSummary } from '../../../../types/metrics';
import {
  USER_FEATURE_FILTERS,
  useUserFilters,
} from '../../../../hooks/useUserFilters';
import { useSortableTable } from '../../../../hooks/useSortableTable';
import { formatAiCreditCost } from '../../../../utils/formatters';
import { formatIDEName } from '../../../../utils/ideNames';
import { getIDEIcon } from '../../../icons/IDEIcons';
import MetricsTable, { TableColumn } from '../../../ui/MetricsTable';
import EmptyState from '../../../ui/EmptyState';
import { FEATURE_LABEL_VARIANT, type FeatureLabelKey } from '../../../ui/featureLabels';
import AiAdoptionPhaseLabel from '../../ai-adoption-phases/AiAdoptionPhaseLabel';

interface UsersTableSectionProps {
  sectionId: string;
  users: UserSummary[];
  onUserClick: (userLogin: string, userId: number) => void;
}

type SortField = 'user_login' | 'total_ai_credits_used' | 'days_active' | 'net_loc_contribution' | 'cloud_agent_days' | 'code_review_days' | 'top_client';

const USERS_PER_PAGE = 500;

const USER_FEATURE_LABELS: ReadonlyArray<{
  key: FeatureLabelKey;
  label: string;
  isUsed: (user: UserSummary) => boolean;
}> = [
  { key: 'chat', label: 'Chat', isUsed: (user) => user.used_chat },
  { key: 'ideAgent', label: 'Agent', isUsed: (user) => user.used_agent },
  { key: 'vscodeAgent', label: 'VS Code Agents', isUsed: (user) => Boolean(user.used_vscode_agent) },
  { key: 'cli', label: 'CLI', isUsed: (user) => user.used_cli },
  { key: 'copilotApp', label: 'App', isUsed: (user) => user.used_copilot_app },
  { key: 'cloudAgent', label: 'Cloud Agent', isUsed: (user) => user.used_copilot_coding_agent },
  {
    key: 'codeReview',
    label: 'Code Review',
    isUsed: (user) => user.used_copilot_code_review_active || user.used_copilot_code_review_passive,
  },
  { key: 'autoMode', label: 'Auto Mode', isUsed: (user) => Boolean(user.used_auto_mode) },
  { key: 'completions', label: 'Completions', isUsed: (user) => user.used_code_completion },
];

function ClientIcon({ client }: { client: string }) {
  const Icon = getIDEIcon(client);

  return (
    <span aria-hidden="true" className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
      <Icon />
    </span>
  );
}

export default function UsersTableSection({
  sectionId,
  users,
  onUserClick,
}: UsersTableSectionProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedClient,
    setSelectedClient,
    selectedFeature,
    setSelectedFeature,
    clientOptions,
    hasActiveFilters,
    clearFilters,
    filteredUsers,
  } = useUserFilters(users);
  const { sortField, sortDirection, sortedItems: sortedUsers, handleSort } = useSortableTable<UserSummary, SortField>(
    filteredUsers,
    'days_active',
    'desc'
  );
  const [currentPage, setCurrentPage] = useState(1);

  const handleUserClick = (user: UserSummary) => {
    onUserClick(user.user_login, user.user_id);
  };

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PER_PAGE));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return sortedUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, sortedUsers]);
  const pageStart = sortedUsers.length === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * USERS_PER_PAGE, sortedUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedClient,
    selectedFeature,
    sortField,
    sortDirection,
    users,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const tableSortState = { field: sortField as string, direction: sortDirection };

  const headerBaseClass = 'px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider';
  const headerRightClass = 'px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider';
  const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

  const columns: TableColumn<UserSummary>[] = [
    {
      id: 'user_login',
      header: 'USER',
      sortable: true,
      headerClassName: `${headerBaseClass} w-1/4`,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 relative">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.user_login.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-default">{user.user_login}</div>
            <div className="text-sm text-muted">ID: {user.user_id}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'days_active',
      header: 'DAYS ACTIVE',
      sortable: true,
      accessor: 'days_active',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_ai_credits_used',
      header: 'AI COST',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => formatAiCreditCost(user.total_ai_credits_used),
    },
    {
      id: 'net_loc_contribution',
      header: 'LOC IMPACT',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{user.total_loc_added.toLocaleString()}</span>
          <span className="text-disabled">/</span>
          <span className="text-red-600">-{user.total_loc_deleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'cloud_agent_days',
      header: 'CLOUD AGENT',
      sortable: true,
      accessor: 'cloud_agent_days',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'code_review_days',
      header: 'CODE REVIEW',
      sortable: true,
      accessor: 'code_review_days',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'top_client',
      header: 'CLIENT',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => user.top_client ? (
        <span className="inline-flex items-center justify-end gap-2">
          <ClientIcon client={user.top_client} />
          {formatIDEName(user.top_client)}
        </span>
      ) : '-',
    },
    {
      id: 'ai_adoption_phase',
      header: 'AI ADOPTION',
      headerClassName: `${headerRightClass} w-[15%] whitespace-nowrap`,
      className: 'px-6 py-4 whitespace-nowrap text-right',
      renderCell: (user) => <AiAdoptionPhaseLabel phase={user.ai_adoption_phase} />,
    },
    {
      id: 'features_used',
      header: 'FEATURES USED',
      headerClassName: 'px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider w-1/4',
      className: 'px-6 py-4 whitespace-nowrap min-w-[280px] text-right',
      renderCell: (user) => (
        <div className="flex flex-wrap gap-1 justify-end">
          {USER_FEATURE_LABELS.filter(({ isUsed }) => isUsed(user)).map(({ key, label }) => (
            <Label key={key} variant={FEATURE_LABEL_VARIANT[key]}>
              {label}
            </Label>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div id={sectionId} className="mt-6 pt-6 border-t border-default">
      <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.35fr)_minmax(180px,0.35fr)_auto] md:items-end">
        <FormControl id="userSearch">
          <FormControl.Label>Search by user login</FormControl.Label>
          <TextInput
            block
            type="search"
            leadingVisual={SearchIcon}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Start typing a username..."
          />
        </FormControl>
        <FormControl id="clientFilter">
          <FormControl.Label>IDE used</FormControl.Label>
          <Select block value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
            <Select.Option value="">All IDEs</Select.Option>
            {clientOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
        <FormControl id="featureFilter">
          <FormControl.Label>Feature used</FormControl.Label>
          <Select block value={selectedFeature} onChange={(e) => setSelectedFeature(e.target.value)}>
            <Select.Option value="">All features</Select.Option>
            {USER_FEATURE_FILTERS.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
        <Button onClick={clearFilters} disabled={!hasActiveFilters}>
          Clear
        </Button>
      </div>
      <p className="mb-3 text-sm text-muted">
        Showing {sortedUsers.length.toLocaleString()} of {users.length.toLocaleString()} users
      </p>
      <div className="overflow-x-auto border border-default">
        <MetricsTable<UserSummary>
          data={pagedUsers}
          columns={columns}
          sortState={tableSortState}
          onSortChange={({ field }) => handleSort(field as SortField)}
          rowClassName={() => 'hover:bg-muted cursor-pointer transition-colors'}
          tableClassName="w-full divide-y divide-default"
          theadClassName="bg-muted"
          onRowClick={(user) => handleUserClick(user)}
        />
      </div>
      {sortedUsers.length > USERS_PER_PAGE && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {sortedUsers.length.toLocaleString()} users
          </p>
          <Pagination
            pageCount={totalPages}
            currentPage={currentPage}
            onPageChange={(event, page) => {
              event.preventDefault();
              setCurrentPage(page);
            }}
          />
        </div>
      )}

      {users.length === 0 && (
        <EmptyState icon={PeopleIcon} heading="No user data available" />
      )}
      {users.length > 0 && sortedUsers.length === 0 && (
        <EmptyState
          icon={FilterIcon}
          heading="No users match the selected filters"
          description="Try a different search or clear the filters."
        />
      )}
    </div>
  );
}

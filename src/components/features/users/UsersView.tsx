'use client';

import type { UsersReadModel } from '../../../read-models/users';
import { ViewPanel } from '../../ui';
import UsersSummarySection from './sections/UsersSummarySection';
import UsersTableSection from './sections/UsersTableSection';
import { USERS_SECTIONS } from './usersSections';

interface UsersViewProps {
  model: UsersReadModel;
  onUserClick: (userLogin: string, userId: number) => void;
}

export default function UsersView({ model, onUserClick }: UsersViewProps) {
  const { users } = model;
  const [summarySection, usersTableSection] = USERS_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Unique Users',
      }}
      contentClassName="space-y-6"
    >
      <UsersSummarySection sectionId={summarySection.id} users={users} />
      <UsersTableSection
        sectionId={usersTableSection.id}
        users={users}
        onUserClick={onUserClick}
      />
    </ViewPanel>
  );
}

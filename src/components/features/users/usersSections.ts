interface UsersContextSection {
  id: string;
  label: string;
}

export const USERS_SECTIONS: UsersContextSection[] = [
  { id: 'users-summary', label: 'Summary' },
  { id: 'users-table', label: 'Users Table' },
];

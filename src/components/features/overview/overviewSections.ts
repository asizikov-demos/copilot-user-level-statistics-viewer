export interface OverviewSection {
  id: string;
  label: string;
}

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  { id: 'chart-daily-user-engagement', label: 'Daily User Engagement' },
  { id: 'chart-daily-chat-users', label: 'Daily Chat Users Trends' },
  { id: 'chart-daily-chat-requests', label: 'Daily Chat Requests' },
];

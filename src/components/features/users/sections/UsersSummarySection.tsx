import type { UserSummary } from '../../../../types/metrics';
import DashboardStatsCard from '../../../ui/DashboardStatsCard';
import StatsGrid from '../../../ui/StatsGrid';

interface UsersSummarySectionProps {
  sectionId: string;
  users: UserSummary[];
}

export default function UsersSummarySection({
  sectionId,
  users,
}: UsersSummarySectionProps) {
  const chatUsers = users.filter(user => user.used_chat).length;
  const agentUsers = users.filter(user => user.used_agent).length;
  const codeReviewUsers = users.filter(user => user.used_copilot_code_review_active || user.used_copilot_code_review_passive).length;
  const cliUsers = users.filter(user => user.used_cli).length;
  const completionUsers = users.filter(user => user.total_code_generation_activities > 0).length;

  return (
    <div id={sectionId}>
      <StatsGrid className="mb-6" columns={{ base: 2, md: 6 }} gapClassName="gap-4">
        <DashboardStatsCard value={users.length} label="Total Users" accent="blue" />
        <DashboardStatsCard value={chatUsers} label="Chat Users" accent="teal" />
        <DashboardStatsCard value={agentUsers} label="Agent Users" accent="indigo" />
        <DashboardStatsCard value={codeReviewUsers} label="Code Review Users" accent="cyan" />
        <DashboardStatsCard value={cliUsers} label="CLI Users" accent="rose" />
        <DashboardStatsCard value={completionUsers} label="Completion Users" accent="amber" />
      </StatsGrid>
    </div>
  );
}

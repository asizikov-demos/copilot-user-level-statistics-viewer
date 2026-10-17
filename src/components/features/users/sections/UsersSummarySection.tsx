import { ProgressBar } from '@primer/react';
import type { UserSummary } from '../../../../types/metrics';

interface UsersSummarySectionProps {
  sectionId: string;
  users: UserSummary[];
}

interface FeatureAdoption {
  label: string;
  users: number;
}

export default function UsersSummarySection({
  sectionId,
  users,
}: UsersSummarySectionProps) {
  const totalUsers = users.length;
  const featureAdoption: FeatureAdoption[] = [
    {
      label: 'Chat',
      users: users.filter(user => user.used_chat).length,
    },
    {
      label: 'Completions',
      users: users.filter(user => user.used_code_completion).length,
    },
    {
      label: 'Agent mode',
      users: users.filter(user => user.used_agent).length,
    },
    {
      label: 'Code review',
      users: users.filter(user =>
        user.used_copilot_code_review_active ||
        user.used_copilot_code_review_passive
      ).length,
    },
    {
      label: 'CLI',
      users: users.filter(user => user.used_cli).length,
    },
  ];

  return (
    <div id={sectionId} className="mb-6 scroll-mt-28">
      <div className="grid gap-8 rounded-lg border border-default bg-default p-6 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.7fr)] md:gap-0">
        <div className="md:pr-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Total Users
          </p>
          <p className="mt-3 text-5xl font-bold tracking-tight text-default">
            {totalUsers.toLocaleString()}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-default">
            unique users
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Users with Copilot activity in the selected report period. Feature
            adoption shows how many of them used each experience.
          </p>
        </div>

        <div className="border-t border-default pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div className="space-y-4">
            {featureAdoption.map(feature => {
              const adoptionPercentage = totalUsers === 0
                ? 0
                : Math.round((feature.users / totalUsers) * 100);

              return (
                <div key={feature.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="text-sm font-medium text-default">
                      {feature.label}
                    </span>
                    <span className="text-sm tabular-nums text-muted">
                      <strong className="font-semibold text-default">
                        {feature.users.toLocaleString()}
                      </strong>
                      {' '}
                      users · {adoptionPercentage}%
                    </span>
                  </div>
                  <ProgressBar
                    progress={adoptionPercentage}
                    bg="accent.emphasis"
                    aria-label={`${feature.label} adoption`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

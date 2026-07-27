'use client';

interface UserDetailsHeaderProps {
  userLogin: string;
  userId: number;
  aiAdoptionPhaseLabel: string;
  aiCreditCost: string;
  onBackToUsers: () => void;
  onCopyUserLogin: () => void;
}

export default function UserDetailsHeader({
  userLogin,
  userId,
  aiAdoptionPhaseLabel,
  aiCreditCost,
  onBackToUsers,
  onCopyUserLogin,
}: UserDetailsHeaderProps) {
  return (
    <div>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <button
              type="button"
              onClick={onBackToUsers}
              className="text-2xl font-semibold tracking-tight text-[#0969da] hover:underline focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
            >
              users
            </button>
          </li>
          <li aria-hidden="true" className="text-2xl font-semibold tracking-tight text-[#8c959f]">/</li>
          <li aria-current="page">
            <button
              type="button"
              onClick={onCopyUserLogin}
              title="Click to copy username"
              aria-label={`Copy username ${userLogin}`}
              className="group inline-flex items-center gap-2 rounded-sm text-2xl font-semibold tracking-tight text-[#1f2328] transition-colors duration-150 hover:text-indigo-600 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span>{userLogin}</span>
              <svg
                className="h-5 w-5 text-[#636c76] transition-colors duration-150 group-hover:text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
          </li>
        </ol>
      </nav>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span>User ID: {userId}</span>
        <span aria-hidden="true" className="text-gray-300">•</span>
        <span>AI adoption phase: {aiAdoptionPhaseLabel}</span>
        <span aria-hidden="true" className="text-gray-300">•</span>
        <span>AI cost: {aiCreditCost}</span>
      </p>
    </div>
  );
}

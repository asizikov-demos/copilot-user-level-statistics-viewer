import type { UserDetailedMetrics } from '../../../types/aggregatedMetrics';

interface RunUserDetailsRequestOptions {
  userId: number;
  load: (userId: number) => Promise<UserDetailedMetrics | null>;
  isCurrent: () => boolean;
  onSuccess: (details: UserDetailedMetrics) => void;
  onError: (message: string) => void;
}

const DEFAULT_USER_DETAILS_ERROR_MESSAGE = 'Failed to load user details.';

export async function runUserDetailsRequest({
  userId,
  load,
  isCurrent,
  onSuccess,
  onError,
}: RunUserDetailsRequestOptions): Promise<void> {
  try {
    const details = await load(userId);
    if (!isCurrent()) {
      return;
    }

    if (!details) {
      onError('No user details were returned for this user.');
      return;
    }

    onSuccess(details);
  } catch (error) {
    if (!isCurrent()) {
      return;
    }

    onError(
      error instanceof Error && error.message
        ? error.message
        : DEFAULT_USER_DETAILS_ERROR_MESSAGE
    );
  }
}

import { describe, expect, it, vi } from 'vitest';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import { runUserDetailsRequest } from '../userDetailsRequest';

const details: UserDetailedMetrics = {
  totalModelRequests: 0,
  total_ai_credits_used: 0,
  featureAggregates: [],
  ideAggregates: [],
  languageFeatureAggregates: [],
  modelFeatureAggregates: [],
  pluginVersions: [],
  cliVersions: [],
  dailyCombinedImpact: [],
  dailyModelUsage: [],
  dailyAgentImpact: [],
  dailyAskModeImpact: [],
  dailyCompletionImpact: [],
  dailyCliImpact: [],
  days: [],
  reportStartDay: '2024-01-01',
  reportEndDay: '2024-01-31',
};

describe('runUserDetailsRequest', () => {
  it('preserves the worker error message', async () => {
    const onError = vi.fn();

    await runUserDetailsRequest({
      userId: 42,
      load: vi.fn().mockRejectedValue(new Error('Worker accumulator unavailable')),
      isCurrent: () => true,
      onSuccess: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith('Worker accumulator unavailable');
  });

  it('ignores late results from an obsolete request', async () => {
    let resolveRequest: (value: UserDetailedMetrics | null) => void = () => undefined;
    const load = vi.fn(() => new Promise<UserDetailedMetrics | null>((resolve) => {
      resolveRequest = resolve;
    }));
    let isCurrent = true;
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const request = runUserDetailsRequest({
      userId: 42,
      load,
      isCurrent: () => isCurrent,
      onSuccess,
      onError,
    });
    isCurrent = false;
    resolveRequest(details);
    await request;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores late errors from an obsolete request', async () => {
    let rejectRequest: (reason: Error) => void = () => undefined;
    const load = vi.fn(() => new Promise<UserDetailedMetrics | null>((_, reject) => {
      rejectRequest = reject;
    }));
    let isCurrent = true;
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const request = runUserDetailsRequest({
      userId: 42,
      load,
      isCurrent: () => isCurrent,
      onSuccess,
      onError,
    });
    isCurrent = false;
    rejectRequest(new Error('Obsolete failure'));
    await request;

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('makes a fresh request when retried for the same user', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('First request failed'))
      .mockResolvedValueOnce(details);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const options = {
      userId: 42,
      load,
      isCurrent: () => true,
      onSuccess,
      onError,
    };

    await runUserDetailsRequest(options);
    await runUserDetailsRequest(options);

    expect(load).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith('First request failed');
    expect(onSuccess).toHaveBeenCalledWith(details);
  });
});

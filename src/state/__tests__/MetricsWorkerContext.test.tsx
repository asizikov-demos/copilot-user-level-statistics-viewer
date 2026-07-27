import { StrictMode } from 'react';
import {
  act,
  create,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricsWorkerProvider } from '../MetricsWorkerContext';
import { MetricsWorkerClient } from '../../workers/metricsWorkerClient';

let renderer: ReactTestRenderer | null = null;

async function settleMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  renderer?.unmount();
  renderer = null;
  vi.restoreAllMocks();
});

describe('MetricsWorkerProvider', () => {
  it('keeps the client alive during Strict Mode replay and disposes once on real unmount', async () => {
    const dispose = vi.spyOn(MetricsWorkerClient.prototype, 'dispose');

    await act(async () => {
      renderer = create(
        <StrictMode>
          <MetricsWorkerProvider>
            <div>ready</div>
          </MetricsWorkerProvider>
        </StrictMode>
      );
    });
    await settleMicrotasks();

    expect(dispose).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
    await settleMicrotasks();

    expect(dispose).toHaveBeenCalledOnce();
  });
});

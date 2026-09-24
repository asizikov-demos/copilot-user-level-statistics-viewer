import type { ChangeEvent } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import { useFileUpload } from '../../hooks/useFileUpload';
import { selectExecutiveSummaryReadModel } from '../../read-models/overview';
import ExecutiveSummaryView from '../ExecutiveSummaryView';
import { MetricsContextProvider, useMetrics } from '../MetricsContext';
import AppHeader from '../layout/AppHeader';

const worker = vi.hoisted(() => ({
  parseAndAggregate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('../../state/MetricsWorkerContext', () => ({
  useMetricsWorker: () => worker,
}));

const result = aggregateMetrics([makeMetric()]).aggregated;
const partialUpload = {
  result,
  enterpriseName: 'Acme',
  recordCount: 1,
  errors: [{ fileName: 'invalid.ndjson', error: 'Invalid JSON' }],
};

let renderer: ReactTestRenderer;
let metrics: ReturnType<typeof useMetrics>;
let upload: ReturnType<typeof useFileUpload>;

function TestApp() {
  metrics = useMetrics();
  upload = useFileUpload();
  return (
    <>
      <AppHeader />
      {metrics.aggregatedMetrics && (
        <ExecutiveSummaryView
          model={selectExecutiveSummaryReadModel(metrics.aggregatedMetrics)}
          enterpriseName={metrics.enterpriseName}
          dataWarning={metrics.warning}
        />
      )}
    </>
  );
}

async function uploadFiles() {
  await upload.handleFileUpload({
    target: { files: [new File(['{}'], 'report.ndjson')] },
  } as unknown as ChangeEvent<HTMLInputElement>);
}

function bannerCount() {
  return renderer.root.findAllByProps({ 'data-upload-warning': true }).length;
}

function reportLimitation() {
  const label = renderer.root.findByType('article').findAllByType('strong').find(
    element => element.children.includes('Upload limitation:')
  );
  return label?.parent?.children.filter(child => typeof child === 'string').join('');
}

async function dismissBanner() {
  await act(async () => {
    renderer.root.findByProps({ 'data-upload-warning': true }).findByType('button').props.onClick();
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  worker.parseAndAggregate.mockResolvedValue(partialUpload);
  await act(async () => {
    renderer = create(<MetricsContextProvider><TestApp /></MetricsContextProvider>);
  });
  await act(uploadFiles);
});

afterEach(async () => {
  await act(async () => renderer.unmount());
});

describe('upload warning lifetime', () => {
  it('dismisses the banner without removing the printable report limitation', async () => {
    const warning = metrics.warning;
    expect(bannerCount()).toBe(1);
    expect(reportLimitation()).toContain(warning);

    await dismissBanner();

    expect(bannerCount()).toBe(0);
    expect(metrics.warning).toBe(warning);
    expect(reportLimitation()).toContain(warning);
  });

  it('clears the report warning and dismissal state on reset', async () => {
    await dismissBanner();
    await act(async () => metrics.resetMetrics());

    expect(metrics.warning).toBeNull();
    expect(metrics.isWarningDismissed).toBe(false);
    expect(metrics.aggregatedMetrics).toBeNull();
    expect(bannerCount()).toBe(0);
    expect(renderer.root.findAllByType('article')).toHaveLength(0);
  });

  it('clears the old limitation when a new upload starts and keeps a clean report warning-free', async () => {
    await dismissBanner();
    let finishUpload!: (value: typeof partialUpload) => void;
    worker.parseAndAggregate.mockReturnValue(new Promise<typeof partialUpload>(resolve => {
      finishUpload = resolve;
    }));
    let pending!: Promise<void>;
    await act(async () => {
      pending = uploadFiles();
    });

    expect(metrics.isLoading).toBe(true);
    expect(metrics.warning).toBeNull();
    expect(metrics.isWarningDismissed).toBe(false);
    expect(renderer.root.findAllByType('article')).toHaveLength(0);

    await act(async () => {
      finishUpload({ ...partialUpload, errors: [] });
      await pending;
    });

    expect(metrics.warning).toBeNull();
    expect(bannerCount()).toBe(0);
    expect(reportLimitation()).toBeUndefined();
  });

  it('shows the banner again when the next upload has the same warning', async () => {
    const warning = metrics.warning;
    await dismissBanner();
    await act(uploadFiles);

    expect(metrics.warning).toBe(warning);
    expect(metrics.isWarningDismissed).toBe(false);
    expect(bannerCount()).toBe(1);
    expect(reportLimitation()).toContain(warning);
  });
});

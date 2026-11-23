import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function lintSource(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.map((message) => ({
    ruleId: message.ruleId,
    message: message.message,
  }));
}

describe('architecture import boundaries', () => {
  it('prevents UI routes from importing aggregation implementation modules', async () => {
    const messages = await lintSource(
      'src/components/layout/routes/ExampleRoute.tsx',
      "import { aggregateMetrics } from '../../../domain/metricsAggregator';\nexport const value = aggregateMetrics;\n"
    );

    expect(messages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-imports',
      message: expect.stringContaining('aggregation implementation modules'),
    }));
  });

  it('prevents read models from importing aggregation family modules', async () => {
    const messages = await lintSource(
      'src/read-models/example.ts',
      "import { createCliAccumulator } from '../domain/aggregation/cliAggregation';\nexport const value = createCliAccumulator;\n"
    );

    expect(messages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-imports',
      message: expect.stringContaining('aggregation implementation modules'),
    }));
  });

  it('keeps domain and worker modules free of React and UI state dependencies', async () => {
    const messages = await lintSource(
      'src/domain/example.ts',
      "import type { ReactNode } from 'react';\nimport { useNavigation } from '../state/NavigationContext';\nexport type Value = ReactNode;\nexport const value = useNavigation;\n"
    );

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('framework-free'),
      }),
      expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('not UI/state layers'),
      }),
    ]));
  });

  it('prevents JSX from reintroducing framework coupling in domain modules', async () => {
    const messages = await lintSource(
      'src/domain/example.tsx',
      'export const value = <span />;\n'
    );

    expect(messages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-syntax',
      message: expect.stringContaining('framework-free'),
    }));
  });

  it('prevents shared chart modules from importing layout routes', async () => {
    const messages = await lintSource(
      'src/components/charts/ExampleChart.tsx',
      "import ViewRouter from '../layout/ViewRouter';\nexport const value = ViewRouter;\n"
    );

    expect(messages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-imports',
      message: expect.stringContaining('Shared UI primitives and charts'),
    }));
  });

  it('prevents shared chart modules from importing aggregation implementation modules', async () => {
    const messages = await lintSource(
      'src/components/charts/utils/example.ts',
      "import { aggregateMetrics } from '../../../domain/metricsAggregator';\nexport const value = aggregateMetrics;\n"
    );

    expect(messages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-imports',
      message: expect.stringContaining('aggregation implementation modules'),
    }));
  });

  it('allows contract imports across view and read-model layers', async () => {
    const messages = await lintSource(
      'src/read-models/example.ts',
      "import type { AggregatedMetrics } from '../types/aggregatedMetrics';\nexport type Value = AggregatedMetrics;\n"
    );

    expect(messages).toEqual([]);
  });

  describe('#domain/* subpath alias boundaries', () => {
    it.each([
      ['src/app/page.tsx', '#domain/metricsAggregator'],
      ['src/components/Example.tsx', '#domain/aggregation/cliAggregation'],
      ['src/components/charts/ExampleChart.tsx', '#domain/metricsParser'],
      ['src/hooks/useExample.ts', '#domain/metricsParser'],
      ['src/state/ExampleContext.tsx', '#domain/aggregation/coreStatsAggregation'],
      ['src/read-models/example.ts', '#domain/metricsAggregator'],
    ])('prevents %s from importing %s via #domain/*', async (filePath, specifier) => {
      const messages = await lintSource(
        filePath,
        `import * as mod from '${specifier}';\nexport const value = mod;\n`
      );

      expect(messages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('aggregation implementation modules'),
      }));
    });

    it('allows pure domain metadata helpers via #domain/* on main-thread layers', async () => {
      const messages = await lintSource(
        'src/components/Example.tsx',
        "import { isCliFeature } from '#domain/featureCategories';\nexport const value = isCliFeature;\n"
      );

      expect(messages).toEqual([]);
    });
  });

  describe('src/infra/* boundaries', () => {
    it.each([
      ['src/app/page.tsx', '../infra/metricsFileParser'],
      ['src/components/features/file-upload/Example.tsx', '@/infra/metricsFileParser'],
      ['src/components/ui/Example.tsx', '../../infra/metricsFileParser'],
      ['src/hooks/useExample.ts', '../infra/metricsFileParser'],
      ['src/state/ExampleContext.tsx', '../infra/metricsFileParser'],
      ['src/read-models/example.ts', '@/infra/metricsFileParser'],
    ])('prevents main-thread module %s from importing %s directly', async (filePath, specifier) => {
      const messages = await lintSource(
        filePath,
        `import type { MultiFileProgress } from '${specifier}';\nexport type Value = MultiFileProgress;\n`
      );

      expect(messages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('not infra modules directly'),
      }));
    });

    it('keeps infra modules free of React, Next.js, JSX, upward layers, and workers', async () => {
      const importMessages = await lintSource(
        'src/infra/example.ts',
        [
          "import { useState } from 'react';",
          "import Link from 'next/link';",
          "import { useFileUpload } from '../hooks/useFileUpload';",
          "import { selectClientsReadModel } from '../read-models/clients';",
          "import { MetricsWorkerClient } from '../workers/metricsWorkerClient';",
          'export const value = [useState, Link, useFileUpload, selectClientsReadModel, MetricsWorkerClient];',
        ].join('\n')
      );

      expect(importMessages).toEqual(expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'no-restricted-imports',
          message: expect.stringContaining('framework-free'),
        }),
        expect.objectContaining({
          ruleId: 'no-restricted-imports',
          message: expect.stringContaining('not UI/state layers'),
        }),
        expect.objectContaining({
          ruleId: 'no-restricted-imports',
          message: expect.stringContaining('must not depend on worker'),
        }),
      ]));

      const jsxMessages = await lintSource(
        'src/infra/example.tsx',
        'export const value = <div />;\n'
      );

      expect(jsxMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining('framework-free'),
      }));
    });

    it('allows infra modules to import domain parser helpers and contracts while blocking domain -> infra', async () => {
      const infraMessages = await lintSource(
        'src/infra/example.ts',
        "import type { CopilotMetrics } from '../types/metrics';\nimport { consumeParsedMetricsFromLines } from '../domain/metricsParser';\nexport type Metric = CopilotMetrics;\nexport const value = consumeParsedMetricsFromLines;\n"
      );
      expect(infraMessages).toEqual([]);

      const domainMessages = await lintSource(
        'src/domain/example.ts',
        "import { parseMultipleMetricsFiles } from '../infra/metricsFileParser';\nexport const value = parseMultipleMetricsFiles;\n"
      );
      expect(domainMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('infra or worker'),
      }));
    });
  });

  describe('src/domain/calculators/* boundaries', () => {
    it.each([
      ['src/app/page.tsx', '../domain/calculators'],
      ['src/components/Example.tsx', '@/domain/calculators/cliUsageCalculator'],
      ['src/components/charts/ExampleChart.tsx', '../../domain/calculators/statsCalculators'],
      ['src/components/ui/Example.tsx', '#domain/calculators/metricCalculators'],
      ['src/hooks/useExample.ts', '../domain/calculators/userDetailCalculator'],
      ['src/state/ExampleContext.tsx', '@/domain/calculators'],
      ['src/read-models/example.ts', '#domain/calculators/index'],
    ])('prevents runtime calculator imports in %s from %s', async (filePath, specifier) => {
      const messages = await lintSource(
        filePath,
        `import * as calc from '${specifier}';\nexport const value = calc;\n`
      );

      expect(messages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('calculator types only'),
      }));
    });

    it('rejects mixed value + type calculator imports while allowing pure type imports and type re-exports', async () => {
      const mixedMessages = await lintSource(
        'src/components/Example.tsx',
        "import { createCliUsageAccumulator, type DailyCliSessionData } from '../domain/calculators/cliUsageCalculator';\nexport type Row = DailyCliSessionData;\nexport const value = createCliUsageAccumulator;\n"
      );
      expect(mixedMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('calculator types only'),
      }));

      const typeOnlyMessages = await lintSource(
        'src/read-models/example.ts',
        [
          "import type { DailyEngagementData } from '../domain/calculators/metricCalculators';",
          "import { type DailyCliTokenData } from '#domain/calculators/cliUsageCalculator';",
          "export type { LanguageStats } from '@/domain/calculators/languageCalculator';",
          'export type Combined = DailyEngagementData | DailyCliTokenData;',
        ].join('\n')
      );
      expect(typeOnlyMessages).toEqual([]);
    });

    it('allows worker and domain modules (and tests) to execute calculators at runtime', async () => {
      const workerMessages = await lintSource(
        'src/workers/example.ts',
        "import { computeUserDetailedMetrics } from '../domain/calculators/userDetailCalculator';\nexport const value = computeUserDetailedMetrics;\n"
      );
      expect(workerMessages).toEqual([]);

      const aggregatorMessages = await lintSource(
        'src/domain/metricsAggregator.ts',
        "import { computeExecutiveSummary } from './calculators/executiveSummaryCalculator';\nexport const value = computeExecutiveSummary;\n"
      );
      expect(aggregatorMessages).toEqual([]);

      const testMessages = await lintSource(
        'src/components/__tests__/Example.test.tsx',
        "import { computeReportingQuality } from '../../domain/calculators/reportingQualityCalculator';\nexport const value = computeReportingQuality;\n"
      );
      expect(testMessages).toEqual([]);
    });

    it('prevents transitive smuggling of runtime calculators or aggregation via shared domain helpers, utils, or types', async () => {
      const sharedDomainMessages = await lintSource(
        'src/domain/exampleHelper.ts',
        "import { createCliUsageAccumulator } from './calculators/cliUsageCalculator';\nexport const value = createCliUsageAccumulator;\n"
      );
      expect(sharedDomainMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('calculator types only'),
      }));

      const utilsMessages = await lintSource(
        'src/utils/example.ts',
        "import { aggregateMetrics } from '#domain/metricsAggregator';\nexport const value = aggregateMetrics;\n"
      );
      expect(utilsMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('aggregation implementation modules'),
      }));

      const typesMessages = await lintSource(
        'src/types/example.ts',
        "import { computeClientReach } from '../domain/calculators/clientReachCalculator';\nexport const value = computeClientReach;\n"
      );
      expect(typesMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining('calculator types only'),
      }));
    });
  });

  it('prevents main-thread layers from importing the worker entrypoint directly while allowing metricsWorkerClient', async () => {
    const blockedMessages = await lintSource(
      'src/state/ExampleContext.tsx',
      "import '../workers/metricsWorker';\n"
    );
    expect(blockedMessages).toContainEqual(expect.objectContaining({
      ruleId: 'no-restricted-imports',
      message: expect.stringContaining('metricsWorkerClient'),
    }));

    const allowedMessages = await lintSource(
      'src/state/ExampleContext.tsx',
      "import { MetricsWorkerClient } from '../workers/metricsWorkerClient';\nexport const value = MetricsWorkerClient;\n"
    );
    expect(allowedMessages).toEqual([]);
  });

  describe('dynamic import() boundaries', () => {
    it.each([
      ['src/components/Example.tsx', '../infra/metricsFileParser', 'not infra modules directly'],
      ['src/components/Example.tsx', '#domain/metricsAggregator', 'aggregation implementation modules'],
      ['src/hooks/useExample.ts', '../domain/calculators/cliUsageCalculator', 'calculator types only'],
      ['src/state/ExampleContext.tsx', '../workers/metricsWorker', 'metricsWorkerClient'],
      ['src/components/charts/ExampleChart.tsx', '../layout/ViewRouter', 'Shared UI primitives and charts'],
      ['src/domain/exampleHelper.ts', './calculators/cliUsageCalculator', 'calculator types only'],
      ['src/infra/example.ts', 'react', 'framework-free'],
    ])('prevents dynamic import() in %s from loading %s', async (filePath, specifier, expectedMessage) => {
      const literalMessages = await lintSource(
        filePath,
        `export const load = () => import('${specifier}');\n`
      );
      expect(literalMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining(expectedMessage),
      }));

      const templateMessages = await lintSource(
        filePath,
        `export const load = () => import(\`${specifier}\`);\n`
      );
      expect(templateMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining(expectedMessage),
      }));
    });

    it('prevents interpolated template dynamic imports targeting restricted prefixes while preserving allowed dynamic imports and color checks', async () => {
      const interpolatedMessages = await lintSource(
        'src/components/Example.tsx',
        "export const load = (name: string) => import(`../infra/${name}`);\n"
      );
      expect(interpolatedMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining('not infra modules directly'),
      }));

      const allowedDynamicMessages = await lintSource(
        'src/components/Example.tsx',
        "export const load = () => import('#domain/featureCategories');\n"
      );
      expect(allowedDynamicMessages).toEqual([]);

      const chartPaletteMessages = await lintSource(
        'src/components/charts/ExampleChart.tsx',
        'export const className = "bg-blue-500";\n'
      );
      expect(chartPaletteMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining('Tailwind palette color utilities'),
      }));
    });
  });

  describe('worker client and shared worker contract boundaries', () => {
    it.each([
      ['src/workers/metricsWorkerClient.ts', '../infra/metricsFileParser', 'infra types only'],
      ['src/workers/metricsWorkerClient.ts', '../domain/metricsAggregator', 'aggregation implementation modules'],
      ['src/workers/metricsWorkerClient.ts', '#domain/aggregation/cliAggregation', 'aggregation implementation modules'],
      ['src/workers/metricsWorkerClient.ts', '../domain/calculators/userDetailCalculator', 'calculator types only'],
      ['src/workers/metricsWorkerClient.ts', './metricsWorker', 'worker entrypoint'],
      ['src/workers/types.ts', '../infra/metricsFileParser', 'infra types only'],
      ['src/workers/types.ts', '../domain/metricsParser', 'aggregation implementation modules'],
      ['src/workers/types.ts', './metricsWorker', 'worker entrypoint'],
    ])('prevents %s from importing runtime worker dependencies (%s)', async (filePath, specifier, expectedMessage) => {
      const staticMessages = await lintSource(
        filePath,
        `import * as mod from '${specifier}';\nexport const value = mod;\n`
      );
      expect(staticMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-imports',
        message: expect.stringContaining(expectedMessage),
      }));

      const dynamicMessages = await lintSource(
        filePath,
        `export const load = () => import('${specifier}');\n`
      );
      expect(dynamicMessages).toContainEqual(expect.objectContaining({
        ruleId: 'no-restricted-syntax',
        message: expect.stringContaining(expectedMessage),
      }));
    });

    it('preserves infra type imports in metricsWorkerClient and workers/types while keeping runtime access in metricsWorker', async () => {
      const clientTypeMessages = await lintSource(
        'src/workers/metricsWorkerClient.ts',
        [
          "import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';",
          "export type { MultiFileProgress, MultiFileResult };",
        ].join('\n')
      );
      expect(clientTypeMessages).toEqual([]);

      const typesMessages = await lintSource(
        'src/workers/types.ts',
        [
          "import type { MultiFileProgress } from '../infra/metricsFileParser';",
          'export type Progress = MultiFileProgress;',
        ].join('\n')
      );
      expect(typesMessages).toEqual([]);

      const workerEntrypointMessages = await lintSource(
        'src/workers/metricsWorker.ts',
        [
          "import { consumeMultipleMetricsStreams } from '../infra/metricsFileParser';",
          "import { createMetricsAggregationAccumulator } from '../domain/metricsAggregator';",
          "import { computeSingleUserDetailedMetrics } from '../domain/calculators';",
          'export const value = [consumeMultipleMetricsStreams, createMetricsAggregationAccumulator, computeSingleUserDetailedMetrics];',
        ].join('\n')
      );
      expect(workerEntrypointMessages).toEqual([]);
    });
  });
});

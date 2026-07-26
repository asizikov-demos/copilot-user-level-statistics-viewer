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
});

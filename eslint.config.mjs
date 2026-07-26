import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

const productionSourceIgnores = [
  'src/**/*.test.{ts,tsx}',
  'src/**/__tests__/**',
]

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'data-utils/**',
      'public/workers/**',
      'scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/read-models/**/*.{ts,tsx}',
    ],
    ignores: productionSourceIgnores,
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [
              '@/domain/aggregation',
              '@/domain/aggregation/*',
              '@/domain/metricsAggregator',
              '../domain/aggregation',
              '../domain/aggregation/*',
              '../domain/metricsAggregator',
              '../../domain/aggregation',
              '../../domain/aggregation/*',
              '../../domain/metricsAggregator',
              '../../../domain/aggregation',
              '../../../domain/aggregation/*',
              '../../../domain/metricsAggregator',
              '../../../../domain/aggregation',
              '../../../../domain/aggregation/*',
              '../../../../domain/metricsAggregator',
            ],
            message: 'UI and read-model layers must consume aggregate contracts/read models, not aggregation implementation modules.',
          },
        ],
      }],
    },
  },
  {
    files: [
      'src/domain/**/*.{ts,tsx}',
      'src/workers/**/*.{ts,tsx}',
    ],
    ignores: productionSourceIgnores,
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'react',
            message: 'Domain and worker modules must stay framework-free.',
          },
          {
            name: 'react-dom',
            message: 'Domain and worker modules must stay framework-free.',
          },
          {
            name: 'react-dom/server',
            message: 'Domain and worker modules must stay framework-free.',
          },
          {
            name: 'react/jsx-runtime',
            message: 'Domain and worker modules must stay framework-free.',
          },
          {
            name: 'react/jsx-dev-runtime',
            message: 'Domain and worker modules must stay framework-free.',
          },
        ],
        patterns: [
          {
            group: [
              '@/components',
              '@/components/*',
              '../components',
              '../components/*',
              '../../components',
              '../../components/*',
              '@/state',
              '@/state/*',
              '../state',
              '../state/*',
              '../../state',
              '../../state/*',
              'next',
              'next/*',
            ],
            message: 'Domain and worker modules may depend on contracts and domain helpers only, not UI/state layers.',
          },
        ],
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXElement',
          message: 'Domain and worker modules must stay framework-free.',
        },
        {
          selector: 'JSXFragment',
          message: 'Domain and worker modules must stay framework-free.',
        },
      ],
    },
  },
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/components/charts/**/*.{ts,tsx}',
    ],
    ignores: productionSourceIgnores,
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: [
              '@/domain/aggregation',
              '@/domain/aggregation/*',
              '@/domain/metricsAggregator',
              '../domain/aggregation',
              '../domain/aggregation/*',
              '../domain/metricsAggregator',
              '../../domain/aggregation',
              '../../domain/aggregation/*',
              '../../domain/metricsAggregator',
              '../../../domain/aggregation',
              '../../../domain/aggregation/*',
              '../../../domain/metricsAggregator',
              '../../../../domain/aggregation',
              '../../../../domain/aggregation/*',
              '../../../../domain/metricsAggregator',
            ],
            message: 'UI and read-model layers must consume aggregate contracts/read models, not aggregation implementation modules.',
          },
          {
            group: [
              '@/components/layout',
              '@/components/layout/*',
              '@/components/features',
              '@/components/features/*',
              '../layout',
              '../layout/*',
              '../features',
              '../features/*',
              '../../layout',
              '../../layout/*',
              '../../features',
              '../../features/*',
            ],
            message: 'Shared UI primitives and charts must not depend on feature or layout route modules.',
          },
        ],
      }],
    },
  },
)

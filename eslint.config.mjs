import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import primerReact from 'eslint-plugin-primer-react'

const productionSourceIgnores = [
  'src/**/*.test.{ts,tsx}',
  'src/**/__tests__/**',
]

// Tailwind palette utilities and arbitrary hex colors bypass Primer tokens. The Tailwind
// token bridge (@primer/tailwind-config/color) already removes the palette at build time.
const paletteUtilityPattern = String.raw`\b(bg|text|border(-[trblxyse])?|divide|ring(-offset)?|inset-ring|outline|fill|stroke|from|via|to|decoration|accent|caret|shadow|placeholder)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+`
const arbitraryHexPattern = String.raw`\[#[0-9a-fA-F]{3,8}\]`
const tokenOnlyColorSelectors = [
  [paletteUtilityPattern, 'Tailwind palette color utilities are not allowed; use Primer token utilities (text-default, bg-muted, border-default, ...).'],
  [arbitraryHexPattern, 'Arbitrary hex color classes are not allowed; use Primer tokens, for example bg-[var(--bgColor-muted)].'],
].flatMap(([pattern, message]) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
])

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
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'primer-react': primerReact },
    rules: {
      'primer-react/no-deprecated-entrypoints': 'error',
      'primer-react/no-deprecated-flash': 'error',
      'primer-react/no-deprecated-experimental-components': 'error',
      'primer-react/new-color-css-vars': 'error',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: productionSourceIgnores,
    rules: {
      'no-restricted-syntax': ['error', ...tokenOnlyColorSelectors],
    },
  },
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

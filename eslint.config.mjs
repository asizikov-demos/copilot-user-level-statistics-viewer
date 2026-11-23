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
  ...(() => {
    const moduleEnd = String.raw`(?:/|\.[cm]?[jt]sx?$|$)`
    const domainPrefix = String.raw`^(?:@/domain/|#domain/|(?:\.\.?/)+domain/)`

    const noJsxSelectors = [
      {
        selector: 'JSXElement',
        message: 'Domain, infra, utility, and worker modules must stay framework-free.',
      },
      {
        selector: 'JSXFragment',
        message: 'Domain, infra, utility, and worker modules must stay framework-free.',
      },
    ]

    function restrictedDynamicImportSelectors(patterns) {
      return patterns.flatMap(({ regex, message }) => {
        const source = new RegExp(regex).source
        return [
          { selector: `ImportExpression > Literal[value=/${source}/]`, message },
          { selector: `ImportExpression > TemplateLiteral[quasis.0.value.cooked=/${source}/]`, message },
        ]
      })
    }

    function boundaryRules(patterns, extraSyntaxSelectors = []) {
      return {
        'no-restricted-imports': ['error', { patterns }],
        'no-restricted-syntax': [
          'error',
          ...extraSyntaxSelectors,
          ...restrictedDynamicImportSelectors(patterns),
        ],
      }
    }

    const mainThreadDomainAndWorkerPatterns = [
      {
        regex: `${domainPrefix}(?:aggregation|metricsAggregator|metricsParser)${moduleEnd}`,
        message: 'Main-thread UI, hooks, state, and read-model layers must consume aggregate contracts/read models, not parsing or aggregation implementation modules.',
      },
      {
        regex: `${domainPrefix}calculators${moduleEnd}`,
        allowTypeImports: true,
        message: 'Main-thread UI, hooks, state, and read-model layers may import calculator types only; runtime calculator and accumulator execution belongs in the worker/domain pipeline.',
      },
      {
        regex: String.raw`^(?:@/workers/|#workers/|(?:\.\.?/)+workers/)metricsWorker${moduleEnd}`,
        message: 'Main-thread layers must communicate with the worker via metricsWorkerClient, not import the worker entrypoint directly.',
      },
    ]

    const mainThreadRestrictedImportPatterns = [
      ...mainThreadDomainAndWorkerPatterns,
      {
        regex: String.raw`^(?:@/infra|#infra|(?:\.\.?/)+infra)${moduleEnd}`,
        message: 'Main-thread UI, hooks, state, and read-model layers must access file parsing through the worker client, not infra modules directly.',
      },
    ]

    const sharedUiRestrictedImportPatterns = [
      ...mainThreadRestrictedImportPatterns,
      {
        regex: String.raw`^(?:@/components/(?:layout|features)|@/app|(?:\./)*(?:\.\./)+(?:components/)?(?:layout|features)|(?:\./)*(?:\.\./)+app)${moduleEnd}`,
        message: 'Shared UI primitives and charts must not depend on feature or layout route modules.',
      },
    ]

    const workerPipelineBaseImportPatterns = [
      {
        regex: String.raw`^(?:react(?:-dom)?|next)(?:/|$)`,
        message: 'Domain, infra, utility, and worker modules must stay framework-free.',
      },
      {
        regex: String.raw`^(?:@/|#|(?:\./)*(?:\.\./)+)(?:app|components|hooks|state|read-models)${moduleEnd}`,
        message: 'Domain, infra, utility, and worker modules may depend on contracts and lower-level helpers only, not UI/state layers.',
      },
    ]

    const workerClientRestrictedImportPatterns = [
      ...workerPipelineBaseImportPatterns,
      ...mainThreadDomainAndWorkerPatterns,
      {
        regex: String.raw`^(?:\./)+metricsWorker${moduleEnd}`,
        message: 'Main-thread worker client and contract modules must not import the worker entrypoint.',
      },
      {
        regex: String.raw`^(?:@/infra|#infra|(?:\.\.?/)+infra)${moduleEnd}`,
        allowTypeImports: true,
        message: 'Main-thread worker client and contract modules may import infra types only; runtime file parsing belongs in the worker entrypoint.',
      },
    ]

    const infraRestrictedImportPatterns = [
      ...workerPipelineBaseImportPatterns,
      {
        regex: String.raw`^(?:@/workers|#workers|(?:\./)*(?:\.\./)+workers)${moduleEnd}`,
        message: 'Infra modules must not depend on worker entrypoints or clients.',
      },
    ]

    const noInfraOrWorkersPattern = {
      regex: String.raw`^(?:@/(?:infra|workers)|#(?:infra|workers)|(?:\./)*(?:\.\./)+(?:infra|workers))${moduleEnd}`,
      message: 'Domain and utility modules must remain pure and must not depend on infra or worker layers.',
    }

    const domainRestrictedImportPatterns = [
      ...workerPipelineBaseImportPatterns,
      noInfraOrWorkersPattern,
    ]

    const utilsRestrictedImportPatterns = [
      ...domainRestrictedImportPatterns,
      ...mainThreadRestrictedImportPatterns,
    ]

    const sharedDomainRestrictedImportPatterns = [
      ...domainRestrictedImportPatterns,
      ...mainThreadRestrictedImportPatterns,
      {
        regex: String.raw`^(?:\./)+(?:aggregation|metricsAggregator|metricsParser)${moduleEnd}`,
        message: 'Shared domain helpers must remain usable on the main thread and must not import parsing or aggregation implementation modules.',
      },
      {
        regex: String.raw`^(?:\./)+calculators${moduleEnd}`,
        allowTypeImports: true,
        message: 'Shared domain helpers may import calculator types only; runtime calculator and accumulator execution belongs in the worker/domain pipeline.',
      },
    ]

    return [
      {
        files: [
          'src/hooks/**/*.{ts,tsx}',
          'src/state/**/*.{ts,tsx}',
          'src/read-models/**/*.{ts,tsx}',
          'src/types/**/*.{ts,tsx}',
        ],
        ignores: productionSourceIgnores,
        rules: boundaryRules(mainThreadRestrictedImportPatterns),
      },
      {
        files: [
          'src/app/**/*.{ts,tsx}',
          'src/components/**/*.{ts,tsx}',
        ],
        ignores: productionSourceIgnores,
        rules: boundaryRules(mainThreadRestrictedImportPatterns, tokenOnlyColorSelectors),
      },
      {
        files: [
          'src/components/ui/**/*.{ts,tsx}',
          'src/components/charts/**/*.{ts,tsx}',
        ],
        ignores: productionSourceIgnores,
        rules: boundaryRules(sharedUiRestrictedImportPatterns, tokenOnlyColorSelectors),
      },
      {
        files: ['src/workers/**/*.{ts,tsx}'],
        ignores: productionSourceIgnores,
        rules: boundaryRules(workerPipelineBaseImportPatterns, noJsxSelectors),
      },
      {
        files: [
          'src/workers/metricsWorkerClient.ts',
          'src/workers/types.ts',
        ],
        ignores: productionSourceIgnores,
        rules: boundaryRules(workerClientRestrictedImportPatterns, noJsxSelectors),
      },
      {
        files: ['src/infra/**/*.{ts,tsx}'],
        ignores: productionSourceIgnores,
        rules: boundaryRules(infraRestrictedImportPatterns, noJsxSelectors),
      },
      {
        files: ['src/domain/**/*.{ts,tsx}'],
        ignores: productionSourceIgnores,
        rules: boundaryRules(domainRestrictedImportPatterns, noJsxSelectors),
      },
      {
        files: ['src/utils/**/*.{ts,tsx}'],
        ignores: productionSourceIgnores,
        rules: boundaryRules(utilsRestrictedImportPatterns, noJsxSelectors),
      },
      {
        files: ['src/domain/*.{ts,tsx}'],
        ignores: [
          ...productionSourceIgnores,
          'src/domain/metricsAggregator.ts',
          'src/domain/metricsParser.ts',
        ],
        rules: boundaryRules(sharedDomainRestrictedImportPatterns, noJsxSelectors),
      },
    ]
  })(),
)

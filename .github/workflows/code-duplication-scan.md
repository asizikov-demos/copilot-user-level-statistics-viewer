---
description: Weekly and manual code duplication audit for the user-level metrics viewer.

on:
  workflow_dispatch:
  schedule:
    - cron: "20 12 * * 5"

permissions:
  contents: read
  issues: read
  actions: read

concurrency:
  group: code-duplication-scan
  cancel-in-progress: false

strict: true
engine: copilot
network: defaults

tools:
  github:
    toolsets: [issues, repos]
  bash: ["find:*", "grep:*", "sed:*", "awk:*", "sort:*", "uniq:*", "head:*", "tail:*", "wc:*", "git:*", "node:*"]

safe-outputs:
  create-issue:
    title-prefix: "[duplication] "
    labels: ["enhancement"]
    assignees: ["copilot"]
    max: 8
    group: true
    expires: false

timeout-minutes: 20

steps:
  - name: Verify manual dispatch authorization
    if: ${{ github.event_name == 'workflow_dispatch' }}
    uses: actions/github-script@v9
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      script: |
        const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
          owner: context.repo.owner,
          repo: context.repo.repo,
          username: context.actor,
        });

        const allowedPermissions = new Set(['admin', 'maintain', 'write']);
        if (!allowedPermissions.has(data.permission)) {
          core.setFailed(`Actor ${context.actor} has ${data.permission} permission and is not authorized to run this workflow.`);
        }

  - name: Checkout
    uses: actions/checkout@v5
    with:
      persist-credentials: false
---

# Code Duplication Scan

Scan `${{ github.repository }}` for duplicated logic and missed code reuse opportunities. This workflow runs weekly and can also be started manually.

## Goal

Create implementation-ready GitHub issues for code duplication findings. Each issue must describe one atomic root problem that an AI coding agent can fix independently.

Prefer fewer high-quality issues over many low-value issues. If no actionable duplication is found, do not create an issue; finish with a no-op summary.

## Repository instructions

Before scanning, read and follow:

- `AGENTS.md`
- `docs/project-overview.md`
- `.github/instructions/charts.instructions.md` when a finding touches `src/components/charts/**`

Pay special attention to this app's architecture:

- It is a static-export Next.js App Router SPA with no backend API routes.
- Uploaded metrics are parsed client-side and must never leave the browser.
- Parsing and aggregation run through the Web Worker `parseAndAggregate` flow.
- Raw `CopilotMetrics[]` records should not be persisted on the main thread; UI code should consume the pre-aggregated `AggregatedMetrics` contract.
- Only the new LOC schema (`loc_added_sum`, `loc_deleted_sum`, `loc_suggested_*`) is supported. Deprecated `generated_loc_sum` / `accepted_loc_sum` inputs are intentionally skipped.
- Premium Request Unit (PRU) model multipliers belong in `src/domain/modelConfig.ts`.
- Chart components should use the shared Chart.js registration, chart option, dataset, color, and `ChartContainer` patterns documented in `.github/instructions/charts.instructions.md`.

## Scan protocol

1. Inspect the current repository structure and relevant source areas.
2. Focus on duplicated behavior, not cosmetic duplication. Prioritize duplication that can cause behavior drift, inconsistent metrics, memory regressions, or difficult-to-test UI behavior.
3. Compare these areas:
   - `src/infra/metricsFileParser.ts`
   - `src/domain/metricsParser.ts`
   - `src/domain/metricsAggregator.ts`
   - `src/domain/calculators/**`
   - `src/domain/*Insights*`, `src/domain/*Classifier*`, `src/domain/*Normalizer*`, `src/domain/modelConfig.ts`
   - `src/workers/**`
   - `src/hooks/**`
   - `src/components/**`
   - `src/components/charts/**`
   - `src/components/ui/**`
   - `src/types/**`
   - `src/**/__tests__/**` and `src/**/*.test.ts`
   - `data-utils/**` when duplicated parsing or normalization also appears in app code
4. Look for repeated:
   - NDJSON line parsing, validation, warning, and skipped-record handling
   - LOC field handling and deprecated-schema detection
   - user, feature, IDE, language, model, CLI, and PRU aggregation loops
   - model name normalization, premium-model checks, and multiplier lookups
   - feature category or translation logic
   - language normalization and IDE/plugin version classification
   - date bucketing, report date range, and zero-fill logic
   - top-N, sorting, filtering, searching, expandable list, and table state handling
   - Chart.js setup, chart option factories, dataset construction, color selection, and insight footer composition
   - UI primitives for cards, stats tiles, tables, empty states, and progressive disclosure
   - test fixtures, builders, and repeated setup for metrics records or aggregated metrics
5. Search existing open issues with the `[duplication]` title prefix before creating a new issue. Do not create a duplicate if an open issue already covers the same root problem.

## Finding grouping rules

A finding group is atomic when it has one root problem and one coherent implementation path.

Good atomic groups:

- "Centralize deprecated LOC schema detection"
- "Extract shared report-date zero-fill helper for charts"
- "Reuse model premium/multiplier helpers in calculators"
- "Share top-N expandable table behavior across dashboard views"

Bad groups:

- "Clean up all duplication everywhere"
- "Refactor calculators and UI"
- "Improve code quality"

If multiple files duplicate the same logic, group them into one issue. If two findings require unrelated changes or touch unrelated abstractions, create separate issues.

## Issue creation criteria

Create an issue only when all of these are true:

- The duplicated logic is present in two or more places.
- The duplication has a plausible correctness, memory, performance, maintainability, or testability impact.
- The fix can be described as one bounded implementation task.
- You can name specific files, functions, components, or tests as evidence.

Skip findings that are only repeated Tailwind classes, normal React markup, static copy, or test assertions unless they hide duplicated behavior or create meaningful maintenance overhead.

## Issue template

For each issue, use the `create_issue` safe output with this body structure:

```markdown
## Problem
[One concise paragraph describing the duplicated logic and why it matters.]

## Evidence
- `[file path]` - [function/component/line area and duplicated behavior]
- `[file path]` - [function/component/line area and duplicated behavior]

## Suggested implementation
1. [Specific refactor step]
2. [Specific wiring/update step]
3. [Specific cleanup step]

## Acceptance criteria
- [ ] The duplicated logic has a single source of truth.
- [ ] Existing behavior is preserved.
- [ ] Parsing and aggregation still run through the Web Worker `parseAndAggregate` flow when applicable.
- [ ] Raw metrics are not persisted on the main thread.
- [ ] Deprecated LOC schema records remain skipped, and new LOC schema fields remain supported.
- [ ] PRU calculations continue to use `src/domain/modelConfig.ts` when model multipliers are involved.
- [ ] Chart changes follow `.github/instructions/charts.instructions.md` when chart components are involved.
- [ ] Relevant tests are updated or added.

## Validation
- [Commands or existing test suites the implementation agent should run.]

## AI implementation notes
[Mention key constraints, edge cases, and files likely involved. Make this detailed enough for Copilot to implement without rediscovering the entire context.]
```

## Output behavior

- Create up to 8 issues per run.
- Assign created issues to Copilot through the configured safe output, using the callable tool name `create_issue`.
- Prefer fewer high-quality issues over many low-value issues.
- If no actionable duplication is found, call `noop` with a short no-op summary.

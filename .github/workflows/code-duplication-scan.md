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
  copilot-requests: write

concurrency:
  group: code-duplication-scan
  cancel-in-progress: false

strict: true
engine:
  id: copilot
  model: gpt-5.4
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

Create implementation-ready GitHub issues only for duplication whose removal produces a simpler, safer codebase. Each issue must describe one atomic root problem that an AI coding agent can fix independently.

Do not treat extraction as inherently valuable. Prefer fewer high-quality issues over speculative indirection, and prefer no issue when the benefit is uncertain. If no candidate passes every gate below, finish with a no-op summary.

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
- Model normalization, known-model recognition, and unknown-model detection belong in `src/domain/modelConfig.ts`.
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
   - user, feature, IDE, language, model, and CLI aggregation loops
   - model name normalization, known-model checks, and unknown-model detection
   - feature category or translation logic
   - language normalization and IDE/plugin version classification
   - date bucketing, report date range, and zero-fill logic
   - top-N, sorting, filtering, searching, expandable list, and table state handling
   - Chart.js setup, chart option factories, dataset construction, color selection, and insight footer composition
   - UI primitives for cards, stats tiles, tables, empty states, and progressive disclosure
   - test fixtures, builders, and repeated setup for metrics records or aggregated metrics
5. Search existing open issues with the `[duplication]` title prefix before creating a new issue. Do not create a duplicate if an open issue already covers the same root problem.

## Candidate gates

Before creating an issue, sketch the likely implementation and reject the candidate unless **every** gate passes:

1. **Complete call-site coverage:** inventory every production call site that implements the behavior, including the canonical path named in the repository architecture. The proposed implementation must migrate all of them. A partial extraction that leaves a primary implementation duplicated cannot become the single source of truth.
2. **Implementation feasibility:** verify that one helper can preserve every caller's runtime, data-flow, error, streaming, chunk-boundary, memory, and type requirements. Reject a common shape that works only by buffering streamed input, weakening an existing contract, or adding caller-specific workarounds.
3. **Policy versus mechanics:** classify the duplication explicitly. For shared domain policy, identify the invariant that one owner would enforce. For repeated mechanics, require a measurable reduction large enough to justify extraction without inventing a new policy abstraction. Repeated syntax, field assignment, property access, iteration, or arithmetic alone is insufficient.
4. **Lower projected production complexity:** estimate production additions and removals before filing. Count the helper, exported types, adapters, wrappers, call-site glue, loops, and branches; exclude tests from the production comparison. The result must remove meaningful logic or branching, not just move it. A net-additive refactor requires an exceptional, measurable correctness or performance payoff.
5. **No shape-only indirection:** reject wrapper/accessor/type-only helpers, public mutating "totals" abstractions, pass-through property accessors, and field-shape adapters that exist only to make unlike callers fit a generic helper. Do not replace direct code with an equal amount of conversion or mutation glue.
6. **Coverage-aware value:** inspect existing unit, integration, and architecture coverage for the behavior. State the specific gap the abstraction fixes; existing integration coverage lowers the value of a mechanical extraction unless a concrete untested drift risk remains.
7. **Concrete drift scenario:** name one plausible future change and the exact inconsistent behavior that would occur if the duplication remains. "Could drift" or "is harder to maintain" is not evidence.
8. **Measurable payoff:** name the expected reduction, such as production loops/branches/functions/lines removed, independent test matrices consolidated, or a quantified memory/performance improvement. The payoff must exceed the new abstraction cost.
9. **Bounded implementation:** confirm the change remains one coherent task and does not require unrelated architecture changes.

When any gate is uncertain, reject the candidate and prefer `noop`.

## Finding grouping rules

A finding group is atomic when it has one root problem and one coherent implementation path.

Good atomic groups:

- "Centralize deprecated LOC schema detection"
- "Extract shared report-date zero-fill helper for charts"
- "Reuse model normalization helpers in calculators"
- "Share top-N expandable table behavior across dashboard views"

Bad groups:

- "Clean up all duplication everywhere"
- "Refactor calculators and UI"
- "Improve code quality"

If multiple files duplicate the same logic, group them into one issue. If two findings require unrelated changes or touch unrelated abstractions, create separate issues.

## Issue creation criteria

Create an issue only when all of these are true:

- The duplicated logic is present in two or more places.
- The candidate passes every gate above.
- The duplication has a concrete correctness, memory, performance, maintainability, or testability impact.
- The fix can be described as one bounded implementation task.
- You can name all affected production call sites and the relevant existing tests as evidence.

Skip findings that are only repeated Tailwind classes, normal React markup, static copy, or test assertions unless they hide duplicated behavior or create meaningful maintenance overhead.

## Regression checks from the July 31 scan

Use these prior findings as rejection fixtures before emitting any new issue:

- **Issue #587, NDJSON record parsing:** reject. Its proposed full-content record helper could not serve the streaming `src/infra/metricsFileParser.ts` path with chunk remainders and line continuity, so it omitted the primary app implementation and could not create one source of truth.
- **Issue #589, aggregate LOC totals:** reject. The proposed implementation added a public mutating totals type plus per-caller field-shape adapters. It changed 126 production lines while removing 114, without reducing meaningful branching or encoding a new domain policy.
- **Issue #594, CLI-aware dates:** reject as proposed. The sorted date-union loop was reusable, but the extra CLI-day type and pass-through accessor duplicated an existing property access; the production change added 86 lines and removed 78 for little complexity reduction.

A future candidate may revisit the underlying behavior only if it describes a materially different implementation that passes every gate.

## Issue template

For each issue, use the `create_issue` safe output with this body structure. Replace every placeholder and include every rejection check as checked; if any check cannot truthfully be marked `[x]`, reject the candidate instead of creating the issue.

```markdown
## Problem
[One concise paragraph describing the duplicated logic and why it matters.]

## Why a shared abstraction is warranted
- **Classification:** [Shared domain policy or repeated mechanics.]
- **Policy invariant:** [For shared policy, the domain rule that all callers must follow. Otherwise, "Not applicable - mechanical candidate."]
- **Mechanical reduction:** [For repeated mechanics, the concrete logic/branching reduction that makes extraction worthwhile. Otherwise, "Not applicable - policy candidate."]
- **Concrete drift scenario:** [A plausible future change and the exact inconsistent result without one owner.]
- **Measurable payoff:** [Production loops/branches/functions/lines removed, test matrices consolidated, or quantified performance/memory benefit.]

## Complete call-site and coverage inventory
| Production call site | Current behavior | Proposed change | Existing unit/integration/architecture coverage |
| --- | --- | --- | --- |
| `[file path: function/component]` | [Duplicated policy/mechanics] | [How it uses the shared owner] | [Relevant coverage, explicit gap, or why a coverage type is not applicable] |

[List every affected production call site. Explain how repository-wide search established that the inventory is complete.]

## Implementation feasibility
[Explain how one implementation preserves each caller's runtime, streaming/chunking, memory, error, data-flow, and type constraints. Confirm that the work is one bounded task, and note any constraint that does not apply.]

## Projected production-code delta
- **Remove:** [Concrete functions/loops/branches/adapters and estimated production lines.]
- **Add:** [Concrete helper, types, adapters, wrappers, call-site glue, and estimated production lines.]
- **Net complexity:** [Why production code and cognitive/branching complexity are lower. Tests are reported separately, not used to hide production growth.]

## Suggested implementation
1. [Specific refactor step]
2. [Specific wiring/update step]
3. [Specific cleanup step]

## Rejection checks
- [x] Every production call site, including the canonical architecture path, is included.
- [x] The implementation is feasible without weakening streaming, memory, runtime, error, data-flow, or type contracts.
- [x] The duplication is classified as shared policy or repeated mechanics, with the corresponding invariant or measurable reduction documented.
- [x] Production code and meaningful complexity decrease after counting helper code and call-site glue, or an exceptional quantified correctness/performance payoff justifies net growth.
- [x] The proposal adds no wrapper/accessor/type-only indirection.
- [x] The proposal adds no field-shape adapters or public mutating abstraction solely to fit unlike callers.
- [x] Existing unit, integration, and architecture coverage was inspected and a concrete remaining gap or not-applicable rationale is documented.
- [x] A specific drift scenario and measurable payoff are documented above.
- [x] The implementation remains one bounded task without unrelated architecture changes.

## Acceptance criteria
- [ ] The duplicated logic has a single source of truth.
- [ ] All call sites listed above use that source of truth; no primary implementation remains duplicated.
- [ ] The actual production-code delta is consistent with the estimate and does not introduce rejected indirection.
- [ ] Existing behavior is preserved.
- [ ] Parsing and aggregation still run through the Web Worker `parseAndAggregate` flow when applicable.
- [ ] Raw metrics are not persisted on the main thread.
- [ ] Deprecated LOC schema records remain skipped, and new LOC schema fields remain supported.
- [ ] Model normalization and unknown-model detection continue to use `src/domain/modelConfig.ts`.
- [ ] Chart changes follow `.github/instructions/charts.instructions.md` when chart components are involved.
- [ ] Relevant tests are updated or added.

## Validation
- [Targeted existing unit/integration/architecture tests that cover every affected call site, with not-applicable cases identified.]
- [Repository build, lint, and test commands.]

## AI implementation notes
[Mention key constraints, edge cases, and files likely involved. Make this detailed enough for Copilot to implement without rediscovering the entire context.]
```

## Output behavior

- Create up to 8 issues per run.
- Assign created issues to Copilot through the configured safe output, using the callable tool name `create_issue`.
- Prefer fewer high-quality issues over many low-value issues.
- Do not create an issue with incomplete gate evidence or placeholder claims.
- If no candidate passes every gate, or if the projected value is uncertain, call `noop` with a short no-op summary.

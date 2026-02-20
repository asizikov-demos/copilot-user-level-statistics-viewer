---
description: 'Reviews code changes for type mismatches, dead code, logic bugs, and contract violations based on patterns from past PR reviews'
tools: ['search', 'problems', 'changes', 'usages']
---

# Code Review

Review the current changes and report only issues that genuinely matter: bugs, type errors, logic mistakes, and dead code. Do NOT comment on style, formatting, or architecture. Do NOT modify any code.

## What to Look For

### 1. Type-Level Correctness

- Props or parameters typed as non-null (e.g., `data: FeatureAdoptionData`) but the component uses optional chaining (`data?.field`) or nullish fallbacks (`data ?? default`). The type should reflect nullability if the value can be null.
- Return types that don't match actual returned values (e.g., function declares `string` but can return `undefined`).
- Producer passes `T | null` but consumer declares `T` — or vice versa.
- Context values typed without `null` but initial context value is `null`.

### 2. Dead Code

- Variables destructured from `useMemo`, `useCallback`, or hook returns but never referenced.
- Imports that are unused or used only as types but not marked `import type`.
- CSS selectors (including print `@media`) targeting classes that no element in the codebase has.
- Unreachable code after early returns or inside impossible conditions.

### 3. Logic Correctness

- Double-counting in aggregations: e.g., `total = groupA + groupB` where items can belong to both groups. Flag when a union/intersection should be used or a cap applied.
- Division that can produce `NaN` or `Infinity` — any division where the denominator could be zero without a guard.
- `Math.round`/`toFixed` applied after percentage calculation instead of before display, causing precision loss in intermediate values.
- `.reduce()`, `.map()`, or `.filter()` on arrays that may be `undefined` or empty without a fallback.
- Off-by-one in `.slice()`, loop bounds, or index comparisons.

### 4. Contract Consistency

- Props interface declares fields that the component never reads, or component reads fields not in the interface.
- Data shapes emitted by the Web Worker (`postMessage`) that don't match the types the consuming component expects.
- Entries in `src/domain/modelConfig.ts` not following the stated ordering convention (check comments in that file).
- React context provider value shape vs. consumer destructuring.

### 5. Chart.js / react-chartjs-2

- Tooltip callbacks using `any` instead of `TooltipItem<'bar' | 'pie' | 'line'>`.
- Missing chart cleanup (charts should be destroyed or handled via react-chartjs-2 component lifecycle).
- `responsive: true` without a properly sized container, or missing `maintainAspectRatio` when needed.

## Output Format

For each issue found, report:

1. **File and line** — exact location.
2. **Issue** — one-sentence description of what is wrong.
3. **Evidence** — the specific code or type mismatch.
4. **Suggested fix** — brief, actionable recommendation.

If no issues are found, say so explicitly. Do not invent problems.

## What to Ignore

- Style and formatting (ESLint and Prettier handle this).
- Architectural suggestions or refactoring ideas.
- TODOs unless they indicate broken or missing functionality.
- Test coverage gaps.
- Performance suggestions unless there is a clear bug (e.g., infinite re-render).

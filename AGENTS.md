# Copilot Session Context

## Project Overview

Next.js App Router single-page application. TypeScript, Tailwind CSS, Chart.js for visualization. Static export only (`output: 'export'`) — no SSR, no API routes. Deployed to GitHub Pages. See `docs/project-overview.md` for full architecture, data flow, and code organization.

## Critical Architecture Constraint

All parsing and metrics aggregation should run in a **Web Worker** via the `parseAndAggregate` flow — avoid persisting raw metrics on the main thread. The worker is pre-bundled via esbuild (`scripts/build-worker.mjs` → `public/workers/metricsWorker.js`). The `build:worker` step runs automatically before `next build` and `next dev`.

## Development

Stop `npm run dev` before running `npm run build` because both use `.next`.

## UX Patterns

- **Progressive disclosure** for data tables: show top N items by default, expand to see all

## UI Conventions

- **Primer components first** (`@primer/react`, `@primer/octicons-react`); reach for custom markup only when no Primer component fits. Experimental Primer components are imported only through one local wrapper each (`src/components/ui/EmptyState.tsx`, `SkeletonText.tsx`).
- **Token-only colors.** Use Primer token utilities (`text-default`, `bg-muted`, `border-default`, ...) or `[var(--token)]` values. Tailwind stays for layout, spacing, and `print:`; no dark mode.
- **Palette guard.** ESLint rejects Tailwind palette color utilities (`bg-blue-500`) and arbitrary hex classes (`bg-[#fff]`) in `src/app` and `src/components`; the Primer ESLint plugin also runs (see `eslint.config.mjs`).
- **Primer overrides.** Primer CSS is unlayered and beats Tailwind utilities, so style Primer components via props, wrappers, or CSS Modules.
- **Chart-type exceptions.** Pie/doughnut (via `CompositionChart`) and the Feature Adoption radar are documented exceptions to Primer chart guidance; do not add new ones. Chart colors come from `chartTheme`/`chartColors` (see `.github/instructions/charts.instructions.md`).

## Workflow Conventions

- Scan/audit tasks are **read-only** — no surprise code changes

## Git Workflow

- **Post-merge cleanup** (user says "merged", "pr merged", or similar) — execute immediately, no confirmation needed
- **Branch cleanup and rebasing** — execute immediately
- **Branch creation, commits, and PR creation** — only after the Commit Gate below is satisfied

### Commit Gate

Do NOT create branches, commits, or PRs automatically after completing code changes. When the implementation work is done, use the `ask_user` tool to ask whether the user wants to proceed with commits and PR creation. Only proceed if they confirm.

Exception: if the user's original prompt explicitly requests commits/PR (e.g., "…create atomic commits and PR"), skip the confirmation and proceed directly.

### Pre-Commit Validation

Validate changes according to their scope:

- **Application logic or non-trivial source changes** — run a read-only code-review sub-agent, then `npm run build && npm run lint && npm run test:run`.
- **Test-only changes** — run the affected tests and any build or type-check needed to cover changed contracts.
- **Configuration changes** — validate the changed configuration and run only directly affected checks.
- **Documentation-only changes** — no application validation is required unless documentation checks exist.

If a validation fix changes application logic, repeat the code review. After validation, follow the Commit Gate before committing, pushing, or creating a PR.

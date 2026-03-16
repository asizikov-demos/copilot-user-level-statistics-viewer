# Copilot Session Context

## Project Overview

Next.js App Router single-page application. TypeScript, Tailwind CSS, Chart.js for visualization. Static export only (`output: 'export'`) — no SSR, no API routes. Deployed to GitHub Pages. See `docs/project-overview.md` for full architecture, data flow, and code organization.

## Critical Architecture Constraint

All parsing and metrics aggregation should run in a **Web Worker** via the `parseAndAggregate` flow — avoid persisting raw metrics on the main thread. The worker is pre-bundled via esbuild (`scripts/build-worker.mjs` → `public/workers/metricsWorker.js`). The `build:worker` step runs automatically before `next build` and `next dev`.

## Development Commands

- `npm run dev` — start dev server
- `npm run build` — production build (runs worker build automatically)
- `npm run lint` — ESLint

> **VS Code note**: avoid running `npm run build` while the "Next.js Development Server" task is active — they conflict.

## Code Quality

- No unused variables (`@typescript-eslint/no-unused-vars`)
- No explicit `any` — use proper types (e.g., `TooltipItem<'bar'>` for Chart.js tooltips)
- Escape special characters in JSX (`&apos;`, `&quot;`, `&amp;`)
- Always run `npm run build` before committing to catch TypeScript and ESLint issues early

## Key Domain File

`src/domain/modelConfig.ts` contains Copilot model multipliers synced with GitHub pricing docs. An automated workflow keeps them updated — see `.github/workflows/copilot-model-multipliers.md`.

## UX Patterns

- **Progressive disclosure** for data tables: show top N items by default, expand to see all
- Do not add comments documenting refactoring process (e.g., "Moved to X component")

## Workflow Conventions

- Scan/audit tasks are **read-only** — no surprise code changes
- When using sub-agents, parallelize independent work
- Reference items by name/description, not by number

## Code Navigation

Prefer the **TypeScript LSP** for code navigation and analysis — use `goToDefinition`, `findReferences`, `incomingCalls`, `hover`, and `documentSymbol` before falling back to grep/glob.

## Git Workflow Delegation

Delegate all git operations to the **Git Workflow** agent (as a sub-agent). Never handle git operations inline.

- **Post-merge cleanup** (user says "merged", "pr merged", or similar) — delegate immediately, no confirmation needed
- **Branch cleanup and rebasing** — delegate immediately
- **Branch creation, commits, and PR creation** — delegate only after the Commit Gate below is satisfied

### Commit Gate

Do NOT create branches, commits, or PRs automatically after completing code changes. When the implementation work is done, use the `ask_user` tool to ask whether the user wants to proceed with commits and PR creation. Only delegate to the Git Workflow agent if they confirm.

Exception: if the user's original prompt explicitly requests commits/PR (e.g., "…create atomic commits and PR"), skip the confirmation and delegate directly.

### Pre-Commit Pipeline

Before delegating to the Git Workflow agent for commits/PR, run the **Code Review** agent first. The flow is strictly linear:

1. **Code Review** — run as a sub-agent on all changes. If issues are found, fix them before proceeding.
2. **User approval** — Commit Gate (above)
3. **Git Workflow** — handles branch, commits, push, PR. Runs build/lint/test once as a gate. Aborts on failure — does NOT fix code.

The Git Workflow agent is pure mechanics — it never invokes Code Review and never fixes code. If its build gate fails, it aborts and returns the error. After fixing the issue, re-run the pipeline as follows: if the fix is build/lint/test-only and does not change application logic or behavior, restart from step 3 (Git Workflow); if the fix involves logic/behavior changes, restart from step 1 so Code Review runs again.

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

## End-of-Session Git Workflow

Unless the task is explicitly read-only (scan, audit, review), always:

- Create a feature branch from `main` — never commit directly to `main`
- Create atomic, well-scoped commits with conventional prefixes (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- Run the **Code Review** agent before considering work complete
- Open a PR with a structured summary

Delegate all git operations (branch creation, commits, PR) to the **Git Workflow** agent.

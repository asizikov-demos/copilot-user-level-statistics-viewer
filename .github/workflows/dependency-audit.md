---
description: Weekly dependency audit — find vulnerabilities and outdated packages, apply updates, and open a PR.

on:
  workflow_dispatch:
  schedule: weekly on monday
  skip-if-match:
    query: 'is:pr is:open in:title "[deps]"'
    max: 1

permissions:
  contents: read
  actions: read
  pull-requests: read

concurrency:
  group: dependency-audit
  cancel-in-progress: false

strict: true
engine: copilot
network: defaults

runtimes:
  node:
    version: "22"

tools:
  edit:
  bash: ["npm:*", "node:*", "npx:*", "cat:*", "jq:*", "git:*"]
  github:
    toolsets: [repos, pull_requests]

safe-outputs:
  create-pull-request:
    title-prefix: "[deps] "
    labels: ["dependencies", "automated"]
    reviewers: ["copilot"]
    draft: true
    expires: 14d

timeout-minutes: 30

steps:
  - name: Checkout
    uses: actions/checkout@v5

  - name: Install dependencies
    run: npm ci
---

# Weekly Dependency Audit

Perform a full dependency audit, apply safe updates, and open a pull request.

## Phase 1 — Assess

1. Run `npm audit --json` and save the output. Identify all vulnerabilities grouped by severity (critical, high, moderate, low). For each vulnerability, note whether it affects a **production** dependency or a **dev-only** dependency.
2. Run `npm outdated --json` and save the output. Identify all outdated packages, noting which have **major** version bumps vs minor/patch.
3. If there are **no** vulnerabilities and **no** outdated packages, call `noop` with the message "All dependencies are up to date and no vulnerabilities found." and stop.

## Phase 2 — Fix vulnerabilities

1. First run `npm audit fix --dry-run` to check if any non-breaking fixes are available. If no fixes would be applied, skip to Phase 3.
2. If fixes are available, run `npm audit fix` (without `--force`).
3. Run `npm run build` to verify the build still passes.
4. Run `npm run lint` to verify linting still passes.
5. If the build or lint fails, revert the changes with `git checkout -- .` and skip to Phase 3.
6. If changes were made and everything passes, create an atomic commit:
   - Message: `fix(deps): resolve npm audit vulnerabilities`
   - Include only `package.json` and `package-lock.json`.

## Phase 3 — Update minor and patch versions

1. Run `npm update` to apply all semver-compatible (minor + patch) updates.
2. Run `npm run build` to verify the build still passes.
3. Run `npm run lint` to verify linting still passes.
4. If the build or lint fails, revert the changes with `git checkout -- .` and skip to Phase 4.
5. If changes were made and everything passes, create an atomic commit:
   - Message: `chore(deps): update minor and patch dependencies`
   - Include only `package.json` and `package-lock.json`.

## Phase 4 — Major version updates (one at a time)

For each outdated package that has a **major** version update available (from the Phase 1 assessment):

1. Run `npm install <package>@latest` for that single package.
2. Run `npm run build` to verify the build still passes.
3. Run `npm run lint` to verify linting still passes.
4. If the build or lint fails, revert with `git checkout -- .` and note this package as "skipped — breaks build" for the PR description.
5. If everything passes, create an atomic commit:
   - Message: `feat(deps): update <package> to v<new-version>`
   - Include only `package.json` and `package-lock.json`.

## Phase 5 — Create the pull request

If **any** commits were made in Phases 2–4, create a pull request:
- **Title**: `Weekly dependency update — <date>`  (use today's date in YYYY-MM-DD format)
- **Body** must include all sections below. Use **markdown tables**, not raw JSON.

### Required PR body sections

1. **Summary** — one-paragraph overview of what changed.

2. **Changes Applied** — for each phase that made changes, list the updated packages in a table:

   | Package | Previous | Updated | Type |
   |---------|----------|---------|------|
   | example | 1.0.0    | 1.1.0   | minor |

3. **Vulnerability Report** (before fixes) — summarise `npm audit` results in a table:

   | Package | Severity | Dev-only? | Fix available | Notes |
   |---------|----------|-----------|---------------|-------|

   Include a short note at the top stating total counts per severity and how many are production vs dev-only dependencies.

4. **Outdated Packages** (before updates) — summarise `npm outdated` results in a table:

   | Package | Current | Wanted | Latest | Update type |
   |---------|---------|--------|--------|-------------|

5. **Skipped Updates** — list any major updates that were skipped and why (e.g., "breaks build", "breaks lint"). If none, state "None".

6. **Validation** — confirm that every commit passed build and lint checks.

If no commits were made (all updates failed validation), call `noop` with a message explaining that updates were attempted but none passed validation.

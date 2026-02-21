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
    draft: true
    expires: 14

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

1. Run `npm audit --json` and save the output. Identify all vulnerabilities grouped by severity (critical, high, moderate, low).
2. Run `npm outdated --json` and save the output. Identify all outdated packages, noting which have **major** version bumps vs minor/patch.
3. If there are **no** vulnerabilities and **no** outdated packages, call `noop` with the message "All dependencies are up to date and no vulnerabilities found." and stop.

## Phase 2 — Fix vulnerabilities

1. If `npm audit` reported fixable vulnerabilities, run `npm audit fix` (without `--force`).
2. Run `npm run build` to verify the build still passes.
3. Run `npm run lint` to verify linting still passes.
4. If the build or lint fails, revert the changes with `git checkout -- .` and skip to Phase 3.
5. If changes were made and everything passes, create an atomic commit:
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
- **Body** must include:
  - A summary of all changes grouped by phase
  - The full vulnerability report from `npm audit` (before fixes)
  - The full outdated report from `npm outdated` (before updates)
  - A list of any skipped major updates and why they were skipped
  - Confirmation that every commit passed build and lint checks

If no commits were made (all updates failed validation), call `noop` with a message explaining that updates were attempted but none passed validation.

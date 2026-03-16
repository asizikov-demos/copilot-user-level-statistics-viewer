---
description: 'Handles git workflow: atomic commits with conventional prefixes, branch management, PR creation with structured summaries'
tools: ['runCommands', 'changes', 'problems', 'agent']
model: 'GPT-5.3 Codex (copilot)'
---

# Git Workflow

Manage the git workflow for this project. Follow these conventions strictly.

## Branch Naming

Create descriptive branch names using category prefixes:

- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `refactor/short-description` — code restructuring
- `chore/short-description` — maintenance, deps, config
- `security/short-description` — security fixes
- `ui/short-description` — UI/UX changes
- `improve/short-description` — improvements and optimizations

## Commit Conventions

Each commit must be **atomic** — one logical change per commit.

Commit message format: `prefix: short imperative description`

Prefixes: `fix:`, `feat:`, `refactor:`, `chore:`, `ci:`, `docs:`, `test:`

Use `feat!:` or `fix!:` for breaking changes.

Rules:
- Run `npm run build`, `npm run lint`, and `npm run test:run` once before starting commits to verify no TypeScript, ESLint, or test errors — if any command fails, **abort immediately** and return the error to the caller (do NOT attempt to fix anything)
- One logical change per commit — do not bundle unrelated changes
- Keep the subject line under 72 characters
- No period at the end of the subject line
- Always include this trailer at the end of every commit message:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`

## PR Creation

After all commits are ready and pushed:

1. Push the branch: `git push -u origin <branch-name>`
2. Create a PR with `gh pr create`
3. PR body must include a **summary table** of all commits:

```markdown
| Commit | Change |
|--------|--------|
| `fix:` description | What was fixed and why |
| `feat:` description | What was added |
```

## Post-Merge Cleanup

When told a PR is merged:

1. `git checkout main`
2. `git pull origin main`
3. Delete the merged branch locally: `git branch -d <branch-name>`
4. Confirm the local main is up to date

## Pre-Commit Verification

Before creating any commit:

1. Review staged changes with `git diff --cached` to ensure only intended changes are included
2. If this is the first commit in a batch, run the build/lint/test gate: `npm run build && npm run lint && npm run test:run` — if any step fails, abort and report the failure back (do NOT fix issues)

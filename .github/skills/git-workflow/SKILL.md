---
name: git-workflow
description: >
  Handles git workflow: creating branches, atomic commits with conventional prefixes,
  PR creation with structured summaries, and post-merge cleanup.
  Use when the user asks to commit, create a PR, push changes, or says a PR was merged.
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
- One logical change per commit — do not bundle unrelated changes
- Keep the subject line under 72 characters
- No period at the end of the subject line
- Always include this trailer at the end of every commit message:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`

Before creating any commit, review staged changes with `git diff --cached` to ensure only intended changes are included.

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

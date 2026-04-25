---
name: git-workflow
description: >
  Handles git workflow: creating branches, atomic commits with conventional prefixes,
  PR creation with structured summaries, keeping PR descriptions updated on follow-up pushes,
  and post-merge cleanup.
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

## PR Creation and Updates

After all commits are ready and pushed:

1. Push the branch: `git push -u origin <branch-name>`
2. Create a PR with `gh pr create`
3. PR body must begin with a `## Why` section:
   - write 1-2 concise sentences explaining why the change was made
   - base the motivation on the session context and the user's prompting
   - focus on reviewer context and intent, not implementation details
4. After `## Why`, PR body must include a **summary table** of all commits:

```markdown
## Why

This change addresses <reason from the session or user request>. It helps reviewers understand <intended outcome or context>.

| Commit | Change |
|--------|--------|
| `fix:` description | What was fixed and why |
| `feat:` description | What was added |
```

Do not add a separate validation or testing block for routine build, lint, or test commands. Those checks are expected to run before PR creation and add noise to the description.

## PR Follow-Up Pushes

When a branch already has an open PR and you push additional commits:

1. Read the current PR body with `gh pr view --json body -q .body` and use that exact content as the base for your update. Do not generate a fresh PR description from scratch.
2. Push the branch updates.
3. Refresh the PR description with `gh pr edit` so it reflects the latest state of the branch.
4. Treat the PR body as a surgical update, not a full rewrite:
   - preserve existing sections such as `## Why`, summary prose, and other reviewer context
   - refresh `## Why` only when the new commits materially change the motivation or reviewer context
   - update the **summary table** to include new commits
   - remove or rewrite outdated entries when the implementation changed
   - mention review feedback fixes in the description when the new commits address PR comments
5. If the PR body does not already contain a summary table, add one without removing the rest of the description.
6. Do not add a routine validation or testing block when updating the PR body.
7. Before running `gh pr edit`, verify the updated body still contains the important sections from the original PR description.

Never leave the PR description stale after pushing fixes to an existing PR.

## Post-Merge Cleanup

When told a PR is merged:

1. `git checkout main`
2. `git pull origin main`
3. Delete the merged branch locally: `git branch -d <branch-name>`
4. Confirm the local main is up to date

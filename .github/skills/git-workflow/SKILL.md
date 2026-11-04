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
Classify the requested workflow, then read only the matching reference file(s).

## Routing

| User intent | Load |
| --- | --- |
| Create branch or commits | `reference/branch-and-commit.md` |
| Push committed changes without PR creation | `reference/branch-and-commit.md` |
| Create a new PR | `reference/pr-creation.md` and `reference/branch-and-commit.md` |
| Push follow-up commits to an existing PR | `reference/pr-follow-up.md` and `reference/branch-and-commit.md` |
| PR was merged or cleanup requested | `reference/post-merge-cleanup.md` |

For "push changes" requests, check whether the current branch already has an
open PR. If it does, use the PR follow-up route; otherwise, use the standalone
push route.

Do not load every reference file by default. Load the smallest set that covers
the user's request.

## Always apply

- Follow the loaded reference instructions strictly.
- Before creating commits, present the commit plan required by the commit
  reference. Before pushing, check the actual commit boundaries; this also
  applies when the commits already exist.
- If the user's request spans multiple workflow phases, load each corresponding
  reference file just before that phase.

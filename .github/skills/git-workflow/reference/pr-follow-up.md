# PR follow-up workflow

Use this reference when a branch already has an open PR and you push additional
commits.

1. Read the current PR body with `gh pr view --json body -q .body` and use that
   exact content as the base for your update. Do not generate a fresh PR
   description from scratch.
2. Push the branch updates.
3. Refresh the PR description with `gh pr edit` so it reflects the latest state
   of the branch.
4. Treat the PR body as a surgical update, not a full rewrite:
   - Preserve existing sections such as `## Why`, summary prose, and other
     reviewer context.
   - Refresh `## Why` only when the new commits materially change the motivation
     or reviewer context.
   - Update the summary table to include new commits.
   - Remove or rewrite outdated entries when the implementation changed.
   - Mention review feedback fixes in the description when the new commits
     address PR comments.
5. If the PR body does not already contain a summary table, add one without
   removing the rest of the description.
6. Do not add a routine validation or testing block when updating the PR body.
7. Before running `gh pr edit`, verify the updated body still contains the
   important sections from the original PR description.

Never leave the PR description stale after pushing fixes to an existing PR.

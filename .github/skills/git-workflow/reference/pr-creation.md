# PR creation workflow

Use this reference after all intended commits are ready.

1. Push the branch: `git push -u origin <branch-name>`.
2. Create a PR with `gh pr create`.
3. Use a concise PR title based on the commit messages, fix messages, or the
   user's requested title.
4. Make the PR body begin with a `## Why` section:
   - Write 1-2 concise sentences explaining why the change was made.
   - Base the motivation on the session context and the user's prompting.
   - Focus on reviewer context and intent, not implementation details.
5. After `## Why`, include a summary table of all commits.

```markdown
## Why

This change addresses <reason from the session or user request>. It helps reviewers understand <intended outcome or context>.

| Commit | Change |
|--------|--------|
| `fix:` description | What was fixed and why |
| `feat:` description | What was added |
```

Do not add a separate validation or testing block for routine build, lint, or
test commands. Those checks are expected to run before PR creation and add noise
to the description.

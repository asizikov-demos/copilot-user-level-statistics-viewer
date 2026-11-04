# Branch and commit workflow

Use this reference when creating branches or commits.

## Branch naming

Create descriptive branch names using category prefixes:

- `feat/short-description` - new features
- `fix/short-description` - bug fixes
- `refactor/short-description` - code restructuring
- `chore/short-description` - maintenance, deps, config
- `security/short-description` - security fixes
- `ui/short-description` - UI/UX changes
- `improve/short-description` - improvements and optimizations

## Commit conventions

Each commit must be atomic: one logical change per commit. Do not bundle
unrelated changes.

### Commit-boundary gate

Before staging, inspect the complete intended diff, including untracked files
that belong to the work. Present a brief commit plan with each proposed subject,
its purpose, and the files or hunks it covers. Do not include unrelated workspace
changes.

Choose boundaries around one coherent reviewer intent:

- Split distinct behavior changes or substantial prerequisite work when separate
  commits make them easier to review and maintain. A shared feature or issue is
  not, by itself, a reason to combine them.
- Keep implementation, necessary wiring, directly related tests, and supporting
  documentation together. Do not split mechanically by file, architectural
  layer, commit prefix, or diff size.
- One commit is valid for one cohesive intent, even across many files. There is
  no target commit count or requirement to prove a change cannot be decomposed.
- Dependent commits are allowed, but do not create knowingly broken intermediate
  states just to make smaller commits.

Check both directions: does any planned commit bundle distinct purposes, and
does any proposed split fragment a change reviewers need to understand together?
If the scope changes, update the plan before staging the affected work. The plan
does not replace the repository's commit approval rules.

Stage only the files or hunks for the current planned commit. Review
`git diff --cached` and confirm it contains exactly that purpose before committing.

Before pushing, inspect the actual outgoing commits and their diffs, not just
their subjects or the aggregate branch diff. Compare them with the plan when
available and apply the same two-way boundary check to existing commits.
If boundaries need correction, stop before publishing and follow the repository's
authorization rules for amending or rewriting history; this gate does not grant
permission to rewrite existing commits.

### Commit messages

Commit message format: `prefix: short imperative description`

Allowed prefixes: `fix:`, `feat:`, `refactor:`, `chore:`, `ci:`, `docs:`,
`test:`

Use `feat!:` or `fix!:` for breaking changes.

Rules:

- Keep the subject line under 72 characters.
- Do not end the subject line with a period.
- Always include this trailer at the end of every commit message:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
- If an existing commit is missing the required trailer, amend it before PR
  creation or follow-up pushes.
- Before creating any commit, review staged changes with `git diff --cached` to
  ensure only intended changes are included.

## Standalone push

If the user asks only to push committed changes and no PR update or creation is
needed, push the current branch with `git push` or `git push -u origin
<branch-name>` when no upstream is configured.

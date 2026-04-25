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

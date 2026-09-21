# Sync Model State

The Agentic Workflow in `.github/workflows/sync-model-state.md` replaces the
local **Sync Model Type** automation's implementation task:

```text
Official model tables + main
  -> verified identity/category drift
  -> narrow catalog and test changes
  -> independent code review
  -> build, lint, tests
  -> one implemented PR for human review
```

No drift produces a run summary, not a PR. Unavailable or ambiguous evidence
produces an explicit blocker, not a successful no-drift result. Historical and
config-only names remain unchanged.

## Schedule and output

- Daily at **10:00 Europe/Amsterdam**, following that timezone's DST rules.
  GitHub Actions schedules are best-effort, not an exact-time guarantee.
- Manual execution from the Actions UI or `gh aw run sync-model-state`.
  Only `main` is eligible; writer/maintainer/admin authorization is required.
- Implemented, non-draft PRs target `main`, have a `[model-sync]` title prefix,
  and carry the existing `factory:model-sync` label.
- A pending model-sync PR suppresses further runs. The agent also checks for
  overlapping catalog work, including PRs from the local automation. Existing
  PRs are left for the maintainer; newly detected drift waits until the overlapping
  work is resolved.
- The only publishable files are `src/domain/modelConfig.ts` and
  `src/domain/__tests__/modelConfig.test.ts`.
- Review and validation happen in the runner checkout before publication.
  The workflow does not promise that future GitHub PR reviews or CI checks pass.
  Subsequent review comments, CI failures, and merging are handled by a human.

This intentionally does not implement issue intake, issue-to-Copilot handoff,
factory assessments, or automated improvement proposals. The previous
[factory design](model-sync-factory-design.md) is historical context, not the
implementation specification.

## Runtime prerequisites

GitHub Actions and Agentic Workflows Copilot inference must be available to the
repository. Like the existing repository workflows, this workflow uses
`copilot-requests: write` for organization-billed inference. It does not need a
Copilot cloud-agent assignment credential because it implements changes directly.

The engine uses `gpt-5.6-terra` with `COPILOT_PROVIDER_WIRE_API: responses`.
The Copilot runtime defaults to Chat Completions in its proxied BYOK mode; the
explicit wire API selects Responses for GPT-5-series models without changing
the GitHub authentication or firewall configuration.

Allow GitHub Actions to create pull requests in repository settings. The agent
has read-only GitHub permissions; a separate safe-output job receives the
permissions needed to publish the constrained PR. Protected-file checks remain
enabled. The `factory:model-sync` label must already exist.

The agent can fetch official docs through `web-fetch` and the declared network
allowlist. For Copilot this enables the native `web_fetch` tool, not shell `curl`.
GitHub queries use the provided GitHub tools or their `github` CLI wrapper;
baseline reads use `git show`. These reads run separately so a shell denial is
not misreported as multiple upstream outages. Shell `curl`, `wget`, and `mkdir`
are not authorized. A denied call should be retried through the declared read
capability if it has not yet been tried, without expanding permissions.
Incomplete evidence remains blocked, and its summary identifies the actual
failed operation separately from unattempted reads.

An Actions run can finish green while the agent records `missing_data`. Inspect
the agent output and safe-output results: only a complete evidence-backed
comparison establishes no drift, and only confirmed publication establishes a PR.

Node 22 and `npm ci` prepare the checkout for the existing validation
commands. An available built-in subagent performs read-only review using the
repository's code-review criteria, without its editor-specific model/tool settings.

PR-triggered CI may require approval when the PR is created with `GITHUB_TOKEN`.
Approve those runs in the PR UI when requested. Pre-publication validation is not
a substitute for branch protection, and this workflow neither bypasses protection
nor grants itself broader credentials to trigger CI.

## Source and compilation

Edit the Markdown source, then regenerate only its lock file:

```sh
gh extension install github/gh-aw --pin v0.88.8
gh aw compile sync-model-state
```

If the extension is already installed at that version, skip installation.
This workflow uses compiler v0.88.8; older repository workflows are unchanged. Commit both
`.github/workflows/sync-model-state.md` and its generated `.lock.yml`; do not
hand-edit generated YAML or recompile unrelated workflows.
Review shared metadata changes after compilation: preserve the existing
`.gitattributes` merge policy and older workflows' `.github/aw/actions-lock.json`
pins while adding the new compiler action pin.

Reference documentation:

- [Agentic Workflows setup](https://docs.github.com/en/actions/tutorials/develop-agentic-workflows-in-github-actions)
- [Triggers and timezone scheduling](https://github.github.com/gh-aw/reference/triggers/)
- [Pull-request safe outputs and file restrictions](https://github.github.com/gh-aw/reference/safe-outputs-pull-requests/)

## Migration and cutover

Adding files locally does not deploy or run the workflow. The existing local
**Sync Model Type** automation remains enabled until deliberately disabled.

1. Review and merge the workflow source and generated lock file into `main`.
2. Confirm inference, PR permissions, and the label are configured. Manually run
   the new workflow and inspect its actual Actions result, including safe outputs.
3. After a successful run, disable the local automation to avoid duplicate work.
   Do not enable automatic PR merging.

A no-drift run verifies the read/no-op path, not the PR-publication path. The first
real drift run must also be checked for successful review, validation, and actual
PR publication before considering the whole migration verified.

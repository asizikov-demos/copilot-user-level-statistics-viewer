# UI consistency review

The [agentic workflow](../.github/workflows/ui-consistency-review.md) reviews UI
reuse and consistency and publishes one ordinary PR comment. Reruns replace its
previous comment. It does not change code, submit a blocking review, or create
issues. Do not add its jobs as required branch-protection checks.

Automatic reviews run for same-repository PRs when opened, updated, reopened, or
marked ready for review. Drafts and changes outside source/UI configuration and
dependencies skip the agent. Source filtering is intentionally broad so shared
TypeScript helpers and UI additions inside existing files are not missed.
Execution is restricted to actors with write, maintain, or admin access.

## Review an older PR

Once the compiled workflow is on the default branch, open **Actions > UI
Consistency Review > Run workflow** and supply a PR number, `#number`, or a full
PR URL from this repository. Open, closed, and merged PRs are supported:

```sh
gh workflow run ui-consistency-review.lock.yml -f pr=719
gh workflow run ui-consistency-review.lock.yml \
  -f pr=https://github.com/asizikov-demos/copilot-user-level-statistics-viewer/pull/762
```

Manual runs bypass draft/state/relevance filtering, but still reject fork PRs
and cross-repository URLs. **They publish a real comment**, including on historical
PRs; they are not dry runs. Historical reviews compare the PR's changes and
base-revision reuse candidates under today's trusted default-branch policies.
Later changes to the PR head supersede an in-flight review: a guard job re-reads the PR head before publication and skips the comment if it moved.

## Scope and limitations

The reviewer inventories new and changed UI, checks existing local/Primer
patterns and opportunities within the PR, and reports third-party changes.
Findings require concrete evidence and behavioral fit, not just similar JSX.
Successful reuse and intentional differences should be recognized.

The agent reads source only: it does not install dependencies, execute PR code,
or verify rendered layout. Missing/truncated evidence must be reported as
incomplete, not a clean review. Agent or publication failures remain visible in
Actions; operational failure reports do not open issues.

The analysis token is read-only apart from Copilot inference permission.
Comment publication uses gh-aw's separate, permission-controlled safe output,
restricted to the PR number validated by the preparation job. No fork execution
or privileged `pull_request_target` trigger is enabled.

## Maintenance and calibration

Edit the Markdown workflow, then regenerate its committed lock file using the
repository's compiler version:

```sh
gh aw compile ui-consistency-review
node --test .github/workflows/__tests__/ui-consistency-review.node.mjs
```

Do not edit the generated YAML. Before enabling automatic reviews, calibrate
against representative PRs: #696 (shared Primer primitives), #719 (new feature
UI), #755/#759 (cross-view color/icon alignment), and #762 (successful chart
reuse). Expect opportunities only where evidence supports a simpler compatible
implementation; a new abstraction is not inherently an improvement.

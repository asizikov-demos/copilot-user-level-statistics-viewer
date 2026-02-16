---
description: Keep model multipliers in src/domain/modelConfig.ts aligned with GitHub Docs.

on:
  workflow_dispatch:
  schedule:
    - cron: "17 3 * * *"
  skip-if-match:
    query: 'is:issue is:open in:title "Copilot model multipliers out of sync"'
    max: 1

permissions:
  actions: read
  contents: read
  issues: read

concurrency:
  group: copilot-model-multipliers
  cancel-in-progress: false

strict: true
engine: copilot
network: defaults

safe-outputs:
  create-issue:
    max: 1
    assignees: ["copilot"]

steps:
  - name: Checkout
    uses: actions/checkout@v5

  - name: Fetch GitHub Docs page
    run: |
      set -euo pipefail
      mkdir -p .cache
      curl -sSL https://docs.github.com/en/copilot/reference/ai-models/supported-models -o .cache/supported-models.html

  - name: Extract model multipliers section
    run: |
      set -euo pipefail
      python - <<'PY'
      import re
      html=open('.cache/supported-models.html','r',encoding='utf-8',errors='ignore').read()
      h=re.search(r'<h2 id="model-multipliers"[\s\S]*?</h2>', html)
      if not h:
        raise SystemExit('Could not find model-multipliers section')
      after=html[h.end():]
      t=re.search(r'<table[\s\S]*?</table>', after)
      if not t:
        raise SystemExit('Could not find multipliers table after model-multipliers heading')
      open('.cache/model-multipliers-table.html','w',encoding='utf-8').write(t.group(0))
      PY

  - name: Ensure gh-models extension
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      set -euo pipefail
      gh extension install https://github.com/github/gh-models || gh extension upgrade github/gh-models

  - name: Extract multipliers via phi-4
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    run: |
      set -euo pipefail
      gh models run --file .github/prompts/extract-model-multipliers.prompt.yml \
        --var input="$(cat .cache/model-multipliers-table.html)" \
        > .cache/model-multipliers.json

  - name: Compare against src/domain/modelConfig.ts
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent
      rc=0
      node data-utils/check-model-multipliers.mjs \
        --extracted .cache/model-multipliers.json \
        --report /tmp/gh-aw/agent/report.md || rc=$?

      if [ "$rc" -eq 0 ]; then
        echo "clean" > /tmp/gh-aw/agent/drift-status.txt
      elif [ "$rc" -eq 2 ]; then
        echo "drift" > /tmp/gh-aw/agent/drift-status.txt
      else
        exit "$rc"
      fi
---

# Sync Copilot model multipliers

Review deterministic artifacts in `/tmp/gh-aw/agent/`.

## Process

1. Read `/tmp/gh-aw/agent/drift-status.txt`.
2. If drift status is `clean`, do not create any issue.
3. If drift status is `drift`, read `/tmp/gh-aw/agent/report.md` and use `create-issue` to create exactly one issue with:
   - Title: `Copilot model multipliers out of sync`
   - Body: the full contents of `/tmp/gh-aw/agent/report.md`
   - Assignees: `["copilot"]`
4. Do not modify repository files.

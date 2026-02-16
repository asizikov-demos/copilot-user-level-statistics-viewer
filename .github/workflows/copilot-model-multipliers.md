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
---

# Sync Copilot model multipliers

Use `.cache/model-multipliers-table.html` and `src/domain/modelConfig.ts`.

## Process

1. Parse every row in the docs table into:
   - `displayName`
   - `paidMultiplier` (number)
   - `freeMultiplier` (number or null for "Not applicable")
2. Convert `displayName` to a `KNOWN_MODELS` key using these normalization rules:
   - trim + lowercase as base normalization
   - `GPT-*`, `Grok *`, `Raptor *`: lowercase and replace spaces with `-`
   - `Claude (Haiku|Sonnet|Opus) <version>`:
     - if version is an integer, append `.0`
     - Opus key: `claude-opus-<version>`
     - Haiku/Sonnet keys: `claude-<version>-<family>`
   - `Gemini <version> (Pro|Flash)`:
     - if version is an integer, append `.0`
     - key: `gemini-<version>-<tier>`
   - fallback: lowercase and replace spaces with `-`
3. Compare docs paid multipliers against `KNOWN_MODELS` in `src/domain/modelConfig.ts`:
   - ignore rows where docs `paidMultiplier` is `0`
   - mark missing keys
   - mark mismatched multipliers
4. If no missing or mismatched entries exist, call `noop` with a short success message and do not create an issue.
5. If drift exists, use `create-issue` to create exactly one issue:
   - Title: `Copilot model multipliers out of sync`
   - Assignees: `["copilot"]`
   - Body format:
     - `# Copilot model multiplier drift detected`
     - brief explanation that docs were compared to `src/domain/modelConfig.ts`
     - `## Missing premium models (non-zero paid multiplier)` list (if any)
     - `## Multiplier mismatches` list (if any)
     - `## Next steps` with:
       - update `KNOWN_MODELS` in `src/domain/modelConfig.ts`
       - fix normalization logic if key mapping is wrong
6. Do not modify repository files.

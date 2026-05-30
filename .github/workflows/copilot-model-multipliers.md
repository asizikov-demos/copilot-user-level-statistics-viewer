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
    with:
      persist-credentials: false

  - name: Fetch GitHub Docs model multipliers
    run: |
      set -euo pipefail
      mkdir -p .cache
      curl --fail --show-error --silent --location --retry 3 \
        https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/model-multipliers.yml \
        -o .cache/model-multipliers.yml

  - name: Render model multipliers table
    run: |
      set -euo pipefail
      python3 - <<'PY'
      from html import escape
      from pathlib import Path

      def clean(value):
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
          return value[1:-1]
        return value

      source = Path('.cache/model-multipliers.yml').read_text(encoding='utf-8')
      rows = []
      current = {}

      for raw_line in source.splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
          continue
        if line.startswith('- '):
          if current:
            rows.append(current)
          current = {}
          line = line[2:].strip()
        if current is not None and ':' in line:
          key, _, value = line.partition(':')
          current[key.strip()] = clean(value)

      if current:
        rows.append(current)

      required_keys = {'name', 'multiplier_paid', 'multiplier_free'}
      if not rows:
        raise SystemExit('Could not find model multiplier rows')
      for row in rows:
        missing = required_keys - row.keys()
        if missing:
          raise SystemExit(f"Model multiplier row is missing {', '.join(sorted(missing))}: {row}")

      table_rows = [
        '<table>',
        '<thead><tr><th>Model</th><th>Multiplier for paid plans</th><th>Multiplier for Copilot Free</th></tr></thead>',
        '<tbody>',
      ]
      for row in rows:
        table_rows.append(
          '<tr>'
          f"<td>{escape(row['name'])}</td>"
          f"<td>{escape(row['multiplier_paid'])}</td>"
          f"<td>{escape(row['multiplier_free'])}</td>"
          '</tr>'
        )
      table_rows.extend(['</tbody>', '</table>'])
      Path('.cache/model-multipliers-table.html').write_text('\n'.join(table_rows), encoding='utf-8')
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

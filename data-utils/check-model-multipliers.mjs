import fs from 'fs';
import path from 'path';

function normalize(name) {
  return String(name ?? '').trim().toLowerCase();
}

function toConfigKey(displayName) {
  const s = String(displayName ?? '').trim();

  if (/^GPT-/i.test(s)) {
    return normalize(s).replace(/\s+/g, '-');
  }

  if (/^Grok\s+/i.test(s)) {
    return normalize(s).replace(/\s+/g, '-');
  }

  if (/^Raptor\s+/i.test(s)) {
    return normalize(s).replace(/\s+/g, '-');
  }

  const claude = s.match(/^Claude\s+(Haiku|Sonnet|Opus)\s+([0-9]+(?:\.[0-9]+)?)$/i);
  if (claude) {
    const family = claude[1].toLowerCase();
    let version = claude[2];
    if (/^[0-9]+$/.test(version)) version = `${version}.0`;
    if (family === 'opus') return `claude-opus-${version}`;
    return `claude-${version}-${family}`;
  }

  const gemini = s.match(/^Gemini\s+([0-9]+(?:\.[0-9]+)?)\s+(Pro|Flash)$/i);
  if (gemini) {
    let version = gemini[1];
    const tier = gemini[2].toLowerCase();
    if (/^[0-9]+$/.test(version)) version = `${version}.0`;
    return `gemini-${version}-${tier}`;
  }

  return normalize(s).replace(/\s+/g, '-');
}

function almostEqual(a, b) {
  return Math.abs(a - b) < 1e-9;
}

function stripModelFences(text) {
  let t = String(text ?? '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```[^\n]*\n/, '').replace(/\n```\s*$/, '').trim();
  }
  return t;
}

function parseKnownModels(modelConfigTs) {
  const text = fs.readFileSync(modelConfigTs, 'utf8');
  const re = /new\s+Model\(\s*'([^']+)'\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*(true|false)\s*\)/g;
  const map = new Map();
  for (const m of text.matchAll(re)) {
    map.set(normalize(m[1]), Number(m[2]));
  }
  return map;
}

function main() {
  const args = process.argv.slice(2);
  const extractedPath = args.includes('--extracted') ? args[args.indexOf('--extracted') + 1] : '';
  const reportPath = args.includes('--report') ? args[args.indexOf('--report') + 1] : '';
  const configPath = args.includes('--config')
    ? args[args.indexOf('--config') + 1]
    : path.join(process.cwd(), 'src/domain/modelConfig.ts');

  if (!extractedPath) {
    throw new Error(
      'Usage: node data-utils/check-model-multipliers.mjs --extracted <file.json> [--report <file.md>] [--config <src/domain/modelConfig.ts>]'
    );
  }

  const extractedRaw = stripModelFences(fs.readFileSync(extractedPath, 'utf8'));
  const extracted = JSON.parse(extractedRaw);

  const configMultipliers = parseKnownModels(configPath);

  const missing = [];
  const mismatched = [];

  for (const row of extracted.models ?? []) {
    const expected = Number(row.paidMultiplier);
    if (!expected || expected === 0) continue;

    const key = toConfigKey(row.displayName);
    const actual = configMultipliers.get(normalize(key));

    if (actual === undefined) {
      missing.push({ key, displayName: row.displayName, expected });
    } else if (!almostEqual(actual, expected)) {
      mismatched.push({ key, displayName: row.displayName, expected, actual });
    }
  }

  const ok = missing.length === 0 && mismatched.length === 0;

  const lines = [];
  lines.push('# Copilot model multiplier drift detected');
  lines.push('');
  lines.push(
    'This issue was created automatically by the scheduled workflow that compares GitHub Docs **Model multipliers** against `src/domain/modelConfig.ts`.'
  );
  lines.push('');

  if (missing.length) {
    lines.push('## Missing premium models (non-zero paid multiplier)');
    lines.push('');
    for (const m of missing) {
      lines.push('- `' + m.key + '` (docs: "' + m.displayName + '") expected multiplier: **' + m.expected + '**');
    }
    lines.push('');
  }

  if (mismatched.length) {
    lines.push('## Multiplier mismatches');
    lines.push('');
    for (const m of mismatched) {
      lines.push(
        '- `' +
          m.key +
          '` (docs: "' +
          m.displayName +
          '") expected: **' +
          m.expected +
          '**, config: **' +
          m.actual +
          '**'
      );
    }
    lines.push('');
  }

  lines.push('## Next steps');
  lines.push('- Update `KNOWN_MODELS` in `src/domain/modelConfig.ts` to match the docs.');
  lines.push('- If a mapping is incorrect, adjust normalization in `data-utils/check-model-multipliers.mjs`.');
  lines.push('');

  const report = lines.join('\n');
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf8');
  } else {
    process.stdout.write(report);
  }

  if (!ok) process.exit(2);
}

main();

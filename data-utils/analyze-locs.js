#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function main() {
  const inputPath = process.argv[2] || path.join(__dirname, '..', 'example', 'example.ndjson');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);

  // Aggregate per-day across all users
  const days = new Map();

  for (const [index, line] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (err) {
      console.error(`Failed to parse JSON on line ${index + 1}:`, err.message);
      continue;
    }

    const day = record.day || 'UNKNOWN_DAY';
    const existing = days.get(day) || {
      topAdded: 0,
      topDeleted: 0,
      features: new Map(),
    };

    existing.topAdded += Number(record.loc_added_sum || 0);
    existing.topDeleted += Number(record.loc_deleted_sum || 0);

    const byFeature = Array.isArray(record.totals_by_feature) ? record.totals_by_feature : [];
    for (const f of byFeature) {
      const name = f.feature || 'UNKNOWN_FEATURE';
      const add = Number(f.loc_added_sum || 0);
      const del = Number(f.loc_deleted_sum || 0);

      const featAgg = existing.features.get(name) || { added: 0, deleted: 0 };
      featAgg.added += add;
      featAgg.deleted += del;
      existing.features.set(name, featAgg);
    }

    days.set(day, existing);
  }

  // Print one report per day
  const sortedDays = Array.from(days.keys()).sort();

  for (const day of sortedDays) {
    const info = days.get(day);
    if (!info) continue;

    let featureAdded = 0;
    let featureDeleted = 0;

    console.log(`Day: ${day}`);
    console.log(`  Top-level (all users): added=${info.topAdded}, deleted=${info.topDeleted}`);
    console.log('  By feature (all users):');

    const featureNames = Array.from(info.features.keys()).sort();
    for (const name of featureNames) {
      const agg = info.features.get(name);
      if (!agg) continue;
      console.log(`    ${name}: added=${agg.added}, deleted=${agg.deleted}`);
      featureAdded += agg.added;
      featureDeleted += agg.deleted;
    }

    const addedDiff = featureAdded - info.topAdded;
    const deletedDiff = featureDeleted - info.topDeleted;

    console.log(`  Sum by feature: added=${featureAdded}, deleted=${featureDeleted}`);
    if (addedDiff === 0 && deletedDiff === 0) {
      console.log('  ✔ Totals match top-level values');
    } else {
      console.log('  ✖ Totals do NOT match top-level values');
      console.log(`    Difference: added=${addedDiff}, deleted=${deletedDiff}`);
    }
    console.log('');
  }
}

if (require.main === module) {
  main();
}

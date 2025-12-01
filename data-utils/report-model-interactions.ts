#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type TotalsByModelFeatureRecord = {
  model?: unknown;
  user_initiated_interaction_count?: unknown;
};

type NdjsonRecord = {
  day?: unknown;
  totals_by_model_feature?: unknown;
};

type DayKey = string;

type InteractionsByModel = Map<string, number>;

type AggregatedData = Map<DayKey, InteractionsByModel>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_INPUT_PATH = path.join(ROOT_DIR, 'example', 'unknown-model-test.ndjson');

async function readNdjsonFile(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function parseRecord(line: string, lineNumber: number): NdjsonRecord | null {
  try {
    return JSON.parse(line) as NdjsonRecord;
  } catch (error) {
    console.warn(`Skipping invalid JSON on line ${lineNumber}: ${(error as Error).message}`);
    return null;
  }
}

function extractDay(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function extractModel(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return 'unknown';
}

function extractInteractionCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function aggregateInteractions(records: NdjsonRecord[]): AggregatedData {
  const result: AggregatedData = new Map();

  records.forEach((record, index) => {
    const day = extractDay(record.day);
    if (!day) {
      console.warn(`Skipping record ${index + 1}: missing "day" value.`);
      return;
    }

    const rawModelFeatures = record.totals_by_model_feature;
    if (!Array.isArray(rawModelFeatures) || rawModelFeatures.length === 0) {
      return;
    }

    const dayEntry = result.get(day) ?? new Map<string, number>();

    rawModelFeatures.forEach(item => {
      const featureRecord = item as TotalsByModelFeatureRecord;
      const model = extractModel(featureRecord.model);
      const interactions = extractInteractionCount(featureRecord.user_initiated_interaction_count);

      if (interactions === 0) {
        return;
      }

      dayEntry.set(model, (dayEntry.get(model) ?? 0) + interactions);
    });

    if (dayEntry.size > 0) {
      result.set(day, dayEntry);
    }
  });

  return result;
}

function formatReport(aggregated: AggregatedData): string {
  if (aggregated.size === 0) {
    return 'No interactions found in the provided data.';
  }

  const dayKeys = Array.from(aggregated.keys()).sort((a, b) => a.localeCompare(b));
  const lines: string[] = [];

  dayKeys.forEach(day => {
    lines.push(`Day: ${day}`);
    lines.push('- Models:');

    const modelEntries = Array.from(aggregated.get(day) ?? [])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    modelEntries.forEach(([model, interactions]) => {
      lines.push(`  -- ${model}: ${interactions} interactions`);
    });

    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

async function main(): Promise<void> {
  const inputArg = process.argv[2];
  const inputPath = inputArg ? path.resolve(process.cwd(), inputArg) : DEFAULT_INPUT_PATH;

  try {
    const lines = await readNdjsonFile(inputPath);
    const records: NdjsonRecord[] = [];

    lines.forEach((line, index) => {
      const parsed = parseRecord(line, index + 1);
      if (parsed) {
        records.push(parsed);
      }
    });

    const aggregated = aggregateInteractions(records);
    const report = formatReport(aggregated);

    console.log(report);
  } catch (error) {
    console.error(`Failed to process file at ${inputPath}:`, error);
    process.exitCode = 1;
  }
}

main();

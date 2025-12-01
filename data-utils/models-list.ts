#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const EXAMPLE_DIR = path.join(ROOT_DIR, 'example');
const OUTPUT_PATH = path.join(ROOT_DIR, 'example', 'models.md');

const SKIP_FILES = new Set(['jetbrains.json']);
const SKIP_PREFIXES = ['sample'];

type JsonValue = unknown;

async function collectModelNames(customPaths?: string[]): Promise<string[]> {
  const models = new Set<string>();

  if (customPaths && customPaths.length > 0) {
    for (const input of customPaths) {
      const resolvedPath = path.resolve(process.cwd(), input);
      const fileName = path.basename(resolvedPath);

      await processFile(resolvedPath, fileName, models);
    }
  } else {
    const entries = await readdir(EXAMPLE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const fileName = entry.name;
      const lower = fileName.toLowerCase();
      const isJsonLike = lower.endsWith('.json') || lower.endsWith('.ndjson');

      if (!isJsonLike) continue;
      if (SKIP_FILES.has(lower)) continue;
      if (SKIP_PREFIXES.some(prefix => lower.startsWith(prefix))) continue;

      const filePath = path.join(EXAMPLE_DIR, fileName);
      await processFile(filePath, fileName, models);
    }
  }

  return Array.from(models).sort((a, b) => a.localeCompare(b));
}

function parseJsonContent(content: string, fileName: string): JsonValue[] {
  const trimmed = content.trim();

  if (!trimmed) {
    console.warn(`Skipping empty file: ${fileName}`);
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    const lines = trimmed.split(/\r?\n/);
    const records: JsonValue[] = [];

    lines.forEach((line, index) => {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) return;

      try {
        records.push(JSON.parse(lineTrimmed));
      } catch (lineError) {
        console.warn(
          `Skipping invalid JSON in ${fileName} (line ${index + 1}): ${(lineError as Error).message}`
        );
      }
    });

    return records;
  }
}

function collectModelsFromValue(value: JsonValue, models: Set<string>): void {
  if (value == null) return;

  if (Array.isArray(value)) {
    value.forEach(item => collectModelsFromValue(item, models));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value as Record<string, JsonValue>)) {
      if (key.toLowerCase() === 'model' && typeof nestedValue === 'string') {
        const normalized = nestedValue.trim();
        if (normalized) {
          models.add(normalized);
        }
      }

      collectModelsFromValue(nestedValue, models);
    }
  }
}

async function processFile(filePath: string, fileName: string, models: Set<string>): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf8');
    const records = parseJsonContent(content, fileName);

    for (const record of records) {
      collectModelsFromValue(record, models);
    }
  } catch (error) {
    console.warn(`Skipping ${fileName}: ${(error as Error).message}`);
  }
}

function renderMarkdown(models: string[]): string {
  const lines: string[] = [];
  lines.push('# Model Inventory');
  lines.push('');
  lines.push(`Generated on ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Total unique models: ${models.length}`);
  lines.push('');

  if (models.length === 0) {
    lines.push('_No models found._');
  } else {
    models.forEach((model, index) => {
      lines.push(`${index + 1}. \`${model}\``);
    });
  }

  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const inputArgs = process.argv.slice(2);
  const models = await collectModelNames(inputArgs.length > 0 ? inputArgs : undefined);
  const markdown = renderMarkdown(models);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, markdown, 'utf8');

  console.log(`Found ${models.length} unique models.`);
  console.log(`Wrote list to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
}

main().catch(error => {
  console.error('Failed to generate model list:', error);
  process.exitCode = 1;
});

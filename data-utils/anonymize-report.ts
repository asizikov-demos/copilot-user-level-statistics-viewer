#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { pathToFileURL } from 'node:url';

type JsonRecord = Record<string, unknown>;
interface ParsedRecord {
  lineNumber: number;
  record: JsonRecord;
}

const ENTERPRISE_ID_ANON = '0000';
const EMU_SUFFIX = '_octoemu';

const ADJECTIVES = [
  'happy',
  'lonely',
  'brave',
  'calm',
  'bright',
  'clever',
  'curious',
  'gentle',
  'mighty',
  'quiet',
  'rapid',
  'shy',
  'silly',
  'witty',
  'zealous',
  'fuzzy',
  'glossy',
  'golden',
  'silver',
  'crimson',
  'amber',
  'icy',
  'sunny',
  'stormy',
  'misty',
  'cosmic',
  'stellar',
  'lunar',
  'solar',
  'ancient',
  'modern',
  'nimble',
  'playful',
  'patient',
  'bold',
  'kind',
  'eager',
  'proud',
  'swift',
  'wild',
  'zany',
  'jolly',
  'sleepy',
  'spicy',
  'breezy',
  'fiery',
  'bubbly',
  'glad',
  'graceful',
  'sparkly',
  'smooth',
  'steady',
  'tender',
  'vivid',
  'chill',
  'fresh',
  'bright-eyed',
  'soft',
  'fearless',
  'radiant',
  'mellow',
  'plucky',
];

const NOUNS_A = [
  'panda',
  'bear',
  'otter',
  'fox',
  'wolf',
  'tiger',
  'lion',
  'eagle',
  'sparrow',
  'whale',
  'dolphin',
  'shark',
  'octopus',
  'koala',
  'kangaroo',
  'lemur',
  'yak',
  'zebra',
  'giraffe',
  'rhino',
  'hippo',
  'camel',
  'alpaca',
  'penguin',
  'seal',
  'walrus',
  'owl',
  'falcon',
  'raven',
  'parrot',
  'gecko',
  'iguana',
  'turtle',
  'lizard',
  'python',
  'cobra',
  'antelope',
  'bison',
  'buffalo',
  'cheetah',
  'jaguar',
  'panther',
  'gorilla',
  'sloth',
  'hamster',
  'badger',
  'beaver',
  'crow',
  'crane',
  'heron',
  'swallow',
  'butterfly',
  'dragonfly',
  'honeybee',
  'ladybug',
  'firefly',
  'manta',
  'stingray',
  'starfish',
  'seahorse',
  'manatee',
  'moose',
  'deer',
  'rabbit',
  'swan',
  'crab',
  'lobster',
];

const NOUNS_B = [
  'banana',
  'flower',
  'peach',
  'apple',
  'mango',
  'papaya',
  'cherry',
  'plum',
  'grape',
  'melon',
  'kiwi',
  'lemon',
  'lime',
  'orange',
  'apricot',
  'coconut',
  'fig',
  'guava',
  'lychee',
  'nectarine',
  'olive',
  'pear',
  'pineapple',
  'pomegranate',
  'raspberry',
  'strawberry',
  'blueberry',
  'blackberry',
  'cranberry',
  'date',
  'persimmon',
  'tangerine',
  'watermelon',
  'cantaloupe',
  'pumpkin',
  'pepper',
  'carrot',
  'tomato',
  'potato',
  'onion',
  'garlic',
  'ginger',
  'basil',
  'mint',
  'sage',
  'thyme',
  'cinnamon',
  'vanilla',
  'coffee',
  'cocoa',
  'cookie',
  'muffin',
  'waffle',
  'pancake',
  'noodle',
  'taco',
  'sushi',
  'pizza',
  'bagel',
  'donut',
  'cupcake',
  'honey',
  'maple',
  'sunflower',
  'orchid',
  'tulip',
  'daisy',
];

function usage(): void {
  console.log('Usage: data-utils/anonymize-report.ts <input.ndjson> [output.ndjson]');
}

function pick(list: string[]): string {
  return list[randomInt(0, list.length)];
}

function generateBaseSlug(existing: Set<string>): string {
  for (let attempt = 0; attempt < 100000; attempt++) {
    const candidate = `${pick(ADJECTIVES)}-${pick(NOUNS_A)}-${pick(NOUNS_B)}`.toLowerCase();
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error('Failed to generate a unique anonymized username after many attempts');
}

function isNdjsonFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.ndjson');
}

export function getUserIdentityKey(record: JsonRecord): string | null {
  const login = record.user_login;
  if (typeof login === 'string' && login.trim().length > 0) {
    return `login:${login}`;
  }

  const userId = record.user_id;
  if (typeof userId === 'number' && Number.isFinite(userId)) {
    return `id:${userId}`;
  }

  if (typeof userId === 'string' && userId.trim().length > 0) {
    return `id:${userId}`;
  }

  return null;
}

export function buildSequentialUserIdMap(records: JsonRecord[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const record of records) {
    const key = getUserIdentityKey(record);
    if (!key || map.has(key)) continue;
    map.set(key, map.size + 1);
  }

  return map;
}

function assertEveryRecordHasUserIdentity(records: ParsedRecord[]): void {
  const missingIdentityRecord = records.find(({ record }) => getUserIdentityKey(record) === null);
  if (!missingIdentityRecord) return;

  throw new Error(
    `Record on line ${missingIdentityRecord.lineNumber} is missing both user_login and user_id`,
  );
}

function anonymizeLogin(original: string, existing: Set<string>, map: Map<string, string>): string {
  const cached = map.get(original);
  if (cached) return cached;

  const base = generateBaseSlug(existing);
  const anonymized = original.includes('_') ? `${base}${EMU_SUFFIX}` : base;

  existing.add(base);
  existing.add(anonymized);
  map.set(original, anonymized);
  return anonymized;
}

export async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);

  if (!inputArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!isNdjsonFileName(inputArg)) {
    throw new Error(`Input file must be a *.ndjson file: ${inputArg}`);
  }

  if (outputArg && !isNdjsonFileName(outputArg)) {
    throw new Error(`Output file must be a *.ndjson file: ${outputArg}`);
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(
    process.cwd(),
    outputArg ?? inputArg.replace(/\.ndjson$/i, '.anonymized.ndjson'),
  );

  const content = await readFile(inputPath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const records: ParsedRecord[] = [];
  const uniqueLogins = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed && typeof parsed === 'object') {
        const rec = parsed as JsonRecord;
        const login = rec.user_login;
        if (typeof login === 'string' && login.trim().length > 0) {
          uniqueLogins.add(login);
        }
        records.push({ lineNumber: i + 1, record: rec });
      }
    } catch (e) {
      throw new Error(
        `Invalid JSON on line ${i + 1}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  assertEveryRecordHasUserIdentity(records);

  const plainRecords = records.map(({ record }) => record);
  const map = new Map<string, string>();
  const used = new Set<string>();
  const userIdMap = buildSequentialUserIdMap(plainRecords);

  for (const login of uniqueLogins) {
    anonymizeLogin(login, used, map);
  }

  const outputLines: string[] = [];
  for (const { record: rec } of records) {
    const userKey = getUserIdentityKey(rec);

    if (typeof rec.enterprise_id === 'string') {
      rec.enterprise_id = ENTERPRISE_ID_ANON;
    }

    if (typeof rec.user_login === 'string') {
      rec.user_login = anonymizeLogin(rec.user_login, used, map);
    }

    const anonymizedUserId = userKey ? userIdMap.get(userKey) : undefined;
    if (!anonymizedUserId) {
      throw new Error('Cannot assign anonymized user_id because the record is missing a user key');
    }
    rec.user_id = anonymizedUserId;

    outputLines.push(JSON.stringify(rec));
  }

  await writeFile(outputPath, `${outputLines.join('\n')}\n`, 'utf8');

  console.log(`Processed ${records.length} records.`);
  console.log(`Anonymized ${uniqueLogins.size} unique user_login values.`);
  console.log(`Reassigned ${userIdMap.size} unique user_id values to the range 1-${userIdMap.size}.`);
  console.log(`Wrote ${outputPath}`);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href) {
  void main().catch((error) => {
    console.error('Anonymization failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

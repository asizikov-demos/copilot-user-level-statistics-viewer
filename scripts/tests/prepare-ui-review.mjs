import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const { prepareUiReview } = createRequire(import.meta.url)('../prepare-ui-review.cjs');
const repository = { id: 1, full_name: 'owner/repo' };
const uiFile = {
  filename: 'src/components/ui/Card.tsx', status: 'modified',
  additions: 1, deletions: 1, patch: '@@ -1 +1 @@\n-<div />\n+<section />',
};

async function run(t, files, options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'ui-review-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const outputs = {};
  const reads = [];
  let comparisons = 0;
  let prReads = 0;
  const pr = {
    number: 1, title: 'Changed UI', draft: false, state: 'open',
    changed_files: files.length,
    base: { sha: 'base', repo: repository },
    head: { sha: 'head', repo: repository },
    ...options.pr,
  };
  const context = {
    repo: { owner: 'owner', repo: 'repo' },
    eventName: options.manual ? 'workflow_dispatch' : 'pull_request',
    payload: { pull_request: { number: 1 } },
    serverUrl: 'https://github.com',
  };
  const summary = {
    addHeading() { return this; }, addRaw() { return this; },
    addTable() { return this; }, async write() {},
  };
  const github = {
    paginate: async () => files,
    rest: {
      pulls: {
        listFiles() {},
        get: async () => {
          prReads++;
          return { data: prReads > 1 && options.current ? { ...pr, ...options.current } : pr };
        },
      },
      repos: {
        compareCommits: async args => {
          comparisons++;
          assert.equal(args.base, 'base');
          assert.equal(args.head, 'head');
          return { data: { merge_base_commit: { sha: 'merge-base' } } };
        },
        getContent: async args => {
          reads.push(args);
          const document = options.documents?.[`${args.ref}:${args.path}`];
          const blob = options.blobs?.[`${args.ref}:${args.path}`];
          assert.ok(document || blob, `Unexpected contents read: ${args.ref}:${args.path}`);
          if (blob) return { data: { type: 'file', sha: blob } };
          return { data: {
            type: 'file', encoding: 'base64',
            content: Buffer.from(JSON.stringify(document)).toString('base64'),
          } };
        },
      },
    },
  };
  const execute = () => prepareUiReview({
    github, context, core: { summary, setOutput: (key, value) => { outputs[key] = value; } },
    input: options.input ?? '1', directory,
  });
  if (options.error) {
    await assert.rejects(execute, options.error);
    await assert.rejects(readFile(path.join(directory, 'review.json')), { code: 'ENOENT' });
  } else {
    await execute();
  }
  const packet = outputs.should_review === 'true' ?
    JSON.parse(await readFile(path.join(directory, 'review.json'), 'utf8')) : null;
  return { outputs, packet, reads, comparisons };
}

test('worker-test and large fixture PR skips without fetching a diff or source', async t => {
  const result = await run(t, [
    { filename: 'README.md', additions: 20, deletions: 0 },
    { filename: 'public/data/sample-report.ndjson', additions: 5274, deletions: 5274 },
    { filename: 'src/workers/__tests__/metricsWorker.test.ts', additions: 63, deletions: 2 },
  ]);
  assert.equal(result.outputs.should_review, 'false');
  assert.equal(result.outputs.clear_advice, 'true');
  assert.equal(result.comparisons, 0);
  assert.deepEqual(result.reads, []);
});

test('manual historical runs retain the relevance filter', async t => {
  const result = await run(t, [{ filename: 'src/domain/core.ts', additions: 1, deletions: 1 }], {
    manual: true, pr: { state: 'closed' },
  });
  assert.equal(result.outputs.historical, 'true');
  assert.equal(result.outputs.should_review, 'false');
});

test('net packet excludes test, fixture, worker, and hook patches but keeps complete inventory', async t => {
  const result = await run(t, [
    uiFile,
    ...[
      'src/components/ui/Card.test.tsx', 'src/components/ui/__tests__/Card.tsx',
      'src/components/ui/Card.stories.tsx', 'src/components/fixtures/Card.tsx',
      'src/hooks/useCard.ts', 'src/workers/metricsWorker.ts',
    ].map(filename => ({ ...uiFile, filename })),
  ]);
  assert.equal(result.outputs.should_review, 'true');
  assert.equal(result.outputs.historical, 'false');
  assert.equal(result.packet.mergeBaseSha, 'merge-base');
  assert.equal(result.packet.inventory.length, 7);
  assert.deepEqual(result.packet.reviewFiles.map(file => file.filename), [uiFile.filename]);
  assert.equal(result.packet.reviewFiles[0].patch, uiFile.patch);
  assert.ok(result.packet.inventory.every(file => !Object.hasOwn(file, 'patch')));
  assert.deepEqual(result.reads, []);
});

test('pure moves are not new UI, but moves with UI edits are included', async t => {
  const moved = { ...uiFile, filename: 'src/components/ui/Renamed.tsx',
    previous_filename: uiFile.filename, status: 'renamed' };
  const pure = await run(t, [{ ...moved, additions: 0, deletions: 0, patch: undefined }]);
  assert.equal(pure.outputs.should_review, 'false');
  const edited = await run(t, [moved]);
  assert.equal(edited.packet.reviewFiles[0].previousFilename, uiFile.filename);
});

test('manual closed UI reviews use recorded revisions and are labelled historical', async t => {
  const result = await run(t, [uiFile], {
    manual: true, input: 'https://github.com/owner/repo/pull/1', pr: { state: 'closed' },
  });
  assert.equal(result.packet.historical, true);
  assert.equal(result.outputs.should_review, 'true');
});

test('manifest-only non-UI dev upgrades skip the agent', async t => {
  const result = await run(t, [{ filename: 'package.json' }], {
    documents: {
      'merge-base:package.json': { devDependencies: { eslint: '^9' } },
      'head:package.json': { devDependencies: { eslint: '^10' } },
    },
  });
  assert.equal(result.outputs.should_review, 'false');
});

test('test-only React upgrades skip unless imported by changed production UI', async t => {
  const options = {
    documents: {
      'merge-base:package.json': { devDependencies: { 'react-test-renderer': '^19.2' } },
      'head:package.json': { devDependencies: { 'react-test-renderer': '^19.3' } },
    },
  };
  const skipped = await run(t, [{ filename: 'package.json' }], options);
  assert.equal(skipped.outputs.should_review, 'false');
  assert.equal(skipped.outputs.clear_advice, 'true');
  const imported = await run(t, [
    { filename: 'package.json' },
    { ...uiFile, patch: '@@ -1 +1 @@\n-old\n+import Test from "react-test-renderer";' },
  ], options);
  assert.equal(imported.packet.dependencies[0].name, 'react-test-renderer');
});

test('direct UI lock upgrades are included without reporting transitive changes', async t => {
  const manifest = { dependencies: { '@primer/react': '^38' } };
  const result = await run(t, [{ filename: 'package-lock.json' }], {
    documents: {
      'merge-base:package.json': manifest, 'head:package.json': manifest,
      'merge-base:package-lock.json': { packages: {
        'node_modules/@primer/react': { version: '38.1.0' },
        'node_modules/transitive': { version: '1.0.0' },
      } },
      'head:package-lock.json': { packages: {
        'node_modules/@primer/react': { version: '38.2.0' },
        'node_modules/transitive': { version: '2.0.0' },
      } },
    },
  });
  assert.equal(result.outputs.should_review, 'true');
  assert.equal(result.packet.dependencies.length, 1);
  assert.equal(result.packet.dependencies[0].name, '@primer/react');
  assert.equal(result.packet.dependencies[0].resolvedTo, '38.2.0');
});

test('new UI package imported in changed implementation is included', async t => {
  const result = await run(t, [
    { ...uiFile, patch: '@@ -1 +1 @@\n-import Old from "old";\n+import New from "new-ui/widget";' },
    { filename: 'package.json' },
  ], {
    documents: {
      'merge-base:package.json': { dependencies: {} },
      'head:package.json': { dependencies: { 'new-ui': '^1' } },
    },
  });
  assert.equal(result.packet.dependencies[0].name, 'new-ui');
});

test('missing or truncated relevant patches fail rather than produce a clean partial review', async t => {
  await run(t, [{ ...uiFile, patch: undefined }], { error: /Missing or truncated/ });
  await run(t, [{ ...uiFile, patch: '@@ -1 +1 @@\n+<section />' }], { error: /Missing or truncated/ });
});

test('binary production UI changes require visual review instead of silently skipping', async t => {
  await run(t, [{
    filename: 'src/components/icons/tablepro.png', status: 'modified', additions: 0, deletions: 0,
  }], { error: /needs a visual review/ });
});

test('binary renames are exempt only when merge-base/head blob identity is verified', async t => {
  const renamed = {
    filename: 'src/components/icons/new.png', previous_filename: 'src/components/icons/old.png',
    status: 'renamed', additions: 0, deletions: 0,
  };
  const blobs = {
    'merge-base:src/components/icons/old.png': 'old-blob',
    'head:src/components/icons/new.png': 'old-blob',
  };
  const pure = await run(t, [renamed], { blobs });
  assert.equal(pure.outputs.should_review, 'false');
  assert.deepEqual(pure.reads.map(({ ref, path }) => [ref, path]), [
    ['merge-base', renamed.previous_filename], ['head', renamed.filename],
  ]);
  await run(t, [renamed], {
    blobs: { ...blobs, 'head:src/components/icons/new.png': 'new-blob' },
    error: /needs a visual review/,
  });
  await run(t, [renamed], {
    blobs: { 'merge-base:src/components/icons/old.png': 'old-blob' },
    documents: { 'head:src/components/icons/new.png': {} },
    error: /needs a visual review/,
  });
});

test('per-file, file-count, and total-packet limits reject incomplete delivery', async t => {
  await run(t, [{ ...uiFile, patch: `@@ -1 +1 @@\n-x\n+${'x'.repeat(20_000)}` }], {
    error: /exceeds 20000 bytes/,
  });
  await run(t, Array.from({ length: 31 }, (_, i) => ({
    ...uiFile, filename: `src/components/Card${i}.tsx`,
  })), { error: /exceeds 30 files/ });
  await run(t, Array.from({ length: 10 }, (_, i) => ({
    ...uiFile, filename: `src/components/Card${i}.tsx`,
    patch: `@@ -1 +1 @@\n-x\n+${'x'.repeat(15_000)}`,
  })), { error: /packet exceeds 120000 bytes/ });
});

test('head/base races and incomplete inventories refuse mixed-revision packets', async t => {
  await run(t, [uiFile], {
    current: { head: { ...repository, sha: 'new-head' } }, error: /revisions changed/,
  });
  await run(t, [uiFile], {
    current: { base: { ...repository, sha: 'new-base' } }, error: /revisions changed/,
  });
  await run(t, [uiFile], { pr: { changed_files: 2 }, error: /inventory is incomplete/ });
});

test('foreign PR URLs and fork heads are rejected before delivery', async t => {
  await run(t, [uiFile], { manual: true, input: 'https://github.com/other/repo/pull/1',
    error: /URL must identify/ });
  await run(t, [uiFile], { pr: { head: { sha: 'head', repo: { id: 2 } } },
    error: /same-repository/ });
});

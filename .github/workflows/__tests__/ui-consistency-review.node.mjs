import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(new URL('../ui-consistency-review.md', import.meta.url), 'utf8');
const scriptBlock = workflow.match(/ {10}script: \|\n((?: {12}[^\n]*\n|\n)+)/);
assert.ok(scriptBlock, 'The workflow must contain the PR preparation script');
const script = scriptBlock[1].replace(/^ {12}/gm, '');
const workflowRequire = createRequire(import.meta.url);

async function prepare({
  input = '719',
  eventName = 'workflow_dispatch',
  eventNumber = 762,
  state = 'open',
  draft = false,
  fork = false,
  paths = ['src/components/Example.tsx'],
  changedFiles = paths.length,
  apiError,
} = {}) {
  const outputs = {};
  const calls = [];
  const pr = {
    state,
    draft,
    changed_files: changedFiles,
    base: { sha: 'base-sha', repo: { id: 1, full_name: 'owner/viewer' } },
    head: { sha: 'head-sha', repo: fork ? null : { id: 1 } },
  };
  const summary = {
    addHeading() { return this; },
    addRaw() { return this; },
    addTable() { return this; },
    async write() {},
  };
  const directory = await mkdtemp(path.join(tmpdir(), 'ui-workflow-test-'));
  try {
    await runInNewContext(`(async () => { ${script} })()`, {
    URL,
    require: specifier => {
      assert.equal(specifier, './scripts/prepare-ui-review.cjs');
      return workflowRequire('../../../scripts/prepare-ui-review.cjs');
    },
    process: { env: { PR_INPUT: input, RUNNER_TEMP: directory } },
    context: {
      repo: { owner: 'owner', repo: 'viewer' },
      eventName,
      serverUrl: 'https://github.com',
      payload: eventName === 'workflow_dispatch' ? {} : { pull_request: { number: eventNumber } },
    },
    core: { setOutput: (name, value) => { outputs[name] = value; }, summary },
    github: {
      rest: {
        pulls: {
          async get(parameters) {
            calls.push(parameters);
            if (apiError) throw apiError;
            return { data: pr };
          },
          listFiles: 'list-files',
        },
        repos: {
          async compareCommits() {
            return { data: { merge_base_commit: { sha: 'merge-base-sha' } } };
          },
          async getContent({ path: filename, ref }) {
            const version = ref === 'head-sha' ? '2.0.0' : '1.0.0';
            const document = filename === 'package.json' ?
              { dependencies: { '@primer/react': version } } :
              { packages: { 'node_modules/@primer/react': { version } } };
            return { data: {
              type: 'file', encoding: 'base64',
              content: Buffer.from(JSON.stringify(document)).toString('base64'),
            } };
          },
        },
      },
      async paginate(method, parameters) {
        assert.equal(method, 'list-files');
        assert.equal(parameters.per_page, 100);
        return paths.map(filename => ({
          status: 'modified', additions: 1, deletions: 1,
          patch: '@@ -1 +1 @@\n-old\n+new',
          ...(typeof filename === 'string' ? { filename } : filename),
        }));
      },
    },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  return { outputs, calls };
}

test('manual dispatch accepts numbers, #numbers, and same-repository URLs', async () => {
  for (const input of [
    '719', ' #719 ', 'https://github.com/owner/viewer/pull/719',
    'https://github.com/OWNER/VIEWER/pull/719/?tab=files#discussion',
  ]) {
    const { outputs, calls } = await prepare({ input });
    assert.equal(outputs.pr_number, '719');
    assert.equal(outputs.head_sha, 'head-sha');
    assert.equal(outputs.base_sha, 'base-sha');
    assert.equal(outputs.should_review, 'true');
    assert.equal(calls[0].pull_number, 719);
  }
});

test('manual dispatch reviews relevant historical/draft PRs but skips non-UI PRs', async () => {
  for (const state of ['open', 'closed']) {
    const { outputs } = await prepare({ state, draft: true });
    assert.equal(outputs.should_review, 'true');
    const irrelevant = await prepare({ state, draft: true, paths: ['README.md'] });
    assert.equal(irrelevant.outputs.should_review, 'false');
  }
});

test('invalid or cross-repository targets fail closed', async () => {
  for (const input of [
    '', '0', '-1', '1.5', '719;echo unsafe', '9007199254740992',
    'https://example.com/owner/viewer/pull/719',
    'https://github.com/other/viewer/pull/719',
    'https://github.com/owner/other/pull/719',
    'https://github.com/owner/viewer/issues/719',
    'https://user:password@github.com/owner/viewer/pull/719',
  ]) {
    await assert.rejects(prepare({ input }), /PR number|PR URL/);
  }
});

test('forks, incomplete inventories, and API failures are explicit errors', async () => {
  await assert.rejects(prepare({ fork: true }), /same-repository/);
  await assert.rejects(prepare({ changedFiles: 3001 }), /inventory is incomplete/);
  await assert.rejects(prepare({ apiError: new Error('Not Found') }), /Not Found/);
});

test('PR events use the event number, not dispatch input', async () => {
  const { outputs } = await prepare({ eventName: 'pull_request', input: 'invalid' });
  assert.equal(outputs.pr_number, '762');
  assert.equal(outputs.should_review, 'true');
});

test('automatic reviews skip drafts, closed PRs, and unrelated changes', async () => {
  for (const overrides of [
    { draft: true }, { state: 'closed' }, { paths: ['README.md'] },
  ]) {
    const { outputs } = await prepare({ eventName: 'pull_request', ...overrides });
    assert.equal(outputs.should_review, 'false');
  }
});

test('automatic reviews include production styles, direct UI packages, and edited renamed UI', async () => {
  for (const path of [
    'src/app/globals.css', 'package.json', 'package-lock.json',
    { filename: 'archive/Example.txt', previous_filename: 'src/components/Example.tsx' },
  ]) {
    const { outputs } = await prepare({ eventName: 'pull_request', paths: [path] });
    assert.equal(outputs.should_review, 'true');
  }
});

test('shared helpers and policies alone do not start production UI reviews', async () => {
  for (const filename of ['src/utils/ideMetadata.ts', '.github/instructions/charts.instructions.md']) {
    const { outputs } = await prepare({ eventName: 'pull_request', paths: [filename] });
    assert.equal(outputs.should_review, 'false');
    assert.equal(outputs.clear_advice, 'true');
  }
});

const cleanupBlock = workflow.match(/name: Clear obsolete UI advice without starting an agent[\s\S]*? {10}script: \|\n((?: {12}[^\n]*\n|\n)+)/);
assert.ok(cleanupBlock, 'The workflow must clear obsolete advice without an agent');
const cleanupScript = cleanupBlock[1].replace(/^ {12}/gm, '');
const marker = '<!-- gh-aw-workflow-call-id: owner/viewer/ui-consistency-review -->';

async function clearAdvice({ comments = [], head = 'head-sha', base = 'base-sha', state = 'open' } = {}) {
  const updates = [];
  await runInNewContext(`(async () => { ${cleanupScript} })()`, {
    process: { env: { PR_NUMBER: '719', REVIEWED_SHA: 'head-sha', REVIEWED_BASE_SHA: 'base-sha' } },
    context: { repo: { owner: 'owner', repo: 'viewer' } },
    core: {
      info() {}, notice() {},
      summary: { addHeading() { return this; }, addRaw() { return this; }, async write() {} },
    },
    github: {
      paginate: async () => comments,
      rest: {
        pulls: { get: async () => ({ data: { state, head: { sha: head }, base: { sha: base } } }) },
        issues: {
          listComments() {},
          updateComment: async update => { updates.push(update); },
        },
      },
    },
  });
  return updates;
}

test('loss of relevance clears only the newest existing comment from this workflow bot', async () => {
  const own = { user: { login: 'github-actions[bot]' }, body: `Old findings\n${marker}` };
  const updates = await clearAdvice({ comments: [
    { ...own, id: 1 }, { ...own, id: 2 },
    { user: { login: 'contributor' }, body: marker, id: 3 },
    { user: { login: 'github-actions[bot]' }, body: 'Different workflow', id: 4 },
  ] });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].comment_id, 2);
  assert.match(updates[0].body, /head-sha/);
  assert.match(updates[0].body, /previous advice is superseded/);
  assert.ok(updates[0].body.includes(marker));
});

test('irrelevant PRs with no previous workflow advice do not create comments', async () => {
  assert.equal((await clearAdvice()).length, 0);
  assert.equal((await clearAdvice({ comments: [
    { user: { login: 'contributor' }, body: marker, id: 1 },
  ] })).length, 0);
});

test('cleanup refuses stale heads, changed bases, and closed PRs', async () => {
  const comments = [{ user: { login: 'github-actions[bot]' }, body: marker, id: 1 }];
  for (const changes of [{ head: 'new-head' }, { base: 'new-base' }, { state: 'closed' }]) {
    assert.equal((await clearAdvice({ comments, ...changes })).length, 0);
  }
});

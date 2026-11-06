import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(new URL('../ui-consistency-review.md', import.meta.url), 'utf8');
const scriptBlock = workflow.match(/          script: \|\n((?: {12}[^\n]*\n|\n)+)/);
assert.ok(scriptBlock, 'The workflow must contain the PR preparation script');
const script = scriptBlock[1].replace(/^ {12}/gm, '');

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
    async write() {},
  };
  await runInNewContext(`(async () => { ${script} })()`, {
    URL,
    process: { env: { PR_INPUT: input, GITHUB_SERVER_URL: 'https://github.com' } },
    context: {
      repo: { owner: 'owner', repo: 'viewer' },
      eventName,
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
      },
      async paginate(method, parameters) {
        assert.equal(method, 'list-files');
        assert.equal(parameters.per_page, 100);
        return paths.map(path => typeof path === 'string' ? { filename: path } : path);
      },
    },
  });
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

test('manual dispatch reviews historical, draft, and non-UI PRs', async () => {
  for (const state of ['open', 'closed']) {
    const { outputs } = await prepare({ state, draft: true, paths: ['README.md'] });
    assert.equal(outputs.should_review, 'true');
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

test('automatic reviews include shared helpers, styles, packages, and renamed UI', async () => {
  for (const path of [
    'src/utils/ideMetadata.ts', 'src/app/globals.css', 'package.json',
    'package-lock.json', '.github/instructions/charts.instructions.md',
    { filename: 'archive/Example.txt', previous_filename: 'src/components/Example.tsx' },
  ]) {
    const { outputs } = await prepare({ eventName: 'pull_request', paths: [path] });
    assert.equal(outputs.should_review, 'true');
  }
});

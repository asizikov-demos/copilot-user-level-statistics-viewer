const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_FILE_BYTES = 20_000;
const MAX_PACKET_BYTES = 120_000;
const MAX_REVIEW_FILES = 30;

function productionUi(filename) {
  return /^src\/(app|components)\/.*\.(tsx?|jsx?|css|scss|svg|png|jpe?g|gif|webp|avif|ico)$/.test(filename) &&
    !/(^|\/)(__tests__|__mocks__|fixtures|generated)(\/|$)|\.(test|spec|stories|d)\.[^/]+$/.test(filename);
}

function completePatch(file) {
  if (typeof file.patch !== 'string') return false;
  const lines = file.patch.split('\n');
  return lines.filter(line => line.startsWith('+')).length === file.additions &&
    lines.filter(line => line.startsWith('-')).length === file.deletions;
}

async function prepareUiReview({ github, context, core, input, directory }) {
  const { owner, repo } = context.repo;
  const manual = context.eventName === 'workflow_dispatch';
  let number = context.payload.pull_request?.number;
  if (manual) {
    const value = (input || '').trim();
    if (/^#?[1-9]\d*$/.test(value)) {
      number = Number(value.replace(/^#/, ''));
    } else {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw new Error('Provide a PR number or a full PR URL in this repository.');
      }
      const server = new URL(context.serverUrl || 'https://github.com');
      const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/([1-9]\d*)\/?$/);
      if (url.origin !== server.origin || url.username || url.password || !match ||
          match[1].toLowerCase() !== owner.toLowerCase() ||
          match[2].toLowerCase() !== repo.toLowerCase()) {
        throw new Error('The PR URL must identify a pull request in this repository.');
      }
      number = Number(match[3]);
    }
  }
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error('A valid PR number is required.');
  }
  const params = { owner, repo, pull_number: number };
  const { data: pr } = await github.rest.pulls.get(params);
  if (pr.base.repo.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase() ||
      pr.head.repo?.id !== pr.base.repo.id) {
    throw new Error('Only same-repository pull requests are supported.');
  }
  core.setOutput('pr_number', String(number));
  core.setOutput('head_sha', pr.head.sha);
  core.setOutput('base_sha', pr.base.sha);
  core.setOutput('historical', String(pr.state === 'closed'));
  core.setOutput('should_review', 'false');
  if (!manual && (pr.draft || pr.state !== 'open')) {
    await core.summary.addHeading('UI consistency review')
      .addRaw(`PR #${number}: skipped (draft or closed).`).write();
    return;
  }

  const files = await github.paginate(github.rest.pulls.listFiles, {
    ...params, per_page: 100,
  });
  if (files.length !== pr.changed_files) {
    throw new Error('The PR file inventory is incomplete; refusing a partial review.');
  }
  const binaryAsset = files.find(file => productionUi(file.filename) &&
    /\.(png|jpe?g|gif|webp|avif|ico)$/.test(file.filename) && file.status !== 'renamed');
  if (binaryAsset) {
    throw new Error(`Binary UI asset ${binaryAsset.filename} needs a visual review; no source-only review was produced.`);
  }
  const uiFiles = files.filter(file =>
    (productionUi(file.filename) || productionUi(file.previous_filename || '')) &&
    file.additions + file.deletions > 0);
  const manifestsChanged = files.some(file =>
    ['package.json', 'package-lock.json'].includes(file.filename));
  if (!uiFiles.length && !manifestsChanged) {
    await core.summary.addHeading('UI consistency review')
      .addRaw(`PR #${number}: skipped (no production UI or UI dependency changes).`).write();
    return;
  }

  // PR file patches describe the net merge-base diff, not a concatenation of commits.
  const { data: comparison } = await github.rest.repos.compareCommits({
    owner, repo, base: pr.base.sha, head: pr.head.sha, per_page: 1,
  });
  const mergeBase = comparison.merge_base_commit?.sha;
  if (!mergeBase) throw new Error('The PR merge base is unavailable; refusing a partial review.');
  core.setOutput('merge_base_sha', mergeBase);

  async function jsonAt(filename, ref) {
    const { data } = await github.rest.repos.getContent({ owner, repo, path: filename, ref });
    if (Array.isArray(data) || data.type !== 'file' || data.encoding !== 'base64' ||
        typeof data.content !== 'string') {
      throw new Error(`Cannot read ${filename} at ${ref}; refusing a partial review.`);
    }
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
  }

  const dependencies = [];
  if (manifestsChanged) {
    const [before, after] = await Promise.all([
      jsonAt('package.json', mergeBase), jsonAt('package.json', pr.head.sha),
    ]);
    const lockChanged = files.some(file => file.filename === 'package-lock.json');
    const [beforeLock, afterLock] = lockChanged ? await Promise.all([
      jsonAt('package-lock.json', mergeBase), jsonAt('package-lock.json', pr.head.sha),
    ]) : [null, null];
    const uiPatches = uiFiles.map(file => file.patch || '').join('\n');
    for (const scope of ['dependencies', 'devDependencies']) {
      const names = new Set([...Object.keys(before[scope] || {}), ...Object.keys(after[scope] || {})]);
      for (const name of names) {
        const from = before[scope]?.[name] || null;
        const to = after[scope]?.[name] || null;
        const resolvedFrom = from ? beforeLock?.packages?.[`node_modules/${name}`]?.version || null : null;
        const resolvedTo = to ? afterLock?.packages?.[`node_modules/${name}`]?.version || null : null;
        const knownUi = /^(?:@primer\/|@tailwindcss\/|react(?:$|-)|chart\.js$|tailwindcss$|next$)/.test(name);
        const referenced = uiPatches.includes(`'${name}'`) || uiPatches.includes(`"${name}"`) ||
          uiPatches.includes(`'${name}/`) || uiPatches.includes(`"${name}/`);
        if ((from !== to || resolvedFrom !== resolvedTo) && (knownUi || referenced)) {
          dependencies.push({ name, scope, from, to, resolvedFrom, resolvedTo });
        }
      }
    }
  }
  if (!uiFiles.length && !dependencies.length) {
    await core.summary.addHeading('UI consistency review')
      .addRaw(`PR #${number}: skipped (only non-UI dependency changes).`).write();
    return;
  }
  if (uiFiles.length > MAX_REVIEW_FILES) {
    throw new Error(`UI review exceeds ${MAX_REVIEW_FILES} files; narrow the PR. No partial review was produced.`);
  }
  for (const file of uiFiles) {
    if (!completePatch(file)) {
      throw new Error(`Missing or truncated net patch for ${file.filename}; no partial review was produced.`);
    }
    if (Buffer.byteLength(file.patch, 'utf8') > MAX_FILE_BYTES) {
      throw new Error(`Net patch for ${file.filename} exceeds ${MAX_FILE_BYTES} bytes; narrow the PR.`);
    }
  }
  const packet = {
    schemaVersion: 1,
    repository: `${owner}/${repo}`,
    prNumber: number,
    title: (pr.title || '').slice(0, 300),
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    mergeBaseSha: mergeBase,
    historical: pr.state === 'closed',
    inventory: files.map(file => ({
      filename: file.filename, previousFilename: file.previous_filename || null,
      status: file.status, additions: file.additions, deletions: file.deletions,
      reviewTarget: uiFiles.includes(file),
    })),
    reviewFiles: uiFiles.map(file => ({
      filename: file.filename, previousFilename: file.previous_filename || null,
      status: file.status, reason: 'Changed production UI implementation', patch: file.patch,
    })),
    dependencies,
  };
  const serialized = JSON.stringify(packet);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PACKET_BYTES) {
    throw new Error(`UI review packet exceeds ${MAX_PACKET_BYTES} bytes; narrow the PR. No partial review was produced.`);
  }
  const { data: current } = await github.rest.pulls.get(params);
  if (current.head.sha !== pr.head.sha || current.base.sha !== pr.base.sha) {
    throw new Error('The PR revisions changed during preparation; refusing a mixed-revision review.');
  }
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'review.json'), serialized, 'utf8');
  core.setOutput('should_review', 'true');
  await core.summary.addHeading('UI consistency review')
    .addRaw(`PR #${number} at ${pr.head.sha}: ${uiFiles.length} production UI files and ${dependencies.length} UI dependency changes queued. Tests, fixtures, and unrelated files are inventory only.`)
    .addTable([
      ['Review target', 'Change'],
      ...uiFiles.map(file => [file.filename, file.status]),
    ]).write();
}

module.exports = { prepareUiReview };

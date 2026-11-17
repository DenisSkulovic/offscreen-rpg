import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, root } from './process.mjs';

const PATH_LIMIT = 40;

function read(relative) {
  return readFileSync(path.join(root, relative), 'utf8');
}

// These Markdown headings are maintained in the documentation rule.
function section(document, heading, source) {
  const lines = document.split(/\r?\n/);
  const starts = lines.flatMap((line, index) =>
    line === heading ? [index] : [],
  );
  if (starts.length !== 1) {
    throw new Error(`${source}: expected exactly one "${heading}" section.`);
  }
  const body = lines.slice(starts[0] + 1);
  const end = body.findIndex((line) => /^#{1,2} /.test(line));
  const value = body
    .slice(0, end < 0 ? undefined : end)
    .join('\n')
    .trim();
  if (!value) throw new Error(`${source}: "${heading}" is empty.`);
  return value;
}

// An intentionally empty implementation queue is valid. Never select a parked
// gameplay Change merely to make the brief happy.
function currentChange(route, changesDirRelative = 'docs/changes') {
  const declarations = [...route.matchAll(/^Current change: (.+?)\s*$/gm)];
  if (declarations.length !== 1) {
    throw new Error(
      `${changesDirRelative}/README.md: expected exactly one Current change declaration.`,
    );
  }
  const selected = declarations[0][1].trim();
  if (selected === 'none') return null;
  const match = /^\[[^\]]+\]\(([^)]+)\)$/.exec(selected);
  if (!match || match[1].includes('#')) {
    throw new Error(
      'Current change must be none or a relative CHANGE.md link.',
    );
  }
  const changeRoot = path.join(root, ...changesDirRelative.split('/'));
  const absolute = path.resolve(changeRoot, match[1]);
  const relativeToRoot = path.relative(root, absolute).split(path.sep).join('/');
  if (
    path.basename(absolute) !== 'CHANGE.md' ||
    !relativeToRoot.startsWith('work/changes/')
  ) {
    throw new Error(
      'Current change must point to CHANGE.md under work/changes/.',
    );
  }
  return relativeToRoot;
}

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) {
    throw new Error(`Git is unavailable: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim();
    throw new Error(detail || `git exited with ${result.status}`);
  }
  return result.stdout.replace(/\s+$/u, '');
}

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return value;
}

export function statusPaths(status) {
  if (!status) return { paths: [], truncated: false };
  const all = status.split(/\r?\n/).filter(Boolean).map((line) => {
    const body = line.length >= 4 ? line.slice(3) : line;
    const arrow = body.indexOf(' -> ');
    return unquote((arrow >= 0 ? body.slice(arrow + 4) : body).trim());
  });
  return {
    paths: all.slice(0, PATH_LIMIT),
    truncated: all.length > PATH_LIMIT,
  };
}

export function collectCheckout(cwd = root) {
  const branch = git(cwd, ['branch', '--show-current']);
  const sha = git(cwd, ['rev-parse', 'HEAD']);
  const status = git(cwd, ['status', '--short']);
  const log = git(cwd, ['log', '-3', '--oneline']);
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('Git HEAD is not a full 40-character SHA.');
  }
  return { branch, sha, status, log };
}

export function receiptFrom(checkout, change, checkpoint) {
  const listed = statusPaths(checkout.status);
  const receipt = {
    schema: 'repo.brief.v1',
    environment: 'local-checkout',
    sha: checkout.sha,
    branch: checkout.branch || null,
    detached: checkout.branch.length === 0,
    dirty: listed.paths.length > 0,
    paths: listed.paths,
    pathsTruncated: listed.truncated,
    change,
  };
  if (checkpoint !== undefined) receipt.checkpoint = checkpoint;
  return receipt;
}

function renderHuman(checkout, orientation, change, checkpoint) {
  const lines = [
    '# Repository brief',
    `Branch: ${checkout.branch}`,
    '',
    '## Working tree',
    checkout.status.trim() || 'clean',
    '',
    '## Recent commits',
    checkout.log,
    '',
    '## Orientation (STATUS.md)',
    orientation,
    '',
    '## Current Change',
    change ?? 'None selected (valid).',
  ];
  if (checkpoint !== undefined) {
    lines.push('', '## Current checkpoint', checkpoint ?? 'No active implementation Change.');
  }
  lines.push(
    '',
    '## Read next',
    'STATUS.md — demonstrated boundary',
    'ROADMAP.md — owner strategy',
    'work/changes/README.md — Change queue and execution contract',
    'docs/product/README.md — product bible map',
    'docs/technical/README.md — technical owner map',
    '.agents/README.md — conditional rules and repository commands',
    'Use --checkpoint for an active Change handoff; no services or providers are contacted.',
  );
  return lines.join('\n');
}

function loadRoute() {
  const statusPath = 'STATUS.md';
  const orientation = section(read(statusPath), '## Orientation', statusPath);
  const workChanges = path.join(root, 'work', 'changes', 'README.md');
  let changeRoute = 'work/changes/README.md';
  let changeDoc = read(changeRoute);
  if (existsSync(workChanges)) {
    const workDoc = readFileSync(workChanges, 'utf8');
    if (/^Current change: /m.test(workDoc) && !/^Current change: see /im.test(workDoc)) {
      changeRoute = 'work/changes/README.md';
      changeDoc = workDoc;
    }
  }
  const change = currentChange(changeDoc, changeRoute.replace(/\/README\.md$/, ''));
  return { orientation, change };
}

function checkpointFor(change) {
  if (!change) return null;
  const plan = path.posix.join(path.posix.dirname(change), 'PLAN.md');
  return existsSync(path.join(root, plan))
    ? section(read(plan), '## Current checkpoint', plan)
    : section(read(change), '## Handoff and next action', change);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm repo:brief [--checkpoint] [--json]');
    console.log(
      'Read-only Git/status/priority summary. --checkpoint includes a selected Change checkpoint, when one exists. --json prints a local checkout receipt and does not contact a remote.',
    );
    return;
  }
  if (args.includes('--self-test')) {
    return import('./brief-self-test.mjs').then((mod) => mod.runBriefSelfTest());
  }
  if (args.some((arg) => arg !== '--checkpoint' && arg !== '--json')) {
    throw new Error('Unknown argument. Usage: pnpm repo:brief [--checkpoint] [--json]');
  }
  const checkout = collectCheckout(root);
  const { orientation, change } = loadRoute();
  const wantCheckpoint = args.includes('--checkpoint');
  const checkpoint = wantCheckpoint ? checkpointFor(change) : undefined;
  if (args.includes('--json')) {
    console.log(JSON.stringify(receiptFrom(checkout, change, checkpoint)));
    return;
  }
  console.log(renderHuman(checkout, orientation, change, checkpoint));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const pending = main();
    if (pending && typeof pending.then === 'function') {
      pending.catch((error) => fail(error));
    }
  } catch (error) {
    fail(error);
  }
}

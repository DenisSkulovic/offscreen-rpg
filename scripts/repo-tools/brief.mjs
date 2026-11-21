import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, root } from './process.mjs';
import { parseCurrentWork, WORK_QUEUE_FILE } from './work-selection.mjs';

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

// The single source of selection for both Change and standalone Task is
// work/QUEUE.md; no legacy Change-catalog fallback or second selector.
export function selectedWorkFromQueue(document, exists = () => true) {
  const result = parseCurrentWork(document);
  if (!result.ok) throw new Error(result.message);
  if (result.target && !exists(result.target)) {
    throw new Error(`Current work target is missing: ${result.target}`);
  }
  return result.target;
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

export function healthSummary(report) {
  if (report?.unavailable) return report.unavailable;
  const lines = [];
  if (report?.coverage?.status === 'unknown review needed') {
    const paths = Array.isArray(report.coverage.unknown) ? report.coverage.unknown.filter(Boolean) : [];
    lines.push(
      paths.length > 0
        ? `coverage: unknown review needed  ${paths.slice(0, 3).join(', ')}`
        : 'coverage: unknown review needed',
    );
  }
  const top = Array.isArray(report?.top3) ? report.top3.slice(0, 3) : [];
  if (top.length === 0) {
    lines.push('No review candidates.');
  } else {
    for (const item of top) {
      const next = item.suggestion || 'pnpm repo:maintenance';
      const dependency = item.dependency ? ` -> ${item.dependency}` : '';
      lines.push(`${item.code}  ${item.path}${dependency}\n  next: ${next}`);
    }
  }
  return lines.join('\n');
}

export function receiptFrom(checkout, selectedWork, checkpoint) {
  const listed = statusPaths(checkout.status);
  const workKind = selectedWork?.startsWith('work/changes/open/') ? 'change'
    : selectedWork?.startsWith('work/tasks/open/') ? 'task'
      : null;
  const receipt = {
    schema: 'repo.brief.v2',
    environment: 'local-checkout',
    sha: checkout.sha,
    branch: checkout.branch || null,
    detached: checkout.branch.length === 0,
    dirty: listed.paths.length > 0,
    paths: listed.paths,
    pathsTruncated: listed.truncated,
    work: selectedWork ?? null,
    workKind,
    change: workKind === 'change' ? selectedWork : null,
  };
  if (checkpoint !== undefined) receipt.checkpoint = checkpoint;
  return receipt;
}

const DEFAULT_DIRTY_LIMIT = 10;

export function renderHuman(checkout, orientation, work, checkpoint, { full = false } = {}) {
  const listed = statusPaths(checkout.status);
  if (full) {
    const lines = [
      '# Repository brief (full)',
      `Branch: ${checkout.branch || '(detached)'}`,
      `HEAD: ${checkout.sha}`,
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
      '## Current Work',
      work ?? 'None selected (valid).',
    ];
    if (checkpoint !== undefined) lines.push('', '## Current checkpoint', checkpoint ?? 'No globally selected Change/Task.');
    lines.push('', '## Read next',
      'STATUS.md — demonstrated boundary',
      'ROADMAP.md — owner strategy',
      'work/QUEUE.md — sole selection pointer',
      'work/changes/README.md — Change catalog',
      'work/tasks/README.md — standalone Tasks',
      'docs/README.md — canonical wiki');
    return lines.join('\\n');
  }

  const lines = [
    '# Repository brief',
    `Branch: ${checkout.branch || '(detached)'}  HEAD: ${checkout.sha.slice(0, 12)}`,
    `Working tree: ${listed.paths.length}${listed.truncated ? '+' : ''} changed/untracked paths`,
  ];
  const visible = listed.paths.slice(0, DEFAULT_DIRTY_LIMIT);
  for (const item of visible) lines.push(`  ${item}`);
  if (listed.paths.length > visible.length || listed.truncated) lines.push('  … more paths; run git status --short');
  lines.push(`Current work (global queue): ${work ?? 'none'}`);
  if (checkout.branch?.startsWith('change/')) {
    lines.push(`Checkout is a Change branch, not necessarily the globally selected work. Read its commissioned CHANGE.md/TASKS.md.`);
  }
  if (checkpoint !== undefined) lines.push('', '## Selected checkpoint', checkpoint ?? 'None selected.');
  lines.push('', 'Next: AGENTS.md → commissioned packet or work/QUEUE.md; STATUS.md for implementation truth.');
  lines.push('More: pnpm repo:brief --full | --json | --health | --checkpoint');
  return lines.join('\\n');
}

function loadRoute() {
  const statusPath = 'STATUS.md';
  const orientation = section(read(statusPath), '## Orientation', statusPath);
  const work = selectedWorkFromQueue(
    read(WORK_QUEUE_FILE),
    (rel) => existsSync(path.join(root, ...rel.split('/'))),
  );
  return { orientation, work };
}

function checkpointFor(work) {
  if (!work) return null;
  if (work.startsWith('work/tasks/open/')) {
    return section(read(work), '## Procedure', work);
  }
  const plan = path.posix.join(path.posix.dirname(work), 'PLAN.md');
  return existsSync(path.join(root, plan))
    ? section(read(plan), '## Current checkpoint', plan)
    : section(read(work), '## Handoff and next action', work);
}

function maintenanceReport() {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'repo-tools', 'maintenance.mjs'), '--json'],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  if (!result.stdout.trim()) {
    throw new Error((result.stderr || 'maintenance report was empty').trim());
  }
  return JSON.parse(result.stdout);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: pnpm repo:brief [--full] [--checkpoint] [--json] [--health]');
    console.log(
      'Read-only concise Git/status/priority summary. --full includes the complete STATUS orientation and recent commits. --checkpoint includes the selected Change checkpoint or standalone Task procedure, if one exists. --json prints a local checkout receipt and does not contact a remote. --health adds the top three maintenance review candidates.',
    );
    return;
  }
  if (args.includes('--self-test')) {
    return import('./brief-self-test.mjs').then((mod) => mod.runBriefSelfTest());
  }
  const allowed = new Set(['--checkpoint', '--json', '--health', '--full']);
  if (args.some((arg) => !allowed.has(arg))) {
    throw new Error('Unknown argument. Usage: pnpm repo:brief [--checkpoint] [--json] [--health]');
  }
  const checkout = collectCheckout(root);
  const { orientation, work } = loadRoute();
  const wantCheckpoint = args.includes('--checkpoint');
  const checkpoint = wantCheckpoint ? checkpointFor(work) : undefined;
  const health = args.includes('--health') ? maintenanceReport() : null;
  if (args.includes('--json')) {
    const receipt = receiptFrom(checkout, work, checkpoint);
    if (health) {
      receipt.health = {
        unavailable: health.unavailable,
        top3: (health.top3 ?? []).slice(0, 3),
      };
    }
    console.log(JSON.stringify(receipt));
    return;
  }
  const text = renderHuman(checkout, orientation, work, checkpoint, { full: args.includes('--full') });
  console.log(health ? `${text}\n\n## Maintenance\n${healthSummary(health)}` : text);
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

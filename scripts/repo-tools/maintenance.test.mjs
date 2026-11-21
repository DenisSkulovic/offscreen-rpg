import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scanMaintenance } from './maintenance-core.mjs';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'hk06-'));
  const files = new Map();
  function add(rel, text) {
    const abs = path.join(root, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    files.set(rel, text);
  }
  return {
    root,
    add,
    files() {
      return [...files.keys()];
    },
    readText(rel) {
      if (!files.has(rel)) throw new Error(`missing ${rel}`);
      return files.get(rel);
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function baseFiles(fx) {
  fx.add('README.md', '# Repo\n');
  fx.add('STATUS.md', '# Status\n');
  fx.add('.agents/README.md', '# Agents\n');
  fx.add('research/README.md', '# Research\n');
  fx.add('evidence/README.md', '# Evidence\n');
  fx.add(
    'evidence/runs/MANIFEST.md',
    '# Manifest\n\n[notes](trial/notes.md)\n',
  );
  fx.add('evidence/runs/trial/notes.md', '# Notes\n');
  fx.add('work/QUEUE.md', '# Work selector\n\nCurrent work: none\n\n[changes](changes/README.md)\n[tasks](tasks/README.md)\n');
  fx.add('work/tasks/README.md', '# Tasks\n\n[open](open/README.md)\n');
  fx.add('work/tasks/open/README.md', '# Open Tasks\n');
  fx.add('work/tasks/archive/README.md', '# Archived Tasks\n');

  fx.add(
    'work/changes/README.md',
    '# Queue\n\n[leaf](open/leaf/CHANGE.md)\n\n[ledger](ledger/)\n',
  );
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    '# Leaf\n\n**State: Done for A; B blocked.**\n\n[notes](../../../../evidence/runs/trial/notes.md)\n',
  );
  fx.add('work/changes/ledger/2026-11.md', '# Ledger\n');
  fx.add(
    'work/changes/archive/2026-11/other/old/CHANGE.md',
    '# Old\n\n**State: Done (2026-11-17).**\n',
  );
  fx.add(
    'work/designs/README.md',
    '# Designs\n\n[dossier](open/dossier/)\n',
  );
  fx.add('work/designs/open/dossier/README.md', '# Dossier\n');
  fx.add('work/designs/open/dossier/nested.md', '# Nested\n');
}

function scan(fx, git = { available: true, complete: true, sha: 'abc', dirty: false }) {
  return scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git,
    now: '2026-11-18',
  });
}

function codes(report) {
  return report.findings.map((item) => `${item.code}:${item.path}`);
}

test('indexed partial-Done packet and manifest-linked evidence pass', () => {
  const fx = fixture();
  baseFiles(fx);
  const report = scan(fx);
  fx.cleanup();
  assert.equal(report.unavailable, null);
  assert.equal(report.currentChange, 'none');
  assert.deepEqual(report.findings, []);
});

test('unindexed open Change fails until the queue links it', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add(
    'work/changes/README.md',
    '# Queue\n\n[ledger](ledger/)\n',
  );
  const missing = scan(fx);
  assert.equal(
    codes(missing).includes('missing-route:work/changes/open/leaf/CHANGE.md'),
    true,
  );
  fx.add(
    'work/changes/README.md',
    '# Queue\n\n[leaf](open/leaf/CHANGE.md)\n\n[ledger](ledger/)\n',
  );
  const linked = scan(fx);
  fx.cleanup();
  assert.deepEqual(linked.findings, []);
});

test('central selector accepts a Change or Task and refuses archived/missing targets', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/QUEUE.md', '# Queue\n\nCurrent work: [leaf](changes/open/leaf/CHANGE.md)\n');
  const change = scan(fx);
  assert.equal(change.selectedWorkPath, 'work/changes/open/leaf/CHANGE.md');
  assert.equal(change.currentChange, '[leaf](changes/open/leaf/CHANGE.md)');
  assert.equal(change.findings.some((item) => item.code === 'invalid-selection'), false);

  fx.add('work/tasks/open/job/TASK.md', '# Task\n\n**State:** Ready\n');
  fx.add('work/tasks/open/README.md', '# Open Tasks\n\n[job](job/TASK.md)\n');
  fx.add('work/QUEUE.md', '# Queue\n\nCurrent work: [job](tasks/open/job/TASK.md)\n');
  const task = scan(fx);
  assert.equal(task.selectedWorkPath, 'work/tasks/open/job/TASK.md');
  assert.equal(task.currentChange, 'none');
  assert.equal(task.findings.some((item) => item.code === 'invalid-selection'), false);

  fx.add('work/QUEUE.md', '# Queue\n\nCurrent work: [old](changes/archive/2026-11/other/old/CHANGE.md)\n');
  assert.equal(scan(fx).findings.some((item) => item.code === 'invalid-selection'), true);
  fx.add('work/QUEUE.md', '# Queue\n\nCurrent work: [missing](tasks/open/missing/TASK.md)\n');
  assert.equal(scan(fx).findings.some((item) => item.code === 'invalid-selection'), true);
  fx.add('work/QUEUE.md', '# Queue\n\nCurrent work: none\nCurrent work: none\n');
  assert.equal(scan(fx).findings.some((item) => item.code === 'invalid-selection'), true);
  fx.cleanup();
});

test('orphan folders, unindexed Tasks and terminal Task states are detected', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/open/orphan/PLAN.md', '# Orphan\n');
  fx.add('work/tasks/open/job/NOTES.md', '# Orphan Task\n');
  let report = scan(fx);
  assert.equal(codes(report).includes('orphan-open-folder:work/changes/open/orphan'), true);
  assert.equal(codes(report).includes('orphan-open-task:work/tasks/open/job'), true);
  fx.add('work/tasks/open/job/TASK.md', '# Task\n\n**State:** Ready\n');
  report = scan(fx);
  assert.equal(codes(report).includes('missing-route:work/tasks/open/job/TASK.md'), true);
  fx.add('work/tasks/open/README.md', '# Open Tasks\n\n[job](job/TASK.md)\n');
  report = scan(fx);
  assert.equal(codes(report).includes('missing-route:work/tasks/open/job/TASK.md'), false);
  fx.add('work/tasks/open/job/TASK.md', '# Task\n\n**State:** Done\n');
  report = scan(fx);
  assert.equal(codes(report).includes('terminal-open:work/tasks/open/job/TASK.md'), true);
  fx.cleanup();
});

test('archived Task must be terminal and linked from its archive index', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/tasks/archive/2026-11/old/TASK.md', '# Task\n\n**State:** Ready\n');
  let report = scan(fx);
  assert.equal(codes(report).includes('active-archived:work/tasks/archive/2026-11/old/TASK.md'), true);
  assert.equal(codes(report).includes('missing-route:work/tasks/archive/2026-11/old/TASK.md'), true);
  fx.add('work/tasks/archive/2026-11/old/TASK.md', '# Task\n\n**State:** Done\n');
  fx.add('work/tasks/archive/README.md', '# Archived Tasks\n\n[old](2026-11/old/TASK.md)\n');
  report = scan(fx);
  assert.equal(report.findings.some((item) => item.path === 'work/tasks/archive/2026-11/old/TASK.md'), false);
  fx.cleanup();
});

test('open leaf packet with optional TASKS and SOURCE-MAP stays green when indexed', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/open/leaf/TASKS.md', '# Tasks\n');
  fx.add('work/changes/open/leaf/SOURCE-MAP.md', '# Source map\n');
  const report = scan(fx);
  fx.cleanup();
  assert.deepEqual(report.findings, []);
});

test('tracked open folder without CHANGE.md is an orphan-open-folder error', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/open/orphan/PLAN.md', '# Plan\n');
  const report = scan(fx);
  fx.cleanup();
  const orphan = report.findings.filter((item) => item.code === 'orphan-open-folder');
  assert.deepEqual(orphan.map((item) => item.path), ['work/changes/open/orphan']);
  assert.equal(orphan.length, 1);
});

test('nested-only artifact under open leaf still flags orphan-open-folder', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/open/orphan/notes/PLAN.md', '# Plan\n');
  const report = scan(fx);
  fx.cleanup();
  assert.deepEqual(
    codes(report).filter((item) => item.startsWith('orphan-open-folder:')),
    ['orphan-open-folder:work/changes/open/orphan'],
  );
});

test('adding CHANGE.md clears orphan-open-folder but may still need queue route', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/open/orphan/PLAN.md', '# Plan\n');
  fx.add(
    'work/changes/open/orphan/CHANGE.md',
    '# Orphan\n\n**State: Proposed.**\n',
  );
  const report = scan(fx);
  fx.cleanup();
  assert.equal(report.findings.some((item) => item.code === 'orphan-open-folder'), false);
  assert.equal(
    codes(report).includes('missing-route:work/changes/open/orphan/CHANGE.md'),
    true,
  );
});

test('planner entry, catalog companions, infra READMEs and app inventories are classified', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('CHATGPT.md', '# Planner\n');
  fx.add('work/changes/COMPOSER-QUEUE-AUDIT-2026-11-20.md', '# Audit\n');
  fx.add('infra/kubernetes/lab/chaos/README.md', '# Chaos\n');
  fx.add('apps/web/src/stories/design-system-inventory.md', '# Inventory\n');
  const report = scan(fx);
  fx.cleanup();
  assert.equal(report.findings.some((item) => item.code === 'unclassified'), false);
});

test('top-level control doc and unrouted design dossier are strict findings', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('TODO.md', '# Todo\n');
  fx.add('work/designs/open/orphan/README.md', '# Orphan\n');
  const report = scan(fx);
  fx.cleanup();
  assert.equal(codes(report).includes('unclassified:TODO.md'), true);
  assert.equal(
    codes(report).includes('missing-route:work/designs/open/orphan'),
    true,
  );
  assert.equal(
    report.findings.some((item) => item.path === 'evidence/runs/trial/notes.md'),
    false,
  );
});

test('terminal Done in open fails and partial Done stays open', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    '# Leaf\n\n**State: Done.**\n',
  );
  const done = scan(fx);
  assert.equal(
    codes(done).includes('terminal-open:work/changes/open/leaf/CHANGE.md'),
    true,
  );
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    '# Leaf\n\n**State: Done for A; B blocked.**\n',
  );
  const partial = scan(fx);
  fx.cleanup();
  assert.equal(
    partial.findings.some((item) => item.code === 'terminal-open'),
    false,
  );
});

test('lean checkout is unavailable rather than a full-repo failure', () => {
  const fx = fixture();
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    '# Leaf\n\nBroken [missing](./missing.md).\n',
  );
  const report = scan(fx, {
    available: true,
    complete: false,
    reason: 'Integrity gate unavailable. Lean export.',
    sha: null,
    dirty: null,
  });
  fx.cleanup();
  assert.match(report.unavailable, /unavailable/i);
  assert.deepEqual(report.findings, []);
});

test('newer cited source is a review candidate and a ledger line can clear it', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('packages/engine/src/time.ts', 'export {}\n');
  fx.add(
    'STATUS.md',
    '# Status\n\nThe clock lives in `packages/engine/src/time.ts`.\n',
  );
  const history = {
    available: true,
    commits: {
      'STATUS.md': { sha: 'owner111', at: '2026-01-01T00:00:00Z' },
      'packages/engine/src/time.ts': { sha: 'source222', at: '2026-11-01T00:00:00Z' },
    },
    dirty: [],
    uncited: [],
  };
  const open = scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: 'scan333', dirty: false },
    history,
    now: '2026-11-18T00:00:00Z',
  });
  const hit = open.candidates.find((item) => item.code === 'needs-revalidation');
  assert.equal(hit.path, 'STATUS.md');
  assert.equal(hit.dependency, 'packages/engine/src/time.ts');
  assert.equal(hit.ownerSha, 'owner111');
  assert.equal(hit.sourceSha, 'source222');
  assert.equal(hit.severity, 'warning');
  fx.add(
    'work/changes/open/leaf/CHANGE.md',
    '# Leaf\n\n**State: Done for A; B blocked.**\n\nunchanged because STATUS.md still matches packages/engine/src/time.ts\n',
  );
  const cleared = scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: 'scan333', dirty: false },
    history,
    now: '2026-11-18T00:00:00Z',
  });
  fx.cleanup();
  assert.equal(cleared.candidates.some((item) => item.code === 'needs-revalidation' && item.path === 'STATUS.md'), false);
  assert.equal(cleared.cleared.some((item) => item.dependency === 'packages/engine/src/time.ts'), true);
});

test('old stable contract is not a hard stale failure and an uncited source is a blind spot', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('docs/product/time.md', '# Time\n\nSee `packages/engine/src/time.ts`.\n');
  fx.add('packages/engine/src/time.ts', 'export {}\n');
  fx.add('packages/engine/src/new-file.ts', 'export {}\n');
  const report = scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: 'scan333', dirty: false },
    history: {
      available: true,
      commits: {
        'docs/product/time.md': { sha: 'doc444', at: '2026-07-01T00:00:00Z' },
        'packages/engine/src/time.ts': { sha: 'src444', at: '2026-06-01T00:00:00Z' },
      },
      dirty: [],
      uncited: ['packages/engine/src/new-file.ts'],
    },
    now: '2026-11-18T00:00:00Z',
  });
  fx.cleanup();
  assert.equal(report.findings.some((item) => item.severity === 'error' && item.path === 'docs/product/time.md'), false);
  assert.equal(report.candidates.some((item) => item.code === 'needs-revalidation' && item.path === 'docs/product/time.md'), false);
  const age = report.provenance.find((item) => item.path === 'docs/product/time.md');
  assert.ok(age.ageDays >= 120);
  assert.equal(age.cohort, 90);
  const blind = report.candidates.filter((item) => item.code === 'no-known-route');
  assert.deepEqual(blind.map((item) => item.path), ['packages/engine/src/new-file.ts']);
});

test('dirty or missing history is not a fresh zero-age claim', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('STATUS.md', '# Status\n\nSee `packages/engine/src/time.ts`.\n');
  const dirty = scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: 'scan333', dirty: true },
    history: {
      available: true,
      commits: {
        'STATUS.md': { sha: 'owner111', at: '2026-11-17T00:00:00Z' },
        'packages/engine/src/time.ts': { sha: 'source222', at: '2026-11-18T00:00:00Z' },
      },
      dirty: ['packages/engine/src/time.ts'],
      uncited: [],
      present: () => false,
    },
    now: '2026-11-18T00:00:00Z',
  });
  assert.equal(dirty.candidates.some((item) => item.code === 'unknown-provenance' && item.dependency === 'packages/engine/src/time.ts'), true);
  assert.equal(dirty.candidates.some((item) => item.code === 'needs-revalidation'), false);
  const shallow = scanMaintenance({
    root: fx.root,
    files: fx.files(),
    readText: fx.readText,
    git: { available: true, complete: true, sha: null, dirty: null },
    history: { available: false, commits: {}, dirty: [], uncited: [] },
    now: '2026-11-18T00:00:00Z',
  });
  fx.cleanup();
  assert.equal(shallow.historyStatus, 'unavailable');
  assert.equal(shallow.candidates.some((item) => item.ageDays === 0), false);
  assert.equal(shallow.provenance.length, 0);
});

test('missing Git is unavailable rather than green', () => {
  const fx = fixture();
  baseFiles(fx);
  const report = scan(fx, { available: false, complete: false, reason: 'Integrity gate unavailable. No Git.' });
  fx.cleanup();
  assert.match(report.unavailable, /unavailable/i);
  assert.equal(report.complete, false);
});

test('strict maintenance detects free-floating planning files but accepts owned packets/templates', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/changes/NEW-AUDIT.md', '# Unowned audit\n');
  fx.add('work/undertakings/UNOWNED-HANDOFF.md', '# Unowned handoff\n');
  fx.add('work/tasks/TEMPLATE.md', '# Task template\n');
  const report = scan(fx);
  assert.ok(codes(report).includes('unowned-work-document:work/changes/NEW-AUDIT.md'));
  assert.ok(codes(report).includes('unowned-work-document:work/undertakings/UNOWNED-HANDOFF.md'));
  assert.ok(!codes(report).some(x => x.includes('work/tasks/TEMPLATE.md')));
  fx.cleanup();
});

test('unexpected root work roadmap is a placement error, not a second selector', () => {
  const fx = fixture();
  baseFiles(fx);
  fx.add('work/SECOND-ROADMAP.md', '# Some competing priorities\n');
  assert.ok(codes(scan(fx)).includes('unowned-work-document:work/SECOND-ROADMAP.md'));
  fx.cleanup();
});

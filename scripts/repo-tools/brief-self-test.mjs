import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectCheckout, healthSummary, receiptFrom, renderHuman, selectedWorkFromQueue, statusPaths } from './brief.mjs';

function git(cwd, args) {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=Brief Test', '-c', 'user.email=brief@example.com', ...args],
    { cwd, encoding: 'utf8', shell: false },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'git failed').trim());
  }
}

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'brief-'));
  git(dir, ['init']);
  writeFileSync(path.join(dir, 'note.txt'), 'one\n');
  git(dir, ['add', 'note.txt']);
  git(dir, ['commit', '-m', 'one']);
  return dir;
}

export function runBriefSelfTest() {
  const clean = repo();
  try {
    const checkout = collectCheckout(clean);
    const receipt = receiptFrom(checkout, null);
    assert.equal(receipt.schema, 'repo.brief.v2');
    assert.equal(receipt.work, null);
    assert.equal(receipt.workKind, null);
    assert.equal(receipt.environment, 'local-checkout');
    assert.match(receipt.sha, /^[0-9a-f]{40}$/);
    assert.equal(receipt.dirty, false);
    assert.deepEqual(receipt.paths, []);
    assert.equal(receipt.change, null);
    assert.equal(receipt.detached, false);
    assert.equal(JSON.stringify(receipt).includes('OPENROUTER'), false);
    assert.equal('checkpoint' in receipt, false);

    writeFileSync(path.join(clean, 'note.txt'), 'two\n');
    writeFileSync(path.join(clean, 'extra.txt'), 'new\n');
    const dirty = receiptFrom(collectCheckout(clean), 'work/changes/open/example/CHANGE.md', 'checkpoint text');
    assert.equal(dirty.dirty, true);
    assert.equal(dirty.workKind, 'change');
    assert.equal(dirty.work, 'work/changes/open/example/CHANGE.md');
    assert.ok(dirty.paths.includes('note.txt'));
    assert.ok(dirty.paths.includes('extra.txt'));
    assert.equal(dirty.checkpoint, 'checkpoint text');
    assert.equal(JSON.stringify(dirty).includes('two'), false);

    git(clean, ['add', 'note.txt']);
    git(clean, ['commit', '-m', 'two']);
    git(clean, ['checkout', '--detach', 'HEAD~1']);
    const detached = receiptFrom(collectCheckout(clean), null);
    assert.equal(detached.detached, true);
    assert.equal(detached.branch, null);
    assert.match(detached.sha, /^[0-9a-f]{40}$/);

    const missing = mkdtempSync(path.join(tmpdir(), 'brief-nogit-'));
    assert.throws(() => collectCheckout(missing), /not a git repository|Git is unavailable|fatal/i);
    rmSync(missing, { recursive: true, force: true });

    const many = Array.from({ length: 41 }, (_, index) => `?? file-${index}.txt`).join('\n');
    const capped = statusPaths(many);
    assert.equal(capped.paths.length, 40);
    assert.equal(capped.truncated, true);

    const renamed = statusPaths('R  old.txt -> new file.txt');
    assert.deepEqual(renamed.paths, ['new file.txt']);

    // One central selector, across both packet types. No second Change-only pointer.
    assert.equal(selectedWorkFromQueue('Current work: none\n'), null);
    assert.equal(
      selectedWorkFromQueue('Current work: [change](changes/open/leaf/CHANGE.md)\n'),
      'work/changes/open/leaf/CHANGE.md',
    );
    const taskPath = 'work/tasks/open/2026-11-20--test-run/TASK.md';
    assert.equal(
      selectedWorkFromQueue('Current work: [test run](tasks/open/2026-11-20--test-run/TASK.md)\n'),
      taskPath,
    );
    const taskReceipt = receiptFrom(collectCheckout(clean), taskPath);
    assert.equal(taskReceipt.work, taskPath);
    assert.equal(taskReceipt.workKind, 'task');
    assert.equal(taskReceipt.change, null);
    assert.throws(() => selectedWorkFromQueue('Current work: none\nCurrent work: none\n'), /exactly one/);
    assert.throws(() => selectedWorkFromQueue('Current work: [bad](tasks/archive/old/TASK.md)'), /open/);
    assert.throws(() => selectedWorkFromQueue('Current work: [bad](changes/open/leaf/TASKS.md)'), /open/);
    assert.throws(() => selectedWorkFromQueue(
      'Current work: [missing](tasks/open/missing/TASK.md)',
      () => false,
    ), /missing/);

    const receiptKeys = Object.keys(receiptFrom(collectCheckout(clean), null)).sort();
    assert.deepEqual(receiptKeys, [
      'branch',
      'change',
      'detached',
      'dirty',
      'environment',
      'paths',
      'pathsTruncated',
      'schema',
      'sha',
      'work',
      'workKind',
    ]);
    const concise = renderHuman({
      branch: 'change/wr03-workdesk',
      sha: 'a'.repeat(40),
      status: ' M packages/example.ts',
      log: 'unrelated historical log',
    }, 'VERY-LONG-HISTORICAL-ORIENTATION', null);
    assert.match(concise, /change\/wr03-workdesk/);
    assert.match(concise, /Current work \(global queue\): none/);
    assert.equal(concise.includes('VERY-LONG-HISTORICAL-ORIENTATION'), false);
    assert.equal(concise.includes('unrelated historical log'), false);
    assert.ok(concise.split('\\n').length < 20);

    const full = renderHuman({
      branch: 'change/wr03-workdesk',
      sha: 'a'.repeat(40),
      status: '',
      log: 'last commit',
    }, 'HISTORICAL-ORIENTATION', null, undefined, { full: true });
    assert.match(full, /HISTORICAL-ORIENTATION/);
    assert.match(full, /last commit/);

    const summary = healthSummary({
      top3: [
        { code: 'needs-revalidation', path: 'STATUS.md', dependency: 'packages/engine/src/time.ts', suggestion: 'pnpm repo:maintenance' },
        { code: 'inactive-open-work', path: 'work/changes/open/example/CHANGE.md' },
        { code: 'no-known-route', path: 'packages/new/src/file.ts' },
        { code: 'extra', path: 'should-not-show.md' },
      ],
    });
    assert.equal(summary.split('\n').filter((line) => line.startsWith('needs-revalidation') || line.startsWith('inactive') || line.startsWith('no-known')).length, 3);
    assert.equal(summary.includes('should-not-show.md'), false);
  } finally {
    rmSync(clean, { recursive: true, force: true });
  }
  console.log(
    'Brief self-test passed: clean SHA, dirty paths, untracked file, detached HEAD, missing Git, path cap, no file contents.',
  );
}

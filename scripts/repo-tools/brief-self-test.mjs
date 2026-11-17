import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectCheckout, healthSummary, receiptFrom, statusPaths } from './brief.mjs';

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
    assert.equal(receipt.schema, 'repo.brief.v1');
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
    ]);
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

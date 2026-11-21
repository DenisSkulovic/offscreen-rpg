import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkChangeBranch, main } from './change-branch-guard.mjs';

function git(cwd, ...args) { return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim(); }
function fixture(fn) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'offscreen-branch-'));
  try {
    git(cwd, 'init', '-q', '-b', 'main');
    git(cwd, 'config', 'user.email', 'fixture@example.invalid');
    git(cwd, 'config', 'user.name', 'Fixture');
    writeFileSync(path.join(cwd, 'README.md'), 'main\n');
    git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'initial');
    git(cwd, 'branch', 'undertaking/storyteller-workshop');
    git(cwd, 'switch', '-q', 'undertaking/storyteller-workshop');
    writeFileSync(path.join(cwd, 'README.md'), 'undertaking\n');
    git(cwd, 'commit', '-qam', 'undertaking work');
    const wt = path.join(path.dirname(cwd), path.basename(cwd) + '-linked');
    let linked = false;
    const add = (name, base = 'undertaking/storyteller-workshop') => {
      git(cwd, 'worktree', 'add', '-q', '-b', name, wt, base);
      linked = true;
      return wt;
    };
    try { return fn(cwd, add); }
    finally { if (linked) git(cwd, 'worktree', 'remove', '--force', wt); rmSync(wt, { recursive: true, force: true }); }
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}
const target = 'undertaking/storyteller-workshop';
test('dedicated Change branch from current reference passes', () => fixture(cwd => {
  git(cwd, 'switch', '-qc', 'change/wr03-workdesk');
  const result = checkChangeBranch({ cwd, change: 'WR03', target });
  assert.equal(result.branch, 'change/wr03-workdesk');
  assert.equal(result.targetAdvanced, false);
}));
test('shared integration checkout is refused', () => fixture(cwd => {
  assert.throws(() => checkChangeBranch({ cwd, change: 'WR03', target }), /Expected dedicated/);
}));
test('unrelated Change branch and missing target are refused', () => fixture(cwd => {
  git(cwd, 'switch', '-qc', 'change/wr04-research');
  assert.throws(() => checkChangeBranch({ cwd, change: 'WR03', target }), /Expected dedicated/);
  assert.equal(main(['--change', 'WR04', '--target', 'does-not-exist'], cwd), 1);
}));
test('branch from main is refused for Undertaking target', () => fixture(cwd => {
  git(cwd, 'switch', '-q', 'main');
  git(cwd, 'switch', '-qc', 'change/wr03-workdesk');
  assert.throws(() => checkChangeBranch({ cwd, change: 'WR03', target }), /stale\/wrong base/);
}));
test('advanced integration target requires explicit resume flag', () => fixture(cwd => {
  git(cwd, 'switch', '-qc', 'change/wr03-workdesk');
  git(cwd, 'switch', '-q', target);
  writeFileSync(path.join(cwd, 'README.md'), 'parallel arrival\n');
  git(cwd, 'commit', '-qam', 'concurrent');
  git(cwd, 'switch', '-q', 'change/wr03-workdesk');
  assert.throws(() => checkChangeBranch({ cwd, change: 'WR03', target }), /moved/);
  const r = checkChangeBranch({ cwd, change: 'WR03', target, resume: true });
  assert.equal(r.targetAdvanced, true);
}));

test('even a Change-named branch in the primary checkout is rejected', () => fixture(cwd => {
  git(cwd, 'switch', '-qc', 'change/wr03-workdesk');
  assert.throws(() => checkChangeBranch({ cwd, change: 'WR03', target }), /Primary checkout/);
}));

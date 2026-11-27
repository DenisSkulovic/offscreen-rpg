/* global process, URL */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkChangeBranch } from './change-branch-guard.mjs';
import {
  assessArchival,
  assessJoin,
  changePacketPaths,
  ensureDesignImplementationBranch,
  integrateChange,
  lookupCommission,
  retireChangeWorktree,
} from './change-lifecycle.mjs';

const script = fileURLToPath(
  new URL('./change-lifecycle.mjs', import.meta.url),
);

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function commitFile(cwd, name, body, message) {
  writeFileSync(path.join(cwd, name), body);
  git(cwd, 'add', name);
  git(cwd, 'commit', '-qm', message);
  return git(cwd, 'rev-parse', 'HEAD');
}
async function repo(fn) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'offscreen-life-'));
  const created = [];
  const add = (name, base, { existing = false } = {}) => {
    const dir = path.join(
      path.dirname(cwd),
      `${path.basename(cwd)}-${created.length}`,
    );
    const args = existing
      ? ['worktree', 'add', '-q', dir, name]
      : ['worktree', 'add', '-q', '-b', name, dir, base];
    git(cwd, ...args);
    created.push(dir);
    return dir;
  };
  try {
    git(cwd, 'init', '-q', '-b', 'main');
    git(cwd, 'config', 'user.email', 'fixture@example.invalid');
    git(cwd, 'config', 'user.name', 'Fixture');
    git(cwd, 'config', 'commit.gpgsign', 'false');
    writeFileSync(path.join(cwd, 'README.md'), 'main\n');
    git(cwd, 'add', '.');
    git(cwd, 'commit', '-qm', 'initial');
    return await fn(cwd, add);
  } finally {
    for (const dir of created.reverse()) {
      try {
        git(dir, 'merge', '--abort');
      } catch {
        /* no merge in this checkout */
      }
      try {
        git(cwd, 'worktree', 'remove', '--force', dir);
      } catch {
        /* already retired */
      }
      rmSync(dir, { recursive: true, force: true });
    }
    rmSync(cwd, { recursive: true, force: true });
  }
}
function cli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
function baseJoin(extra) {
  return {
    recordedTarget: 'implementation/demo',
    requestedTarget: 'implementation/demo',
    design: 'demo',
    indispensable: 'pass',
    designAcceptance: 'pending',
    permitSourceJoin: true,
    constituent: true,
    ...extra,
  };
}

test('join policy refuses the wrong target, failed proof, and premature main', () => {
  assert.match(
    assessJoin(baseJoin({ requestedTarget: 'main' })).reason,
    /Wrong integration target/,
  );
  assert.match(
    assessJoin(baseJoin({ indispensable: 'fail' })).reason,
    /Indispensable Change-level proof is fail/,
  );
  assert.match(
    assessJoin(baseJoin({ indispensable: 'pending' })).reason,
    /pending/,
  );
  assert.match(
    assessJoin(
      baseJoin({
        recordedTarget: 'main',
        requestedTarget: 'main',
      }),
    ).reason,
    /cannot integrate into main/,
  );
  assert.match(
    assessJoin(baseJoin({ permitSourceJoin: false })).reason,
    /does not permit an isolated source join/,
  );
  assert.equal(assessJoin(baseJoin()).allow, true);
  assert.equal(assessJoin(baseJoin()).mode, 'merge');
  assert.match(
    assessJoin(
      baseJoin({
        constituent: false,
        designClosure: true,
        designAcceptance: 'pending',
        permitSourceJoin: true,
        recordedTarget: 'main',
        requestedTarget: 'main',
      }),
    ).reason,
    /has not passed/,
  );
  const closure = assessJoin(
    baseJoin({
      constituent: false,
      designClosure: true,
      designAcceptance: 'passed',
      recordedTarget: 'main',
      requestedTarget: 'main',
    }),
  );
  assert.equal(closure.allow, true);
  assert.equal(
    assessJoin({
      recordedTarget: 'main',
      requestedTarget: 'main',
      indispensable: 'pass',
      constituent: true,
    }).mode,
    'squash',
  );
});

test('two independent Changes branch from one target and their joins keep both updates', async () =>
  repo(async (cwd, add) => {
    const created = ensureDesignImplementationBranch({
      cwd,
      design: 'demo',
      base: 'main',
    });
    assert.equal(created.branch, 'implementation/demo');
    assert.equal(created.created, true);
    const integration = add('implementation/demo', 'main', { existing: true });
    const first = add('change/aaa-one', 'implementation/demo');
    const second = add('change/bbb-two', 'implementation/demo');
    assert.equal(
      checkChangeBranch({
        cwd: first,
        change: 'AAA',
        target: 'implementation/demo',
        design: 'demo',
      }).targetAdvanced,
      false,
    );
    assert.equal(
      checkChangeBranch({
        cwd: second,
        change: 'BBB',
        target: 'implementation/demo',
        design: 'demo',
      }).targetAdvanced,
      false,
    );
    commitFile(first, 'a.txt', 'a\n', 'add a');
    commitFile(second, 'b.txt', 'b\n', 'add b');
    const trace = path.join(cwd, 'trace.txt');
    const common = {
      target: 'implementation/demo',
      'recorded-target': 'implementation/demo',
      'integration-cwd': integration,
      design: 'demo',
      indispensable: 'pass',
      'design-acceptance': 'pending',
      'permit-source-join': true,
      'hold-ms': '200',
      trace,
    };
    const args = (change, changeCwd, line) => [
      'integrate',
      '--change',
      change,
      '--change-cwd',
      changeCwd,
      '--ledger-append',
      line,
      ...Object.entries(common).flatMap(([key, value]) => [
        `--${key}`,
        String(value),
      ]),
    ];
    const [left, right] = await Promise.all([
      cli(args('AAA', first, 'aaa')),
      cli(args('BBB', second, 'bbb')),
    ]);
    assert.equal(left.code, 0, left.stderr);
    assert.equal(right.code, 0, right.stderr);
    assert.equal(readFileSync(path.join(integration, 'a.txt'), 'utf8'), 'a\n');
    assert.equal(readFileSync(path.join(integration, 'b.txt'), 'utf8'), 'b\n');
    const ledger = readFileSync(path.join(integration, 'LEDGER'), 'utf8');
    assert.match(ledger, /aaa/);
    assert.match(ledger, /bbb/);
    const events = readFileSync(trace, 'utf8').trim().split('\n');
    let open = null;
    for (const event of events) {
      const [pid, kind] = event.split(' ');
      if (kind === 'enter') {
        assert.equal(open, null, events.join(' | '));
        open = pid;
      } else {
        assert.equal(kind, 'leave');
        assert.equal(open, pid);
        open = null;
      }
    }
    assert.equal(open, null);
    const target = git(integration, 'rev-parse', 'HEAD');
    assert.equal(
      git(
        cwd,
        'merge-base',
        '--is-ancestor',
        git(first, 'rev-parse', 'HEAD'),
        target,
      ),
      '',
    );
    retireChangeWorktree({
      repoCwd: cwd,
      changeCwd: first,
      target: 'implementation/demo',
      branch: 'change/aaa-one',
    });
    assert.equal(existsSync(first), false);
    assert.throws(
      () => git(cwd, 'rev-parse', '--verify', 'refs/heads/change/aaa-one'),
      /unknown revision|Needed a single revision/,
    );
  }));

test('a dependent Change has to use the target that already contains its predecessor', () =>
  repo((cwd, add) => {
    ensureDesignImplementationBranch({ cwd, design: 'demo', base: 'main' });
    const integration = add('implementation/demo', 'main', { existing: true });
    const early = add('change/ccc-early', 'implementation/demo');
    const predecessor = add('change/ddd-pred', 'implementation/demo');
    const predecessorSha = commitFile(
      predecessor,
      'pred.txt',
      'pred\n',
      'predecessor',
    );
    assert.throws(
      () =>
        integrateChange({
          ...baseJoin({
            change: 'CCC',
            integrationCwd: integration,
            changeCwd: early,
            requireAncestors: [predecessorSha],
          }),
          target: 'implementation/demo',
        }),
      /Predecessor/,
    );
    assert.equal(git(integration, 'rev-parse', 'HEAD'), createdBase(cwd));
    integrateChange({
      ...baseJoin({
        change: 'DDD',
        integrationCwd: integration,
        changeCwd: predecessor,
      }),
      target: 'implementation/demo',
    });
    assert.throws(
      () =>
        checkChangeBranch({
          cwd: early,
          change: 'CCC',
          target: 'implementation/demo',
          design: 'demo',
        }),
      /stale\/wrong base/,
    );
    const later = add('change/ccc-later', 'implementation/demo');
    const guard = checkChangeBranch({
      cwd: later,
      change: 'CCC',
      target: 'implementation/demo',
      design: 'demo',
    });
    assert.equal(guard.base, guard.targetSha);
    assert.equal(
      git(later, 'merge-base', '--is-ancestor', predecessorSha, 'HEAD'),
      '',
    );
    commitFile(later, 'later.txt', 'later\n', 'dependent');
    const joined = integrateChange({
      ...baseJoin({
        change: 'CCC',
        integrationCwd: integration,
        changeCwd: later,
        requireAncestors: [predecessorSha],
      }),
      target: 'implementation/demo',
    });
    assert.equal(
      git(cwd, 'merge-base', '--is-ancestor', predecessorSha, joined.targetSha),
      '',
    );
    assert.equal(
      readFileSync(path.join(integration, 'pred.txt'), 'utf8'),
      'pred\n',
    );
    assert.equal(
      readFileSync(path.join(integration, 'later.txt'), 'utf8'),
      'later\n',
    );
  }));

test('dirty or unintegrated worktrees stay, and a permitted source join can retire', () =>
  repo((cwd, add) => {
    ensureDesignImplementationBranch({ cwd, design: 'demo', base: 'main' });
    const integration = add('implementation/demo', 'main', { existing: true });
    const change = add('change/eee-work', 'implementation/demo');
    commitFile(change, 'e.txt', 'e\n', 'change');
    writeFileSync(path.join(change, 'dirty.txt'), 'dirty\n');
    assert.throws(
      () =>
        retireChangeWorktree({
          repoCwd: cwd,
          changeCwd: change,
          target: 'implementation/demo',
        }),
      /Dirty worktree cannot be retired/,
    );
    assert.equal(existsSync(change), true);
    git(change, 'checkout', '--', '.');
    git(change, 'clean', '-qf', 'dirty.txt');
    // untracked removal: clean -q path may not remove untracked with that form
    rmSync(path.join(change, 'dirty.txt'), { force: true });
    assert.throws(
      () =>
        retireChangeWorktree({
          repoCwd: cwd,
          changeCwd: change,
          target: 'implementation/demo',
        }),
      /Unintegrated worktree cannot be retired/,
    );
    assert.equal(existsSync(path.join(cwd, '.git')), true);
    const before = git(integration, 'rev-parse', 'HEAD');
    assert.throws(
      () =>
        integrateChange({
          ...baseJoin({
            change: 'EEE',
            integrationCwd: integration,
            changeCwd: change,
            indispensable: 'fail',
          }),
          target: 'implementation/demo',
        }),
      /Indispensable Change-level proof is fail/,
    );
    assert.equal(git(integration, 'rev-parse', 'HEAD'), before);
    assert.throws(
      () =>
        integrateChange({
          ...baseJoin({
            change: 'EEE',
            integrationCwd: integration,
            changeCwd: change,
            recordedTarget: 'main',
            requestedTarget: 'main',
          }),
          target: 'main',
        }),
      /Wrong integration target|cannot integrate into main/,
    );
    const joined = integrateChange({
      ...baseJoin({
        change: 'EEE',
        integrationCwd: integration,
        changeCwd: change,
      }),
      target: 'implementation/demo',
    });
    assert.notEqual(joined.targetSha, before);
    assert.match(joined.target, /implementation\/demo/);
    retireChangeWorktree({
      repoCwd: cwd,
      changeCwd: change,
      target: 'implementation/demo',
      branch: 'change/eee-work',
    });
    assert.equal(existsSync(change), false);
  }));

test('final design integration waits for acceptance and refuses a constituent branch', () =>
  repo((cwd, add) => {
    const implementation = ensureDesignImplementationBranch({
      cwd,
      design: 'demo',
      base: 'main',
    });
    const source = add('implementation/demo', 'main', { existing: true });
    commitFile(source, 'design.txt', 'design\n', 'design work');
    git(cwd, 'branch', 'trunk', 'main');
    const trunk = add('trunk', 'main', { existing: true });
    assert.throws(
      () =>
        integrateChange({
          changeCwd: source,
          integrationCwd: trunk,
          design: 'demo',
          constituent: false,
          designClosure: true,
          recordedTarget: 'trunk',
          requestedTarget: 'trunk',
          indispensable: 'pass',
          designAcceptance: 'pending',
          permitSourceJoin: true,
          target: 'trunk',
        }),
      /has not passed/,
    );
    assert.equal(
      git(trunk, 'rev-parse', 'HEAD'),
      git(cwd, 'rev-parse', 'main'),
    );
    const change = add('change/fff-part', implementation.sha);
    commitFile(change, 'part.txt', 'part\n', 'part');
    assert.throws(
      () =>
        integrateChange({
          change: 'FFF',
          changeCwd: change,
          integrationCwd: trunk,
          design: 'demo',
          constituent: false,
          designClosure: true,
          recordedTarget: 'trunk',
          requestedTarget: 'trunk',
          indispensable: 'pass',
          designAcceptance: 'passed',
          target: 'trunk',
        }),
      /not a constituent|not 'change\/fff-part'|Design closure integrates/,
    );
    const closed = integrateChange({
      changeCwd: source,
      integrationCwd: trunk,
      design: 'demo',
      constituent: false,
      designClosure: true,
      recordedTarget: 'trunk',
      requestedTarget: 'trunk',
      indispensable: 'pass',
      designAcceptance: 'passed',
      target: 'trunk',
    });
    assert.equal(
      readFileSync(path.join(trunk, 'design.txt'), 'utf8'),
      'design\n',
    );
    assert.equal(
      git(
        cwd,
        'merge-base',
        '--is-ancestor',
        closed.sourceSha,
        closed.targetSha,
      ),
      '',
    );
  }));

test('an existing implementation branch is kept and a missing grandfather is not invented', () =>
  repo((cwd, add) => {
    const first = ensureDesignImplementationBranch({
      cwd,
      design: 'demo',
      base: 'main',
    });
    assert.equal(first.created, true);
    const checkout = add('implementation/demo', 'main', { existing: true });
    const advanced = commitFile(checkout, 'kept.txt', 'kept\n', 'keep');
    assert.notEqual(first.sha, advanced);
    const second = ensureDesignImplementationBranch({
      cwd,
      design: 'demo',
      base: 'main',
    });
    assert.equal(second.created, false);
    assert.equal(second.sha, advanced);
    assert.throws(
      () =>
        ensureDesignImplementationBranch({
          cwd,
          design: 'other',
          grandfather: 'integration/missing',
          base: 'main',
        }),
      /does not exist/,
    );
    assert.throws(() =>
      git(cwd, 'rev-parse', '--verify', 'refs/heads/implementation/other'),
    );
  }));

function createdBase(cwd) {
  return git(cwd, 'rev-parse', 'refs/heads/implementation/demo');
}

test('a standalone squash join retires only after the landed tree is verified', () =>
  repo((cwd, add) => {
    git(cwd, 'branch', 'trunk', 'main');
    const trunk = add('trunk', 'main', { existing: true });
    const change = add('change/ggg-solo', 'trunk');
    commitFile(change, 'solo.txt', 'solo\n', 'solo');
    const joined = integrateChange({
      change: 'GGG',
      changeCwd: change,
      integrationCwd: trunk,
      recordedTarget: 'trunk',
      requestedTarget: 'trunk',
      indispensable: 'pass',
      constituent: true,
      target: 'trunk',
    });
    assert.equal(joined.mode, 'squash');
    assert.equal(readFileSync(path.join(trunk, 'solo.txt'), 'utf8'), 'solo\n');
    assert.throws(
      () =>
        retireChangeWorktree({
          repoCwd: cwd,
          changeCwd: change,
          target: 'trunk',
        }),
      /Unintegrated worktree cannot be retired/,
    );
    retireChangeWorktree({
      repoCwd: cwd,
      changeCwd: change,
      target: 'trunk',
      branch: 'change/ggg-solo',
      landedSha: joined.targetSha,
    });
    assert.equal(existsSync(change), false);
  }));

const LEAF = '2026-11-27--obs-d03-operation-custody';

function seedOpenPacket(cwd) {
  const dir = path.join(cwd, 'work/changes/open', LEAF);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'CHANGE.md'), '**State:** Implementing\n');
  git(cwd, 'add', 'work');
  git(cwd, 'commit', '-m', 'open packet');
}

function archivePacket(cwd) {
  const paths = changePacketPaths(LEAF);
  mkdirSync(path.dirname(path.join(cwd, paths.archived)), { recursive: true });
  git(cwd, 'mv', paths.open, paths.archived);
  const note = path.join(cwd, 'work/designs/open/demo/OBLIGATIONS.md');
  mkdirSync(path.dirname(note), { recursive: true });
  writeFileSync(note, 'Joint proof remains on the Design.\n');
  git(cwd, 'add', 'work');
  git(cwd, 'commit', '-m', 'archive the completed Change');
}

test('a completed constituent is archived on the implementation branch while main keeps the open packet', () =>
  repo((cwd, add) => {
    seedOpenPacket(cwd);
    const implementation = ensureDesignImplementationBranch({
      cwd,
      design: 'demo',
      base: 'main',
    });
    const integration = add('implementation/demo', 'main', { existing: true });
    const change = add('change/hhh-close', implementation.sha);
    archivePacket(change);
    const before = git(integration, 'rev-parse', 'HEAD');
    assert.throws(
      () =>
        integrateChange({
          change: 'HHH',
          changeCwd: change,
          integrationCwd: integration,
          design: 'demo',
          recordedTarget: 'implementation/demo',
          requestedTarget: 'implementation/demo',
          indispensable: 'pass',
          designAcceptance: 'pending',
          permitSourceJoin: true,
          leaf: LEAF,
          obligationsTransferred: false,
          target: 'implementation/demo',
        }),
      /transferred/,
    );
    assert.equal(git(integration, 'rev-parse', 'HEAD'), before);
    const joined = integrateChange({
      change: 'HHH',
      changeCwd: change,
      integrationCwd: integration,
      design: 'demo',
      recordedTarget: 'implementation/demo',
      requestedTarget: 'implementation/demo',
      indispensable: 'pass',
      designAcceptance: 'pending',
      permitSourceJoin: true,
      leaf: LEAF,
      obligationsTransferred: true,
      target: 'implementation/demo',
    });
    assert.equal(joined.closed, true);
    assert.equal(
      existsSync(path.join(integration, joined.archivedPacket)),
      true,
    );
    assert.equal(
      existsSync(path.join(integration, 'work/changes/open', LEAF)),
      false,
    );
    assert.equal(
      lookupCommission({
        repoCwd: cwd,
        target: 'implementation/demo',
        leaf: LEAF,
      }).status,
      'archived',
    );
    assert.equal(
      lookupCommission({ repoCwd: cwd, target: 'main', leaf: LEAF }).status,
      'open',
    );
    assert.throws(
      () =>
        integrateChange({
          change: 'HHH',
          changeCwd: change,
          integrationCwd: integration,
          design: 'demo',
          recordedTarget: 'implementation/demo',
          requestedTarget: 'implementation/demo',
          indispensable: 'pass',
          designAcceptance: 'pending',
          permitSourceJoin: true,
          leaf: LEAF,
          obligationsTransferred: true,
          target: 'implementation/demo',
        }),
      /already archived/,
    );
    retireChangeWorktree({
      repoCwd: cwd,
      changeCwd: change,
      target: 'implementation/demo',
      branch: 'change/hhh-close',
      leaf: LEAF,
    });
    assert.equal(existsSync(change), false);
  }));

test('unresolved Change-level work is not archived and an open packet cannot be reported complete', () =>
  repo((cwd, add) => {
    assert.equal(
      assessArchival({
        indispensable: 'pending',
        designAcceptance: 'pending',
        obligationsTransferred: true,
      }).allow,
      false,
    );
    assert.equal(assessArchival({ indispensable: 'fail' }).allow, false);
    seedOpenPacket(cwd);
    ensureDesignImplementationBranch({ cwd, design: 'demo', base: 'main' });
    const integration = add('implementation/demo', 'main', { existing: true });
    const change = add('change/iii-open', implementationSha(cwd));
    commitFile(change, 'code.txt', 'code\n', 'code');
    const before = git(integration, 'rev-parse', 'HEAD');
    assert.throws(
      () =>
        integrateChange({
          change: 'III',
          changeCwd: change,
          integrationCwd: integration,
          design: 'demo',
          recordedTarget: 'implementation/demo',
          requestedTarget: 'implementation/demo',
          indispensable: 'pass',
          designAcceptance: 'pending',
          permitSourceJoin: true,
          leaf: LEAF,
          obligationsTransferred: true,
          target: 'implementation/demo',
        }),
      /must be archived/,
    );
    assert.equal(git(integration, 'rev-parse', 'HEAD'), before);
    assert.throws(
      () =>
        integrateChange({
          change: 'III',
          changeCwd: change,
          integrationCwd: integration,
          design: 'demo',
          recordedTarget: 'implementation/demo',
          requestedTarget: 'implementation/demo',
          indispensable: 'fail',
          designAcceptance: 'pending',
          permitSourceJoin: true,
          leaf: LEAF,
          obligationsTransferred: true,
          target: 'implementation/demo',
        }),
      /proof is fail/,
    );
    assert.equal(git(integration, 'rev-parse', 'HEAD'), before);
    const joined = integrateChange({
      change: 'III',
      changeCwd: change,
      integrationCwd: integration,
      design: 'demo',
      recordedTarget: 'implementation/demo',
      requestedTarget: 'implementation/demo',
      indispensable: 'pass',
      constituent: true,
      target: 'implementation/demo',
    });
    assert.equal(joined.closed, undefined);
    assert.equal(
      existsSync(
        path.join(integration, 'work/changes/open', LEAF, 'CHANGE.md'),
      ),
      true,
    );
    assert.throws(
      () =>
        retireChangeWorktree({
          repoCwd: cwd,
          changeCwd: change,
          target: 'implementation/demo',
          leaf: LEAF,
        }),
      /remains in open|Archived Change packet is absent/,
    );
    assert.equal(existsSync(change), true);
  }));

function implementationSha(cwd) {
  return git(cwd, 'rev-parse', 'refs/heads/implementation/demo');
}

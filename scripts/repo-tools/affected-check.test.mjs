import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPnpmTurboArgs,
  classifyChangedPath,
  collectGitScopeState,
  decideAffectedScope,
  isWorkspacePackageManifest,
  isRootGlobalInput,
  isTurboDryPlanInvocation,
  parseAffectedCliArgs,
  parseTurboDryRunJson,
  runAffectedCheckCli,
} from './affected-check.mjs';
import { isDocsPath } from './ci-change-scope.mjs';

function cleanScope(overrides = {}) {
  return decideAffectedScope({
    changedPaths: [],
    dirty: false,
    baseIsAncestor: true,
    missingRefs: false,
    ...overrides,
  });
}

function turboJson(tasks) {
  return `• turbo 2.10.13\n${JSON.stringify({ tasks })}`;
}

function isTurboExecution(args) {
  return (
    args[0] === 'exec' &&
    args[1] === 'turbo' &&
    args[2] === 'run' &&
    !args.includes('--dry=json')
  );
}

test('docs-only change selects zero code tasks', () => {
  const scope = cleanScope({
    changedPaths: [
      'docs/product/README.md',
      'work/changes/open/example/CHANGE.md',
      'AGENTS.md',
    ],
  });
  assert.equal(scope.mode, 'docs-only');
  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234'],
    invoke: combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['docs/product/README.md'],
    }),
  });
  const plan = JSON.parse(cli.stdout);
  assert.deepEqual(plan.codeTasks, []);
  assert.deepEqual(plan.selectedTaskIds, []);
});

test('story-engine source path selects reverse dependents from turbo dry plan', () => {
  const dependents = [
    {
      taskId: '@offscreen/story-engine#build',
      task: 'build',
      package: '@offscreen/story-engine',
    },
    {
      taskId: '@offscreen/api#build',
      task: 'build',
      package: '@offscreen/api',
    },
    {
      taskId: '@offscreen/worker#build',
      task: 'build',
      package: '@offscreen/worker',
    },
    {
      taskId: '@offscreen/game-authority#build',
      task: 'build',
      package: '@offscreen/game-authority',
    },
    {
      taskId: '@offscreen/api-integration#build',
      task: 'build',
      package: '@offscreen/api-integration',
    },
  ];

  const calls = [];
  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234', '--tasks', 'build'],
    invoke: combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['packages/story-engine/src/planner.ts'],
      affectedTurboStdout: turboJson(dependents),
      onPnpm: (args, env) => calls.push({ args, env }),
    }),
  });
  assert.equal(cli.exitCode, 0);
  const plan = JSON.parse(cli.stdout);
  assert.equal(plan.mode, 'affected');
  assert.equal(plan.turboMode, 'affected');
  assert.ok(plan.selectedPackages.includes('@offscreen/api'));
  assert.ok(plan.selectedPackages.includes('@offscreen/worker'));
  assert.ok(plan.selectedPackages.includes('@offscreen/game-authority'));
  assert.ok(plan.selectedPackages.includes('@offscreen/api-integration'));
  assert.equal(plan.dryRun.taskCount, 5);

  const affectedCall = calls.find((call) => call.args.includes('--affected'));
  assert.ok(affectedCall);
  assert.equal(affectedCall.env.TURBO_SCM_BASE, 'abc1234');
  assert.equal(affectedCall.env.TURBO_SCM_HEAD, 'def5678');
  assert.deepEqual(
    buildPnpmTurboArgs({ tasks: ['build'], affected: true, dryJson: true }),
    affectedCall.args,
  );
});

test('leaf apps/web-only path is affected not full', () => {
  const scope = cleanScope({
    changedPaths: ['apps/web/src/features/play/view.tsx'],
  });
  assert.equal(scope.mode, 'affected');
  assert.notEqual(scope.mode, 'full');

  const webTasks = [
    { taskId: '@offscreen/web#build', task: 'build', package: '@offscreen/web' },
    { taskId: '@offscreen/web#typecheck', task: 'typecheck', package: '@offscreen/web' },
  ];
  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234'],
    invoke: combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['apps/web/src/features/play/view.tsx'],
      affectedTurboStdout: turboJson(webTasks),
    }),
  });
  const plan = JSON.parse(cli.stdout);
  assert.equal(plan.mode, 'affected');
  assert.ok(!plan.selectedPackages.includes('@offscreen/db'));
  assert.ok(!plan.selectedTaskIds.some((id) => id.startsWith('@offscreen/db#')));
});

test('empty clean diff yields zero code tasks', () => {
  const scope = cleanScope({ changedPaths: [] });
  assert.equal(scope.mode, 'empty');
  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234'],
    invoke: combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: [],
      dirty: false,
      ancestor: true,
    }),
  });
  assert.equal(cli.exitCode, 0);
  const plan = JSON.parse(cli.stdout);
  assert.deepEqual(plan.codeTasks, []);
});

test('negative: dirty, untracked, missing base, non-ancestor => FULL', () => {
  assert.equal(cleanScope({ dirty: true }).mode, 'full');
  assert.equal(
    cleanScope({ dirty: 'dirty or untracked worktree' }).reason,
    'dirty or untracked worktree',
  );
  assert.equal(
    cleanScope({ missingRefs: 'missing git refs: deadbeef' }).mode,
    'full',
  );
  assert.equal(cleanScope({ baseIsAncestor: false }).mode, 'full');
  assert.equal(
    cleanScope({ baseIsAncestor: false }).reason,
    'base is not an ancestor of head',
  );

  const dirtyCli = runAffectedCheckCli({
    argv: ['--base', 'abc1234'],
    invoke: combinedInvoker({ base: 'abc1234', head: 'def5678', dirty: true }),
  });
  const dirtyPlan = JSON.parse(dirtyCli.stdout);
  assert.equal(dirtyPlan.mode, 'full');
  assert.equal(dirtyPlan.turboMode, 'full');
  assert.ok(!dirtyPlan.reason.includes('fell back'));

  const missingCli = runAffectedCheckCli({
    argv: ['--base', 'badref'],
    invoke: combinedInvoker({ missing: ['badref'] }),
  });
  assert.equal(JSON.parse(missingCli.stdout).mode, 'full');
});

test('negative: unknown path and lockfile => FULL', () => {
  assert.equal(
    cleanScope({ changedPaths: ['compose.yaml'] }).mode,
    'full',
  );
  assert.equal(
    cleanScope({ changedPaths: ['pnpm-lock.yaml'] }).mode,
    'full',
  );
  assert.equal(isRootGlobalInput('pnpm-lock.yaml'), true);
  assert.equal(isDocsPath('pnpm-lock.yaml'), false);
});

test('negative: deleted package manifest => FULL', () => {
  const scope = cleanScope({
    changedPaths: ['packages/removed/src/index.ts'],
    deletedPaths: ['packages/removed/package.json'],
  });
  assert.equal(scope.mode, 'full');
  assert.match(scope.reason, /deleted package manifest/);
});

test('grouped manifest deletion and rename select full scope', () => {
  assert.equal(
    isWorkspacePackageManifest('packages/platform/leaf/package.json'),
    true,
  );
  assert.equal(
    isWorkspacePackageManifest('packages/not-a-family/leaf/package.json'),
    false,
  );
  const removed = cleanScope({
    changedPaths: ['packages/platform/leaf/src/index.ts'],
    deletedPaths: ['packages/platform/leaf/package.json'],
  });
  assert.equal(removed.mode, 'full');
  assert.equal(removed.reason, 'deleted package manifest');
  const renamed = cleanScope({
    changedPaths: ['packages/ai/next/package.json'],
    renamedPaths: [
      {
        from: 'packages/ai/prior/package.json',
        to: 'packages/ai/next/package.json',
      },
    ],
  });
  assert.equal(renamed.mode, 'full');
  assert.equal(renamed.reason, 'package rename');
  const ordinary = cleanScope({
    changedPaths: ['packages/platform/leaf/src/index.ts'],
  });
  assert.equal(ordinary.mode, 'affected');
  assert.equal(ordinary.reason, 'workspace source change');
  const unrecognized = cleanScope({
    changedPaths: ['packages/not-a-family/leaf/package.json'],
    deletedPaths: ['packages/not-a-family/leaf/package.json'],
  });
  assert.equal(unrecognized.mode, 'affected');
  assert.equal(unrecognized.reason, 'workspace source change');
});

test('package rename => FULL', () => {
  const scope = cleanScope({
    changedPaths: [
      'packages/new-name/package.json',
      'packages/old-name/src/index.ts',
    ],
    renamedPaths: [
      { from: 'packages/old-name/package.json', to: 'packages/new-name/package.json' },
    ],
  });
  assert.equal(scope.mode, 'full');
  assert.equal(scope.reason, 'package rename');
});

test('unexpected flags are refused with non-zero exit', () => {
  const parsed = parseAffectedCliArgs(['--base', 'abc', '--verbose']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /unexpected flag/);

  const cli = runAffectedCheckCli({ argv: ['--base', 'abc', '--dry-run'] });
  assert.equal(cli.exitCode, 1);
  assert.match(cli.stderr, /unexpected flag/);
});

test('negative: malformed turbo JSON falls back to full mode', () => {
  const fullTasks = [
    { taskId: '@offscreen/web#build', task: 'build', package: '@offscreen/web' },
  ];
  const calls = [];
  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234', '--tasks', 'build'],
    invoke: combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['packages/story-engine/src/planner.ts'],
      affectedTurboStdout: '• turbo 2.10.13\n{not-valid-json',
      fullTurboStdout: turboJson(fullTasks),
      onPnpm: (args) => calls.push(args),
    }),
  });
  const plan = JSON.parse(cli.stdout);
  assert.equal(plan.mode, 'full');
  assert.equal(plan.turboMode, 'full');
  assert.match(plan.reason, /malformed turbo dry-run json/);
  assert.match(plan.reason, /fell back to full/);
  assert.equal(calls.filter((args) => args.includes('--affected')).length, 1);
  assert.equal(calls.filter((args) => !args.includes('--affected')).length, 1);
});

test('without --run there is zero turbo execution spawn', () => {
  let dryPlans = 0;
  let executions = 0;
  const invoke = (command, args, opts) => {
    if (command === 'pnpm') {
      if (isTurboDryPlanInvocation(args)) dryPlans += 1;
      if (isTurboExecution(args)) executions += 1;
      return {
        ok: true,
        stdout: turboJson([
          {
            taskId: '@offscreen/story-engine#build',
            task: 'build',
            package: '@offscreen/story-engine',
          },
        ]),
        status: 0,
      };
    }
    return combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['packages/story-engine/src/x.ts'],
    })(command, args, opts);
  };

  const cli = runAffectedCheckCli({ argv: ['--base', 'abc1234'], invoke });
  assert.equal(cli.exitCode, 0);
  assert.equal(executions, 0);
  assert.ok(dryPlans > 0);
  const plan = JSON.parse(cli.stdout);
  assert.equal(plan.run, false);
});

test('--run prints plan and executes turbo without dry json', () => {
  let executions = 0;
  const invoke = (command, args, opts) => {
    if (command === 'pnpm') {
      return {
        ok: true,
        stdout: turboJson([
          {
            taskId: '@offscreen/story-engine#build',
            task: 'build',
            package: '@offscreen/story-engine',
          },
        ]),
        status: 0,
      };
    }
    return combinedInvoker({
      base: 'abc1234',
      head: 'def5678',
      changed: ['packages/story-engine/src/x.ts'],
    })(command, args, opts);
  };

  const cli = runAffectedCheckCli({
    argv: ['--base', 'abc1234', '--run'],
    invoke,
    executeTurbo: (options) => {
      executions += 1;
      assert.equal(options.turboMode, 'affected');
      const args = buildPnpmTurboArgs({
        tasks: options.tasks,
        affected: true,
        dryJson: false,
      });
      assert.ok(isTurboExecution(args));
      return 0;
    },
  });
  assert.equal(cli.exitCode, 0);
  assert.equal(executions, 1);
  const plan = JSON.parse(cli.stdout);
  assert.equal(plan.run, true);
});

test('collectGitScopeState uses argument arrays via injected invoker', () => {
  const calls = [];
  const invoke = (command, args) => {
    calls.push([command, ...args]);
    return combinedInvoker({ base: 'aaa', head: 'bbb', changed: ['docs/x.md'] })(
      command,
      args,
    );
  };
  collectGitScopeState({ base: 'aaa', head: 'bbb', invoke });
  assert.ok(calls.every((call) => call[0] === 'git'));
  assert.ok(calls.some((call) => call.includes('merge-base')));
  assert.ok(calls.some((call) => call.includes('--is-ancestor')));
});

test('classifyChangedPath covers workspace, docs, and unknown', () => {
  assert.equal(classifyChangedPath('docs/foo.md'), 'docs');
  assert.equal(classifyChangedPath('packages/db/src/x.ts'), 'workspace');
  assert.equal(classifyChangedPath('infra/k8s.yaml'), 'unknown');
  assert.equal(
    classifyChangedPath('scripts/repo-tools/affected-check.mjs'),
    'root-global',
  );
});

test('parseTurboDryRunJson accepts leading turbo banner line', () => {
  const parsed = parseTurboDryRunJson(
    turboJson([
      { taskId: '@offscreen/web#build', task: 'build', package: '@offscreen/web' },
    ]),
  );
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.taskIds, ['@offscreen/web#build']);
});

/**
 * @param {object} config
 */
function combinedInvoker(config) {
  const git = gitInvoker(config);
  return (command, args, opts) => {
    if (command === 'git') return git(command, args, opts);
    if (command === 'pnpm') {
      config.onPnpm?.(args, opts?.env);
      if (args.includes('--affected')) {
        const stdout = config.affectedTurboStdout ?? turboJson([]);
        if (config.affectedTurboFail) {
          return { ok: false, stdout, stderr: 'bad', status: 1 };
        }
        return { ok: true, stdout, status: 0 };
      }
      const stdout = config.fullTurboStdout ?? turboJson([]);
      return { ok: true, stdout, status: 0 };
    }
    return { ok: false, status: 1, message: `unexpected command ${command}` };
  };
}

/**
 * @param {object} config
 */
function gitInvoker(config) {
  return (command, args) => {
    if (command !== 'git') {
      return { ok: false, status: 1, message: `unexpected command ${command}` };
    }

    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const ref = args[2];
      if (config.missing?.includes(ref)) {
        return { ok: false, status: 128, stderr: `fatal: Needed a single revision` };
      }
      if (ref === config.base || ref === config.head || ref === 'HEAD') {
        const sha = ref === 'HEAD' ? config.head ?? 'headsha' : ref;
        return { ok: true, stdout: `${sha}\n`, status: 0 };
      }
      return { ok: true, stdout: `${ref}\n`, status: 0 };
    }

    if (args[0] === 'merge-base' && args[1] === '--is-ancestor') {
      if (config.ancestor === false) {
        return { ok: false, status: 1, stdout: '' };
      }
      return { ok: true, status: 0, stdout: '' };
    }

    if (args[0] === 'status') {
      const dirty = config.dirty ?? false;
      return {
        ok: true,
        stdout: dirty ? ' M README.md\n' : '',
        status: 0,
      };
    }

    if (args[0] === 'diff' && args[2] === '--diff-filter=D') {
      const lines = (config.deleted ?? []).join('\n');
      return { ok: true, stdout: lines ? `${lines}\n` : '', status: 0 };
    }

    if (args[0] === 'diff' && args[1] === '--name-only') {
      const lines = (config.changed ?? []).join('\n');
      return { ok: true, stdout: lines ? `${lines}\n` : '', status: 0 };
    }

    if (args[0] === 'diff' && args[1] === '--name-status') {
      const lines = (config.renamed ?? [])
        .map((pair) => `R100\t${pair.from}\t${pair.to}`)
        .join('\n');
      return { ok: true, stdout: lines ? `${lines}\n` : '', status: 0 };
    }

    return { ok: true, stdout: '', status: 0 };
  };
}
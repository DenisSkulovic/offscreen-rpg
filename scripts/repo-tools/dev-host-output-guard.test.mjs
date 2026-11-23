import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeEnvironmentSession } from './dev-environment-session.mjs';
import { assertExclusiveHostWrite } from './dev-host-output-guard.mjs';
import { isAllocatorRefusal } from './dev-worktree-registry.mjs';

function layout() {
  const root = mkdtempSync(join(tmpdir(), 'host-guard-'));
  const checkout = join(root, 'checkout');
  const registryRoot = join(root, 'state', 'dev-worktree-registry');
  mkdirSync(checkout, { recursive: true });
  mkdirSync(registryRoot, { recursive: true });
  const proc = join(root, 'proc');
  mkdirSync(join(proc, '11'), { recursive: true });
  writeFileSync(join(proc, '11', 'stat'), '11 (tilt) S 1 11 11 0 -1 0 0 0 0 0 0 0 0 0 0 0 1 0 100 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n');
  return { root, checkout, registryRoot, proc };
}

test('one active consumer may write; a second active session refuses before the write', () => {
  const { checkout, registryRoot, proc } = layout();
  writeEnvironmentSession(join(registryRoot, '..', 'dev-environment-sessions'), {
    slotId: 'dev-1',
    checkoutPath: checkout,
    pid: 11,
    processStartTicks: '100',
  });
  const alone = assertExclusiveHostWrite({
    checkout,
    registryRoot,
    selfSlotId: 'dev-1',
    operation: 'database build',
    outputPath: 'packages/db/dist',
    procRoot: proc,
  });
  assert.equal(alone.ok, true);
  writeEnvironmentSession(join(registryRoot, '..', 'dev-environment-sessions'), {
    slotId: 'dev-2',
    checkoutPath: checkout,
    pid: 11,
    processStartTicks: '100',
  });
  assert.throws(
    () => assertExclusiveHostWrite({
      checkout,
      registryRoot,
      selfSlotId: 'dev-1',
      operation: 'release image fallback',
      outputPath: 'apps/web/.next',
      procRoot: proc,
    }),
    (error) => isAllocatorRefusal(error)
      && error.id === 'shared-host-output'
      && String(error.message).includes('dev-2')
      && String(error.message).includes('apps/web/.next')
      && String(error.message).includes('isolated checkout'),
  );
});

test('a failed ownership read refuses and a dead session is not a conflict', () => {
  const { checkout, registryRoot, proc } = layout();
  writeEnvironmentSession(join(registryRoot, '..', 'dev-environment-sessions'), {
    slotId: 'dev-9',
    checkoutPath: checkout,
    pid: 99,
    processStartTicks: '1',
  });
  const clear = assertExclusiveHostWrite({
    checkout,
    registryRoot,
    selfSlotId: 'dev-1',
    operation: 'database build',
    outputPath: 'packages/db/dist',
    procRoot: proc,
  });
  assert.equal(clear.ok, true);
  writeFileSync(join(registryRoot, '..', 'dev-environment-sessions', 'dev-3.json'), '{');
  assert.throws(
    () => assertExclusiveHostWrite({
      checkout,
      registryRoot,
      selfSlotId: 'dev-1',
      operation: 'database build',
      outputPath: 'packages/db/dist',
      procRoot: proc,
    }),
    (error) => isAllocatorRefusal(error) && error.id === 'ownership-unreadable',
  );
});

test('an active legacy session conflicts when the v2 session directory is absent', () => {
  const { checkout, registryRoot, proc } = layout();
  mkdirSync(join(checkout, '.offscreen'), { recursive: true });
  writeFileSync(join(checkout, '.offscreen', 'dev-session.json'), JSON.stringify({
    slotId: 'dev-3',
    worktreePath: checkout,
    pid: 11,
    processStartTicks: '100',
  }));
  assert.throws(
    () => assertExclusiveHostWrite({
      checkout,
      registryRoot,
      selfSlotId: 'dev-1',
      operation: 'database build',
      outputPath: 'packages/db/dist',
      procRoot: proc,
    }),
    (error) => isAllocatorRefusal(error) && error.id === 'shared-host-output' && String(error.message).includes('dev-3'),
  );
});

test('a dead or absent legacy session is not a consumer, and a broken one refuses', () => {
  const { checkout, registryRoot, proc } = layout();
  const clear = assertExclusiveHostWrite({
    checkout,
    registryRoot,
    selfSlotId: 'dev-1',
    operation: 'database build',
    outputPath: 'packages/db/dist',
    procRoot: proc,
  });
  assert.equal(clear.ok, true);
  mkdirSync(join(checkout, '.offscreen'), { recursive: true });
  writeFileSync(join(checkout, '.offscreen', 'dev-session.json'), JSON.stringify({
    slotId: 'dev-3',
    worktreePath: checkout,
    pid: 99,
    processStartTicks: '100',
  }));
  const dead = assertExclusiveHostWrite({
    checkout,
    registryRoot,
    selfSlotId: 'dev-1',
    operation: 'database build',
    outputPath: 'packages/db/dist',
    procRoot: proc,
  });
  assert.equal(dead.ok, true);
  writeFileSync(join(checkout, '.offscreen', 'dev-session.json'), '{');
  assert.throws(
    () => assertExclusiveHostWrite({
      checkout,
      registryRoot,
      selfSlotId: 'dev-1',
      operation: 'database build',
      outputPath: 'packages/db/dist',
      procRoot: proc,
    }),
    (error) => isAllocatorRefusal(error) && error.id === 'ownership-unreadable',
  );
});

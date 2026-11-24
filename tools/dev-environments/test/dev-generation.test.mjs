import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import {
  DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
  DEV_WATCHED_COMPILATION_SCHEMA,
  evaluateDevLoadedRuntimeReadiness,
  fingerprintCompiledTree,
  markDevWatchedCompilation,
  resolveCompiledDistRoot,
  writeDevLoadedRuntimeReceipt,
} from '../runtime/generation.mjs';

function seedDist(root, entryRel, extra = {}) {
  const entryAbs = join(root, entryRel);
  mkdirSync(dirname(entryAbs), { recursive: true });
  writeFileSync(entryAbs, 'export async function main() {}\n', 'utf8');
  const distRoot = resolveCompiledDistRoot(root, entryRel);
  for (const [rel, content] of Object.entries(extra)) {
    const abs = join(distRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return {
    entryAbs,
    distRoot,
    treeIdentity: fingerprintCompiledTree(distRoot),
  };
}

test('tree digest changes when a non-entry emitted file changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-tree-'));
  const entryRel = 'dist/src/main.js';
  const first = seedDist(root, entryRel, {
    'src/helper.js': 'export const helper = 1;\n',
  });
  writeFileSync(
    join(first.distRoot, 'src/helper.js'),
    'export const helper = 2;\n',
    'utf8',
  );
  const changedIdentity = fingerprintCompiledTree(first.distRoot);
  assert.notEqual(first.treeIdentity, changedIdentity);
});

test('positive: loaded receipt matches desired compiled tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-pos-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;

  const entryRel = 'dist/src/main.js';
  const { entryAbs, treeIdentity } = seedDist(root, entryRel);

  markDevWatchedCompilation({
    phase: 'success',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-3',
  });

  writeDevLoadedRuntimeReceipt({
    role: 'api',
    compiledModulePath: entryAbs,
    cwd: root,
  });

  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-3',
  });
  assert.equal(status.ready, true);
  assert.equal(status.reason, 'loaded_matches_desired');
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(status.currentGeneration, desired.generationId);
  assert.equal(desired.compiledModuleIdentity, treeIdentity);
});

test('negative: compile failure does not promote stale loaded generation', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-neg-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;

  const entryRel = 'dist/src/main.js';
  const { entryAbs, treeIdentity } = seedDist(root, entryRel);
  const staleGenerationId = '11111111-1111-4111-8111-111111111111';

  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 4242,
      startedAt: new Date().toISOString(),
      generationId: staleGenerationId,
      compiledModulePath: entryAbs,
      compiledModuleIdentity: treeIdentity,
      environmentId: 'dev-5',
    })}\n`,
    'utf8',
  );

  markDevWatchedCompilation({
    phase: 'failure',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-5',
  });

  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-5',
  });
  assert.equal(status.ready, false);
  assert.equal(status.currentGeneration, null);
  assert.equal(status.reason, 'compile_error');
  assert.equal(status.staleLoadedGeneration, staleGenerationId);
});

test('negative: missing desired receipt is not ready', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-miss-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 1,
      startedAt: new Date().toISOString(),
      generationId: '22222222-2222-4222-8222-222222222222',
      compiledModulePath: '/tmp/stale.js',
      compiledModuleIdentity: 'deadbeef',
    })}\n`,
    'utf8',
  );

  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: 'dist/src/main.js',
    receiptRoot,
    cwd: root,
  });
  assert.equal(status.ready, false);
  assert.equal(status.currentGeneration, null);
  assert.equal(status.reason, 'missing_receipt');
});

test('container identity is ready with explicit remote diskIdentity', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-container-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  const generationId = '33333333-3333-4333-8333-333333333333';
  const identity = 'abc123container';
  writeFileSync(
    join(receiptRoot, 'worker-control.desired.json'),
    `${JSON.stringify({
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: 'worker-control',
      phase: 'compile_success',
      ready: true,
      generationId,
      compiledEntryPath: '/app/apps/worker/dist/src/bootstrap/control-main.js',
      compiledModuleIdentity: identity,
      environmentId: 'dev-5',
    })}\n`,
  );
  writeFileSync(
    join(receiptRoot, 'worker-control.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'worker-control',
      pid: 99,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId,
      compiledModulePath: '/app/apps/worker/dist/src/bootstrap/control-main.js',
      compiledModuleIdentity: identity,
      environmentId: 'dev-5',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'worker-control',
    compiledEntryPath: 'apps/worker/dist/src/bootstrap/control-main.js',
    receiptRoot,
    cwd: root,
    environmentId: 'dev-5',
    diskIdentity: identity,
    requireRemoteDiskIdentity: true,
  });
  assert.equal(status.ready, true);
  assert.equal(status.reason, 'loaded_matches_desired');
});

test('negative: missing remote disk identity does not fall back to host dist', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-remote-'));
  const receiptRoot = join(root, 'receipts');
  const entryRel = 'apps/worker/dist/src/bootstrap/control-main.js';
  seedDist(root, entryRel);
  mkdirSync(receiptRoot, { recursive: true });
  const generationId = '44444444-4444-4444-8444-444444444444';
  const identity = fingerprintCompiledTree(
    resolveCompiledDistRoot(root, entryRel),
  );
  writeFileSync(
    join(receiptRoot, 'worker-control.desired.json'),
    `${JSON.stringify({
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: 'worker-control',
      phase: 'compile_success',
      ready: true,
      generationId,
      compiledEntryPath: join(root, entryRel),
      compiledModuleIdentity: identity,
      environmentId: 'dev-5',
    })}\n`,
  );
  writeFileSync(
    join(receiptRoot, 'worker-control.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'worker-control',
      pid: 100,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId,
      compiledModulePath: join(root, entryRel),
      compiledModuleIdentity: identity,
      environmentId: 'dev-5',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'worker-control',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-5',
    requireRemoteDiskIdentity: true,
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'missing_disk_identity');
});

test('negative: a missing artifact is not an uncaught error', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-missing-artifact-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, 'worker-control.desired.json'),
    `${JSON.stringify({
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: 'worker-control',
      phase: 'compile_success',
      ready: true,
      generationId: '55555555-5555-4555-8555-555555555555',
      compiledEntryPath: '/app/apps/worker/dist/src/bootstrap/control-main.js',
      compiledModuleIdentity: 'present-in-receipt-only',
      environmentId: 'dev-5',
    })}\n`,
  );
  writeFileSync(
    join(receiptRoot, 'worker-control.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'worker-control',
      pid: 101,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      compiledModulePath: '/app/apps/worker/dist/src/bootstrap/control-main.js',
      compiledModuleIdentity: 'older',
      environmentId: 'dev-5',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'worker-control',
    compiledEntryPath: 'apps/worker/dist/src/bootstrap/control-main.js',
    receiptRoot,
    cwd: root,
    requireRemoteDiskIdentity: true,
    diskIdentity: 'present-in-receipt-only',
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'stale_loaded_runtime');
});

test('negative: another slot identity is not this environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-foreign-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs, treeIdentity } = seedDist(root, entryRel);
  markDevWatchedCompilation({
    phase: 'success',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-6',
  });
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 1,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId: desired.generationId,
      compiledModulePath: entryAbs,
      compiledModuleIdentity: treeIdentity,
      environmentId: 'dev-6',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-5',
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'foreign_environment');
});

test('negative: v1 desired schema is rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-v1-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, 'api.desired.json'),
    `${JSON.stringify({
      schema: 'offscreen.dev-watched-compilation.v1',
      role: 'api',
      phase: 'compile_success',
      ready: true,
      compiledEntryPath: '/tmp/main.js',
      compiledModuleIdentity: 'abc',
    })}\n`,
  );
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 2,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId: '66666666-6666-4666-8666-666666666666',
      compiledModulePath: '/tmp/main.js',
      compiledModuleIdentity: 'abc',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: 'dist/src/main.js',
    receiptRoot,
    cwd: root,
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'invalid_schema');
});

test('negative: same digest with a different generationId is not ready', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-stale-gen-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  const { entryAbs, treeIdentity } = seedDist(root, entryRel);
  markDevWatchedCompilation({
    phase: 'success',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-2',
  });
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 42,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId: '77777777-7777-4777-8777-777777777777',
      compiledModulePath: entryAbs,
      compiledModuleIdentity: treeIdentity,
      environmentId: 'dev-2',
    })}\n`,
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
    environmentId: 'dev-2',
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'stale_loaded_generation');
  assert.notEqual(desired.generationId, '77777777-7777-4777-8777-777777777777');
});

test('markDevWatchedCompilation publishes desired receipts atomically', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-atomic-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;
  const entryRel = 'dist/src/main.js';
  seedDist(root, entryRel);
  markDevWatchedCompilation({
    phase: 'success',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
    environmentId: 'dev-1',
  });
  const temps = readdirSync(receiptRoot).filter((name) =>
    name.includes('.tmp'),
  );
  assert.deepEqual(temps, []);
  const desired = JSON.parse(
    readFileSync(join(receiptRoot, 'api.desired.json'), 'utf8'),
  );
  assert.equal(desired.schema, DEV_WATCHED_COMPILATION_SCHEMA);
  assert.match(desired.generationId, /^[0-9a-f-]{36}$/);
});

test('fingerprintCompiledTree rejects empty files', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-empty-'));
  const distRoot = join(root, 'dist');
  mkdirSync(join(distRoot, 'src'), { recursive: true });
  writeFileSync(join(distRoot, 'src', 'main.js'), 'export {}\n', 'utf8');
  writeFileSync(join(distRoot, 'src', 'empty.js'), '', 'utf8');
  assert.throws(
    () => fingerprintCompiledTree(distRoot),
    /empty_file:src\/empty\.js/,
  );
});

test('fingerprintCompiledTree rejects symlinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-symlink-'));
  const distRoot = join(root, 'dist');
  mkdirSync(join(distRoot, 'src'), { recursive: true });
  writeFileSync(join(distRoot, 'src', 'main.js'), 'export {}\n', 'utf8');
  writeFileSync(join(distRoot, 'src', 'link-target.js'), 'export {}\n', 'utf8');
  symlinkSync(
    join(distRoot, 'src', 'link-target.js'),
    join(distRoot, 'src', 'link.js'),
  );
  assert.throws(() => fingerprintCompiledTree(distRoot), /symlink_not_allowed/);
});

test('negative: an unwritable receipt root does not publish a success receipt', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-unwritable-'));
  const blocked = join(root, 'not-a-directory');
  writeFileSync(blocked, 'file');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = join(blocked, 'receipts');
  const entryRel = 'dist/src/main.js';
  seedDist(root, entryRel);
  assert.throws(() =>
    markDevWatchedCompilation({
      phase: 'success',
      role: 'api',
      compiledEntryPath: entryRel,
      cwd: root,
      environmentId: 'dev-5',
    }),
  );
  assert.equal(
    existsSync(join(blocked, 'receipts', 'api.desired.json')),
    false,
  );
  delete process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR;
});

test('negative: corrupt desired json fails closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-generation-corrupt-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(join(receiptRoot, 'api.desired.json'), '{not-json\n', 'utf8');
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
      role: 'api',
      pid: 3,
      startedAt: '2026-11-23T00:00:00.000Z',
      generationId: '88888888-8888-4888-8888-888888888888',
      compiledModulePath: '/tmp/main.js',
      compiledModuleIdentity: 'abc',
    })}\n`,
    'utf8',
  );
  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: 'dist/src/main.js',
    receiptRoot,
    cwd: root,
  });
  assert.equal(status.ready, false);
  assert.equal(status.reason, 'malformed_receipt');
});

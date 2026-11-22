import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  evaluateDevLoadedRuntimeReadiness,
  fingerprintCompiledEntryFile,
  markDevWatchedCompilation,
} from './dev-watched-compilation-receipt.mjs';
import {
  fingerprintCompiledModuleFile,
  writeDevLoadedRuntimeReceipt,
} from '../../../../packages/runtime-logging/dist/dev-loaded-runtime-receipt.js';

test('TS and MJS agree on compiled module identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-runtime-id-'));
  const entryPath = join(root, 'entry.js');
  writeFileSync(entryPath, 'export const marker = "v1";\n', 'utf8');

  const fromMjs = fingerprintCompiledEntryFile(entryPath);
  const fromTs = fingerprintCompiledModuleFile(pathToFileURL(entryPath));
  assert.equal(fromTs.compiledModuleIdentity, fromMjs);
});

test('positive: loaded receipt matches desired compiled artifact', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-runtime-pos-'));
  const receiptRoot = join(root, 'receipts');
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;

  const entryRel = 'dist/src/main.js';
  const entryAbs = join(root, entryRel);
  mkdirSync(dirnameLike(entryAbs), { recursive: true });
  writeFileSync(entryAbs, 'export async function main() {}\n', 'utf8');

  markDevWatchedCompilation({
    phase: 'success',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
  });

  process.env.OFFSCREEN_DEV_WATCHED_COMPILATION = '1';
  writeDevLoadedRuntimeReceipt({
    role: 'api',
    entryModuleUrl: pathToFileURL(entryAbs).href,
  });

  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
  });
  assert.equal(status.ready, true);
  assert.equal(
    status.currentGeneration,
    fingerprintCompiledEntryFile(entryAbs),
  );
});

test('negative: compile failure does not promote stale loaded generation', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-runtime-neg-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR = receiptRoot;

  const entryRel = 'dist/src/main.js';
  const entryAbs = join(root, entryRel);
  mkdirSync(dirnameLike(entryAbs), { recursive: true });
  writeFileSync(entryAbs, 'export async function main() {}\n', 'utf8');
  const staleIdentity = fingerprintCompiledEntryFile(entryAbs);

  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
  `${JSON.stringify({
    schema: 'offscreen.dev-loaded-runtime.v1',
    role: 'api',
    pid: 4242,
    startedAt: new Date().toISOString(),
    compiledModulePath: entryAbs,
    compiledModuleIdentity: staleIdentity,
  })}\n`,
    'utf8',
  );

  markDevWatchedCompilation({
    phase: 'failure',
    role: 'api',
    compiledEntryPath: entryRel,
    cwd: root,
  });

  const status = evaluateDevLoadedRuntimeReadiness({
    role: 'api',
    compiledEntryPath: entryRel,
    receiptRoot,
    cwd: root,
  });
  assert.equal(status.ready, false);
  assert.equal(status.currentGeneration, null);
  assert.equal(status.reason, 'compile_error');
  assert.equal(status.staleLoadedGeneration, staleIdentity);
});

test('negative: missing desired receipt is not ready', () => {
  const root = mkdtempSync(join(tmpdir(), 'dev-runtime-miss-'));
  const receiptRoot = join(root, 'receipts');
  mkdirSync(receiptRoot, { recursive: true });
  writeFileSync(
    join(receiptRoot, 'api.loaded.json'),
    `${JSON.stringify({
      schema: 'offscreen.dev-loaded-runtime.v1',
      role: 'api',
      pid: 1,
      startedAt: new Date().toISOString(),
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

function dirnameLike(filePath) {
  return dirname(filePath);
}
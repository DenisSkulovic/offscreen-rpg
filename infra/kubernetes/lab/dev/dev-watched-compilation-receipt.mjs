#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

export const DEV_WATCHED_COMPILATION_SCHEMA =
  'offscreen.dev-watched-compilation.v1';

export function devRuntimeReceiptRoot(cwd = process.cwd()) {
  const configured = process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR?.trim();
  if (configured) {
    return resolve(configured);
  }
  return join(cwd, '.offscreen-dev-runtime');
}

export function fingerprintCompiledEntryFile(absoluteEntryPath) {
  const bytes = readFileSync(absoluteEntryPath);
  return createHash('sha256').update(bytes).digest('hex');
}

function readCompiledArtifactIdentity(absoluteEntryPath) {
  if (!existsSync(absoluteEntryPath)) {
    return { ok: false, reason: 'missing_artifact' };
  }
  try {
    return { ok: true, identity: fingerprintCompiledEntryFile(absoluteEntryPath) };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { ok: false, reason: 'missing_artifact' };
    }
    throw error;
  }
}

function desiredReceiptPath(receiptRoot, role) {
  return join(receiptRoot, `${role}.desired.json`);
}

function loadedReceiptPath(receiptRoot, role) {
  return join(receiptRoot, `${role}.loaded.json`);
}

/**
 * @param {{ phase: 'success' | 'failure', role: string, compiledEntryPath: string, cwd?: string }} input
 */
export function markDevWatchedCompilation(input) {
  const cwd = input.cwd ?? process.cwd();
  const receiptRoot = devRuntimeReceiptRoot(cwd);
  mkdirSync(receiptRoot, { recursive: true });
  const desiredPath = desiredReceiptPath(receiptRoot, input.role);
  const updatedAt = new Date().toISOString();

  if (input.phase === 'failure') {
    writeFileSync(
      desiredPath,
      `${JSON.stringify({
        schema: DEV_WATCHED_COMPILATION_SCHEMA,
        role: input.role,
        phase: 'compile_error',
        ready: false,
        updatedAt,
        ...(input.environmentId || process.env.OFFSCREEN_DEV_SLOT
          ? { environmentId: input.environmentId || process.env.OFFSCREEN_DEV_SLOT }
          : {}),
      })}\n`,
      'utf8',
    );
    return;
  }

  const absoluteEntryPath = resolve(cwd, input.compiledEntryPath);
  writeFileSync(
    desiredPath,
    `${JSON.stringify({
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: input.role,
      phase: 'compile_success',
      ready: true,
      compiledEntryPath: absoluteEntryPath,
      compiledModuleIdentity: fingerprintCompiledEntryFile(absoluteEntryPath),
      updatedAt,
      ...(input.environmentId || process.env.OFFSCREEN_DEV_SLOT
        ? { environmentId: input.environmentId || process.env.OFFSCREEN_DEV_SLOT }
        : {}),
    })}\n`,
    'utf8',
  );
}

/**
 * Fail closed: stale loaded generations never surface as the current revision.
 *
 * @param {{ role: string, compiledEntryPath: string, receiptRoot?: string, cwd?: string }} input
 */
export function evaluateDevLoadedRuntimeReadiness(input) {
  const cwd = input.cwd ?? process.cwd();
  const receiptRoot = input.receiptRoot ?? devRuntimeReceiptRoot(cwd);
  const desiredPath = desiredReceiptPath(receiptRoot, input.role);
  const loadedPath = loadedReceiptPath(receiptRoot, input.role);

  if (!existsSync(desiredPath) || !existsSync(loadedPath)) {
    return {
      ready: false,
      reason: 'missing_receipt',
      currentGeneration: null,
    };
  }

  const desired = JSON.parse(readFileSync(desiredPath, 'utf8'));
  const loaded = JSON.parse(readFileSync(loadedPath, 'utf8'));

  if (desired.ready !== true || desired.phase !== 'compile_success') {
    return {
      ready: false,
      reason: 'compile_error',
      currentGeneration: null,
      staleLoadedGeneration: loaded.compiledModuleIdentity ?? null,
    };
  }

  if (
    input.environmentId
    && loaded.environmentId
    && loaded.environmentId !== input.environmentId
  ) {
    return {
      ready: false,
      reason: 'foreign_environment',
      currentGeneration: null,
      staleLoadedGeneration: loaded.compiledModuleIdentity ?? null,
    };
  }

  let diskIdentity = input.diskIdentity ?? null;
  if (!diskIdentity) {
    const recordedPath = typeof desired.compiledEntryPath === 'string' ? desired.compiledEntryPath : null;
    const absoluteEntryPath = recordedPath && recordedPath.startsWith('/')
      ? recordedPath
      : resolve(cwd, input.compiledEntryPath);
    const artifact = readCompiledArtifactIdentity(absoluteEntryPath);
    if (!artifact.ok) {
      return {
        ready: false,
        reason: artifact.reason,
        currentGeneration: null,
        staleLoadedGeneration: loaded.compiledModuleIdentity ?? null,
      };
    }
    diskIdentity = artifact.identity;
  }
  if (diskIdentity !== desired.compiledModuleIdentity) {
    return {
      ready: false,
      reason: 'desired_disk_mismatch',
      currentGeneration: null,
      staleLoadedGeneration: loaded.compiledModuleIdentity ?? null,
    };
  }

  if (loaded.compiledModuleIdentity !== desired.compiledModuleIdentity) {
    return {
      ready: false,
      reason: 'stale_loaded_runtime',
      currentGeneration: null,
      staleLoadedGeneration: loaded.compiledModuleIdentity ?? null,
    };
  }

  return {
    ready: true,
    reason: 'loaded_matches_desired',
    currentGeneration: loaded.compiledModuleIdentity,
    loaded,
    desired,
  };
}
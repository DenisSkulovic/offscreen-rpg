#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

export const DEV_WATCHED_COMPILATION_SCHEMA =
  'offscreen.dev-watched-compilation.v2';

export const DEV_LOADED_RUNTIME_RECEIPT_SCHEMA =
  'offscreen.dev-loaded-runtime.v2';

const DEV_ENVIRONMENT_ID = /^dev-\d+$/;

export function devRuntimeReceiptRoot(cwd = process.cwd()) {
  const configured = process.env.OFFSCREEN_DEV_RUNTIME_RECEIPT_DIR?.trim();
  if (configured) {
    return resolve(configured);
  }
  return join(cwd, '.offscreen-dev-runtime');
}

/**
 * @param {string} distRoot
 */
export function resolveCompiledDistRoot(cwd, compiledEntryPath) {
  const absoluteEntry = resolve(cwd, compiledEntryPath);
  const parts = absoluteEntry.split(/[/\\]/);
  const distIndex = parts.lastIndexOf('dist');
  if (distIndex < 0) {
    throw new Error('compiledEntryPath must include a dist segment');
  }
  return parts.slice(0, distIndex + 1).join('/');
}

/**
 * @param {string} distRoot
 * @returns {string[]}
 */
function listCompiledTreeFiles(distRoot) {
  /** @type {string[]} */
  const files = [];

  function walk(currentDir, prefix) {
    for (const name of readdirSync(currentDir).sort()) {
      if (name === 'node_modules') continue;
      const rel = prefix ? `${prefix}/${name}` : name;
      const absolute = join(currentDir, name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        throw new Error(`symlink_not_allowed:${rel}`);
      }
      if (stat.isDirectory()) {
        walk(absolute, rel);
        continue;
      }
      if (!stat.isFile()) {
        throw new Error(`unsupported_entry:${rel}`);
      }
      if (stat.size === 0) {
        throw new Error(`empty_file:${rel}`);
      }
      files.push(rel);
    }
  }

  walk(distRoot, '');
  return files.sort();
}

function posixRelative(distRoot, absolutePath) {
  return relative(distRoot, absolutePath).split(sep).join('/');
}

/**
 * Sorted regular files under dist; SHA-256(path + NUL + file-bytes SHA-256 + NUL) chain.
 *
 * @param {string} distRoot
 */
export function fingerprintCompiledTree(distRoot) {
  const root = resolve(distRoot);
  if (!existsSync(root)) {
    throw new Error('missing_dist_root');
  }
  const hash = createHash('sha256');
  for (const rel of listCompiledTreeFiles(root)) {
    const absolute = join(root, rel);
    let bytes;
    try {
      bytes = readFileSync(absolute);
    } catch {
      throw new Error(`unreadable_file:${rel}`);
    }
    if (bytes.length === 0) {
      throw new Error(`empty_file:${rel}`);
    }
    const fileHash = createHash('sha256').update(bytes).digest();
    const normalizedPath = posixRelative(root, absolute);
    hash.update(normalizedPath);
    hash.update('\0');
    hash.update(fileHash);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** @deprecated Prefer fingerprintCompiledTree for generation receipts. */
export function fingerprintCompiledEntryFile(absoluteEntryPath) {
  const bytes = readFileSync(absoluteEntryPath);
  return createHash('sha256').update(bytes).digest('hex');
}

function desiredReceiptPath(receiptRoot, role) {
  return join(receiptRoot, `${role}.desired.json`);
}

function loadedReceiptPath(receiptRoot, role) {
  return join(receiptRoot, `${role}.loaded.json`);
}

/**
 * @param {string} path
 * @param {unknown} payload
 */
function atomicWriteJson(path, payload) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const tempPath = join(dir, `.${basename(path)}.${randomUUID()}.tmp`);
  writeFileSync(tempPath, `${JSON.stringify(payload)}\n`, 'utf8');
  renameSync(tempPath, path);
}

function parseReceipt(path) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return { ok: false, reason: 'malformed_receipt' };
  }
}

function validateEnvironmentId(environmentId) {
  if (environmentId == null || environmentId === '') return true;
  return (
    typeof environmentId === 'string' && DEV_ENVIRONMENT_ID.test(environmentId)
  );
}

/**
 * @param {unknown} receipt
 * @param {'desired' | 'loaded'} kind
 */
function isValidDesiredReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  const record = /** @type {Record<string, unknown>} */ (receipt);
  if (record.schema !== DEV_WATCHED_COMPILATION_SCHEMA) return false;
  if (typeof record.role !== 'string' || !record.role) return false;
  if (typeof record.phase !== 'string') return false;
  if (typeof record.ready !== 'boolean') return false;
  if (
    record.environmentId !== undefined &&
    !validateEnvironmentId(record.environmentId)
  ) {
    return false;
  }
  if (record.ready === true) {
    if (record.phase !== 'compile_success') return false;
    if (
      typeof record.compiledEntryPath !== 'string' ||
      !record.compiledEntryPath
    )
      return false;
    if (
      typeof record.compiledModuleIdentity !== 'string' ||
      !record.compiledModuleIdentity
    ) {
      return false;
    }
    if (typeof record.generationId !== 'string' || !record.generationId)
      return false;
  }
  return true;
}

/**
 * @param {unknown} receipt
 */
function isValidLoadedReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  const record = /** @type {Record<string, unknown>} */ (receipt);
  if (record.schema !== DEV_LOADED_RUNTIME_RECEIPT_SCHEMA) return false;
  if (typeof record.role !== 'string' || !record.role) return false;
  if (
    typeof record.pid !== 'number' ||
    !Number.isInteger(record.pid) ||
    record.pid <= 0
  ) {
    return false;
  }
  if (typeof record.startedAt !== 'string' || !record.startedAt) return false;
  if (
    typeof record.compiledModulePath !== 'string' ||
    !record.compiledModulePath
  )
    return false;
  if (
    typeof record.compiledModuleIdentity !== 'string' ||
    !record.compiledModuleIdentity
  ) {
    return false;
  }
  if (typeof record.generationId !== 'string' || !record.generationId)
    return false;
  if (
    record.environmentId !== undefined &&
    !validateEnvironmentId(record.environmentId)
  ) {
    return false;
  }
  return true;
}

function readTreeIdentityForEntry(cwd, compiledEntryPath) {
  const distRoot = resolveCompiledDistRoot(cwd, compiledEntryPath);
  if (!existsSync(distRoot)) {
    return { ok: false, reason: 'missing_artifact' };
  }
  try {
    return { ok: true, identity: fingerprintCompiledTree(distRoot) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.startsWith('missing_dist_root') ||
      message.includes('empty_file')
    ) {
      return { ok: false, reason: 'missing_artifact' };
    }
    throw error;
  }
}

/**
 * @param {{ phase: 'success' | 'failure' | 'compiling', role: string, compiledEntryPath?: string, cwd?: string, environmentId?: string, compiledDistRoot?: string }} input
 */
export function markDevWatchedCompilation(input) {
  const cwd = input.cwd ?? process.cwd();
  const receiptRoot = devRuntimeReceiptRoot(cwd);
  const desiredPath = desiredReceiptPath(receiptRoot, input.role);
  const updatedAt = new Date().toISOString();
  const environmentId =
    input.environmentId || process.env.OFFSCREEN_DEV_SLOT?.trim() || null;
  if (environmentId && !validateEnvironmentId(environmentId)) {
    throw new Error(`invalid_environment_id:${environmentId}`);
  }

  if (input.phase === 'failure') {
    atomicWriteJson(desiredPath, {
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: input.role,
      phase: 'compile_error',
      ready: false,
      updatedAt,
      ...(environmentId ? { environmentId } : {}),
    });
    return;
  }

  if (input.phase === 'compiling') {
    atomicWriteJson(desiredPath, {
      schema: DEV_WATCHED_COMPILATION_SCHEMA,
      role: input.role,
      phase: 'compiling',
      ready: false,
      updatedAt,
      ...(environmentId ? { environmentId } : {}),
    });
    return;
  }

  if (!input.compiledEntryPath) {
    throw new Error('compiledEntryPath_required_for_success');
  }

  const distRoot = input.compiledDistRoot
    ? resolve(cwd, input.compiledDistRoot)
    : resolveCompiledDistRoot(cwd, input.compiledEntryPath);
  const absoluteEntryPath = resolve(cwd, input.compiledEntryPath);
  const compiledModuleIdentity = fingerprintCompiledTree(distRoot);

  atomicWriteJson(desiredPath, {
    schema: DEV_WATCHED_COMPILATION_SCHEMA,
    role: input.role,
    phase: 'compile_success',
    ready: true,
    generationId: randomUUID(),
    compiledEntryPath: absoluteEntryPath,
    compiledModuleIdentity,
    updatedAt,
    ...(environmentId ? { environmentId } : {}),
  });
}

/**
 * @param {{ role: string, compiledModulePath: string, cwd?: string, generationId?: string }} input
 */
export function writeDevLoadedRuntimeReceipt(input) {
  const cwd = input.cwd ?? process.cwd();
  const receiptRoot = devRuntimeReceiptRoot(cwd);
  const desiredPath = desiredReceiptPath(receiptRoot, input.role);
  if (!existsSync(desiredPath)) {
    throw new Error('missing_desired_receipt');
  }
  const parsed = parseReceipt(desiredPath);
  if (!parsed.ok || !isValidDesiredReceipt(parsed.value)) {
    throw new Error('invalid_desired_receipt');
  }
  const desired = /** @type {Record<string, unknown>} */ (parsed.value);
  if (desired.ready !== true) {
    throw new Error('desired_not_ready');
  }
  const generationId = input.generationId ?? desired.generationId;
  if (
    typeof generationId !== 'string' ||
    generationId !== desired.generationId
  ) {
    throw new Error('generation_mismatch');
  }
  const absoluteModulePath = resolve(cwd, input.compiledModulePath);
  const receipt = {
    schema: DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
    role: input.role,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    generationId,
    compiledModulePath: absoluteModulePath,
    compiledModuleIdentity: desired.compiledModuleIdentity,
    ...(desired.environmentId ? { environmentId: desired.environmentId } : {}),
  };
  atomicWriteJson(loadedReceiptPath(receiptRoot, input.role), receipt);
  return receipt;
}

/**
 * @param {{ role: string, cwd?: string }} input
 */
export function clearDevLoadedRuntimeReceipt(input) {
  const cwd = input.cwd ?? process.cwd();
  const loadedPath = loadedReceiptPath(devRuntimeReceiptRoot(cwd), input.role);
  if (existsSync(loadedPath)) {
    unlinkSync(loadedPath);
  }
}

/**
 * Fail closed: stale loaded generations never surface as the current revision.
 *
 * @param {{
 *   role: string,
 *   compiledEntryPath: string,
 *   receiptRoot?: string,
 *   cwd?: string,
 *   environmentId?: string | null,
 *   diskIdentity?: string | null,
 *   requireRemoteDiskIdentity?: boolean,
 * }} input
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

  const desiredParsed = parseReceipt(desiredPath);
  const loadedParsed = parseReceipt(loadedPath);
  if (!desiredParsed.ok) {
    return {
      ready: false,
      reason: 'malformed_receipt',
      currentGeneration: null,
    };
  }

  const desired = desiredParsed.value;
  if (!isValidDesiredReceipt(desired)) {
    return {
      ready: false,
      reason: 'invalid_schema',
      currentGeneration: null,
    };
  }

  if (/** @type {Record<string, unknown>} */ (desired).role !== input.role) {
    return {
      ready: false,
      reason: 'role_mismatch',
      currentGeneration: null,
    };
  }

  const desiredRecord = /** @type {Record<string, unknown>} */ (desired);

  if (
    desiredRecord.ready !== true ||
    desiredRecord.phase !== 'compile_success'
  ) {
    return {
      ready: false,
      reason: 'compile_error',
      currentGeneration: null,
      staleLoadedGeneration: loadedParsed.ok
        ? /** @type {Record<string, unknown>} */ ((loadedParsed.value)
            .generationId ?? null)
        : null,
    };
  }

  if (!loadedParsed.ok || !isValidLoadedReceipt(loadedParsed.value)) {
    return {
      ready: false,
      reason: 'invalid_schema',
      currentGeneration: null,
      staleLoadedGeneration: desiredRecord.generationId ?? null,
    };
  }

  const loaded = /** @type {Record<string, unknown>} */ (loadedParsed.value);

  if (loaded.role !== input.role) {
    return {
      ready: false,
      reason: 'role_mismatch',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (
    input.environmentId &&
    loaded.environmentId &&
    loaded.environmentId !== input.environmentId
  ) {
    return {
      ready: false,
      reason: 'foreign_environment',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (
    desiredRecord.environmentId &&
    loaded.environmentId &&
    loaded.environmentId !== desiredRecord.environmentId
  ) {
    return {
      ready: false,
      reason: 'foreign_environment',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (
    input.requireRemoteDiskIdentity === true &&
    typeof input.diskIdentity !== 'string'
  ) {
    return {
      ready: false,
      reason: 'missing_disk_identity',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  let diskIdentity =
    typeof input.diskIdentity === 'string' ? input.diskIdentity : null;
  if (!diskIdentity && input.requireRemoteDiskIdentity !== true) {
    const artifact = readTreeIdentityForEntry(cwd, input.compiledEntryPath);
    if (!artifact.ok) {
      return {
        ready: false,
        reason: artifact.reason,
        currentGeneration: null,
        staleLoadedGeneration: loaded.generationId ?? null,
      };
    }
    diskIdentity = artifact.identity;
  }

  if (diskIdentity !== desiredRecord.compiledModuleIdentity) {
    return {
      ready: false,
      reason: 'desired_disk_mismatch',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (
    loaded.compiledModuleIdentity === desiredRecord.compiledModuleIdentity &&
    loaded.generationId !== desiredRecord.generationId
  ) {
    return {
      ready: false,
      reason: 'stale_loaded_generation',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (loaded.compiledModuleIdentity !== desiredRecord.compiledModuleIdentity) {
    return {
      ready: false,
      reason: 'stale_loaded_runtime',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  if (loaded.generationId !== desiredRecord.generationId) {
    return {
      ready: false,
      reason: 'stale_loaded_generation',
      currentGeneration: null,
      staleLoadedGeneration: loaded.generationId ?? null,
    };
  }

  return {
    ready: true,
    reason: 'loaded_matches_desired',
    currentGeneration: String(loaded.generationId),
    loaded,
    desired,
  };
}

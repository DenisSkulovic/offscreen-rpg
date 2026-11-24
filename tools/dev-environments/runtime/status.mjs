#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEV_LOADED_RUNTIME_RECEIPT_SCHEMA,
  DEV_WATCHED_COMPILATION_SCHEMA,
  fingerprintCompiledTree,
  resolveCompiledDistRoot,
} from './generation.mjs';

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      values[key] = 'true';
      continue;
    }
    values[key] = next;
    i += 1;
  }
  return values;
}

function readJsonFile(path) {
  if (!existsSync(path)) {
    return { ok: false, reason: 'missing_receipt' };
  }
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch {
    return { ok: false, reason: 'malformed_receipt' };
  }
}

function isLegacySchema(receipt) {
  if (!receipt || typeof receipt !== 'object') return false;
  const schema = /** @type {Record<string, unknown>} */ (receipt).schema;
  return typeof schema === 'string' && schema.endsWith('.v1');
}

function pidAlive(pid) {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    return code === 'EPERM';
  }
}

function snapshotDesired(receiptDir, receiptRole) {
  return readJsonFile(`${receiptDir}/${receiptRole}.desired.json`);
}

/**
 * Pod-local observation: one process reads receipts, hashes dist, checks pid,
 * then re-reads desired to reject a concurrent compile publication.
 *
 * @param {{
 *   receiptRole: string,
 *   compiledEntryPath: string,
 *   receiptDir: string,
 *   environmentId?: string | null,
 * }} input
 */
export function observeDevRuntimeRoleInPod(input) {
  const desiredBefore = snapshotDesired(input.receiptDir, input.receiptRole);
  const loadedParsed = readJsonFile(
    `${input.receiptDir}/${input.receiptRole}.loaded.json`,
  );

  if (!desiredBefore.ok) {
    return {
      ok: false,
      reason: desiredBefore.reason,
      receiptRole: input.receiptRole,
    };
  }
  if (!loadedParsed.ok) {
    return {
      ok: false,
      reason: loadedParsed.reason,
      receiptRole: input.receiptRole,
    };
  }

  const desired = desiredBefore.value;
  const loaded = loadedParsed.value;
  const legacyReceipt = isLegacySchema(desired) || isLegacySchema(loaded);
  if (legacyReceipt) {
    return {
      ok: true,
      legacyReceipt: true,
      receiptRole: input.receiptRole,
      environmentId: input.environmentId ?? null,
    };
  }

  if (
    desired?.schema !== DEV_WATCHED_COMPILATION_SCHEMA ||
    loaded?.schema !== DEV_LOADED_RUNTIME_RECEIPT_SCHEMA
  ) {
    return {
      ok: false,
      reason: 'invalid_schema',
      receiptRole: input.receiptRole,
    };
  }

  const loadedRecord = /** @type {Record<string, unknown>} */ (loaded);
  const alive = pidAlive(loadedRecord.pid);

  let diskIdentity = null;
  try {
    const distRoot = resolveCompiledDistRoot('/', input.compiledEntryPath);
    diskIdentity = fingerprintCompiledTree(distRoot);
  } catch {
    return {
      ok: false,
      reason: 'missing_disk_identity',
      receiptRole: input.receiptRole,
    };
  }

  const desiredAfter = snapshotDesired(input.receiptDir, input.receiptRole);
  if (!desiredAfter.ok) {
    return {
      ok: false,
      reason: desiredAfter.reason,
      receiptRole: input.receiptRole,
    };
  }

  const before = /** @type {Record<string, unknown>} */ (desired);
  const after = /** @type {Record<string, unknown>} */ (desiredAfter.value);
  const concurrentUpdate =
    before.generationId !== after.generationId ||
    before.compiledModuleIdentity !== after.compiledModuleIdentity ||
    before.updatedAt !== after.updatedAt;

  return {
    ok: true,
    receiptRole: input.receiptRole,
    environmentId: input.environmentId ?? null,
    desired: after,
    loaded,
    diskIdentity,
    pidAlive: alive,
    concurrentUpdate,
    legacyReceipt: false,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const receiptRole = args['receipt-role'];
  const compiledEntry = args['compiled-entry'];
  const receiptDir = args['receipt-dir'];
  if (!receiptRole || !compiledEntry || !receiptDir) {
    process.stderr.write(
      'usage: status.mjs --receipt-role ROLE --compiled-entry PATH --receipt-dir DIR [--environment-id dev-N]\n',
    );
    process.exitCode = 1;
    return;
  }

  const observation = observeDevRuntimeRoleInPod({
    receiptRole,
    compiledEntryPath: compiledEntry,
    receiptDir,
    environmentId: args['environment-id'] ?? null,
  });
  process.stdout.write(`${JSON.stringify(observation)}\n`);
  process.exitCode =
    observation.ok === true && observation.legacyReceipt !== true ? 0 : 1;
}

const statusModulePath = fileURLToPath(import.meta.url);
const statusInvokedAsMain =
  process.argv[1] && resolve(process.argv[1]) === statusModulePath;

if (statusInvokedAsMain) {
  main();
}

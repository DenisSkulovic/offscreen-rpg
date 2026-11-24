#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import process from 'node:process';
/**
 * Create-only importer and reader credential decisions for content-bootstrap smoke.
 * Does not call kubectl or mutate a cluster.
 */

import { fileURLToPath } from 'node:url';

export const IMPORTER_SECRET = 'content-importer-s3';
export const READER_SECRET = 'content-reader-s3';
export const READER_IDENTITY = 'content-reader';

/**
 * @param {{ accessKeyId: string, secretAccessKey: string } | null | undefined} existing
 * @param {{ accessKeyId: string, secretAccessKey: string }} desired
 * @returns {'absent' | 'match' | 'mismatch'}
 */
export function compareImporterSecretBytes(existing, desired) {
  if (!existing?.accessKeyId || !existing?.secretAccessKey) {
    return 'absent';
  }
  if (
    existing.accessKeyId === desired.accessKeyId &&
    existing.secretAccessKey === desired.secretAccessKey
  ) {
    return 'match';
  }
  return 'mismatch';
}

/**
 * @param {{ accessKeyId: string, secretAccessKey: string } | null | undefined} existing
 * @param {{ accessKeyId: string, secretAccessKey: string }} desired
 */
export function decideImporterSecret(existing, desired) {
  const comparison = compareImporterSecretBytes(existing, desired);
  if (comparison === 'absent') {
    return { action: 'create', comparison };
  }
  if (comparison === 'match') {
    return { action: 'reuse', comparison };
  }
  return { action: 'refuse', comparison, reason: 'importer-secret-mismatch' };
}

/**
 * @param {{
 *   readerSecret?: { accessKeyId: string, secretAccessKey: string } | null,
 *   identityState: 'absent' | 'present' | 'unknown',
 *   partialRepairRequired?: boolean,
 * }} input
 */
export function decideReaderBootstrap(input) {
  const {
    readerSecret = null,
    identityState,
    partialRepairRequired = false,
  } = input;
  if (partialRepairRequired) {
    return { action: 'refuse', reason: 'reader-partial-repair-required' };
  }
  if (readerSecret?.accessKeyId && readerSecret?.secretAccessKey) {
    return { action: 'reuse' };
  }
  if (identityState === 'unknown') {
    return { action: 'refuse', reason: 'reader-identity-unknown' };
  }
  if (identityState === 'present') {
    return { action: 'refuse', reason: 'reader-identity-without-secret' };
  }
  if (identityState === 'absent') {
    return { action: 'configure' };
  }
  return { action: 'refuse', reason: 'reader-state-invalid' };
}

function readStdinJson() {
  const chunks = [];
  for (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new Error('stdin JSON required');
  }
  return JSON.parse(raw);
}

function main() {
  const command = process.argv[2];
  if (command === 'decide-importer') {
    const body = readStdinJson();
    process.stdout.write(
      `${JSON.stringify(decideImporterSecret(body.existing, body.desired))}\n`,
    );
    return;
  }
  if (command === 'decide-reader') {
    const body = readStdinJson();
    process.stdout.write(`${JSON.stringify(decideReaderBootstrap(body))}\n`);
    return;
  }
  throw new Error(`unknown command: ${command ?? '(missing)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

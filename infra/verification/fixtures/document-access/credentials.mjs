#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
/**
 * Create-only writer and reader credential decisions for document-access smoke.
 * Does not call kubectl or mutate a cluster.
 */

import {
  decideImporterSecret,
  decideReaderBootstrap,
} from '../../release-acceptance/content-bootstrap/credentials.mjs';

export {
  compareImporterSecretBytes,
  decideImporterSecret,
  decideReaderBootstrap,
} from '../../release-acceptance/content-bootstrap/credentials.mjs';

export const WRITER_SECRET = 'document-writer-s3';
export const READER_SECRET = 'document-reader-s3';
export const READER_IDENTITY = 'document-reader';

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
  if (command === 'decide-writer') {
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

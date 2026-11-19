#!/usr/bin/env node
/**
 * Read the pinned Seyda Neen fixture hashes from an S3-compatible store.
 *
 * A second process from import-pinned-fixture.mjs. It does not write
 * fixture-pin.json, does not create a campaign, and does not treat a start
 * package as an opening candidate. A local pin file is not this proof.
 *
 * Usage:
 *   node scripts/repo-tools/read-pinned-fixture.mjs --s3
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson,
  createDocumentStoreFromEnv,
} from '../../packages/documents/dist/index.js';

const TRUSTED = {
  fixtureId: 'seyda-neen-prisoner',
  worldRootHash:
    '5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9',
  ruleRootHash:
    'd643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab',
  startRootHash:
    'e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813',
};

const MISSING_HASH =
  '0000000000000000000000000000000000000000000000000000000000000001';

export async function readPinnedFixture() {
  const mode = (process.env.OFFSCREEN_DOCUMENT_STORE ?? '')
    .trim()
    .toLowerCase();
  if (mode !== 's3') {
    throw new Error('OFFSCREEN_DOCUMENT_STORE=s3 is required');
  }
  const store = createDocumentStoreFromEnv(process.env);
  if (!store) {
    throw new Error('S3 document store environment is required');
  }
  const rules = await store.readRulePackageManifest(TRUSTED.ruleRootHash);
  const world = await store.readWorldPackageManifest(TRUSTED.worldRootHash);
  const start = await store.readStartPackageManifest(TRUSTED.startRootHash);
  if (start.worlds?.[0]?.rootHash !== TRUSTED.worldRootHash) {
    throw new Error(
      'Missing fixture dependency: pinned world root is not the imported world',
    );
  }
  if (start.rules?.rootHash !== TRUSTED.ruleRootHash) {
    throw new Error(
      'Missing fixture dependency: pinned rule root is not the imported rules',
    );
  }
  try {
    await store.readStartPackageManifest(MISSING_HASH);
    throw new Error('Missing object was readable');
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing object was readable') {
      throw error;
    }
    const code = error && typeof error === 'object' ? error.code : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (code !== 'missing' && !/missing|not found|NoSuchKey|404/i.test(message)) {
      throw error;
    }
  }
  return {
    ok: true,
    fixtureId: TRUSTED.fixtureId,
    worldRootHash: TRUSTED.worldRootHash,
    ruleRootHash: TRUSTED.ruleRootHash,
    startRootHash: TRUSTED.startRootHash,
    ruleSetId: rules.ruleSetId,
    worldId: world.worldId,
    startPackageId: start.startPackageId,
    catalogue: false,
    openingCandidate: false,
    campaignCreated: false,
    match: 'yes',
  };
}

async function main() {
  if (!process.argv.includes('--s3')) {
    console.error('Required: --s3');
    return 2;
  }
  try {
    const result = await readPinnedFixture();
    process.stdout.write(canonicalJson(result));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  process.exit(await main());
}

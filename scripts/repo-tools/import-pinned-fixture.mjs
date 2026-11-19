#!/usr/bin/env node
/**
 * Import the one trusted Seyda Neen fixture into a local document store.
 *
 * Uses importRulePackageDirectory, importWorldPackageDirectory, and
 * importStartPackageDirectory. Checks the pinned world, rule, and start
 * checksums, then writes fixture-pin.json. A second run writes the same
 * root hashes. A wrong checksum, a symlink, or a missing dependency exits
 * non-zero and leaves the previous pin file unchanged.
 *
 * This is an operator pin. It is not a user-facing catalogue, not an
 * opening candidate, and not a campaign row. A local fixture-pin.json is
 * not the shared-cluster Pod proof. That proof is a second Job that reads
 * the same hashes from the lab object store.
 *
 * Usage:
 *   node scripts/repo-tools/import-pinned-fixture.mjs --store <directory>
 *   node scripts/repo-tools/import-pinned-fixture.mjs --store <directory> --fixture-root <directory>
 *   node scripts/repo-tools/import-pinned-fixture.mjs --s3 [--fixture-root <directory>]
 */
import { lstat, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LocalDocumentStore,
  canonicalJson,
  createDocumentStoreFromEnv,
  importRulePackageDirectory,
  importStartPackageDirectory,
  importWorldPackageDirectory,
} from '../../packages/documents/dist/index.js';

const PIN_NAME = 'fixture-pin.json';

/** Inputs that produce the checked-in start-package.json pins. */
const TRUSTED = {
  fixtureId: 'seyda-neen-prisoner',
  worldId: '7c14e5bc-4d72-4f8c-9a6b-97f334b83c11',
  worldOperationId: '89ec4571-24ee-49da-826c-ce25ad6b3e41',
  worldTitle: 'Vvardenfell POC',
  worldRootHash:
    '5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9',
  ruleSetId: 'd73c2a94-1f5b-5a83-91c3-3a9f9897e6bb',
  ruleRootHash:
    'd643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab',
  adapterId: 'srd-5.2.1-subset',
  adapterVersion: 1,
  startPackageId: '6d5e6ae5-e0b2-4689-b780-3c8e0e1711f5',
  startRootHash:
    'e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813',
};

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

function fixturePaths(fixtureRoot) {
  return {
    world: join(fixtureRoot, 'content', 'worlds', 'vvardenfell-poc'),
    rules: join(fixtureRoot, 'content', 'rules', 'srd-5.2.1-subset'),
    start: join(fixtureRoot, 'content', 'starts', 'seyda-neen-prisoner'),
  };
}

function pinPath(storeRoot) {
  return join(storeRoot, PIN_NAME);
}

async function readPinBytes(storeRoot) {
  try {
    return await readFile(pinPath(storeRoot), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function assertPinnedHash(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Pinned checksum mismatch for ${label}`);
  }
}

async function readTrustedDescriptor(startDirectory) {
  const descriptorPath = join(startDirectory, 'start-package.json');
  const metadata = await lstat(descriptorPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error('Start package descriptor must be a regular file');
  }
  const source = JSON.parse(await readFile(descriptorPath, 'utf8'));
  const world = source.worlds?.[0];
  if (
    source.startPackageId !== TRUSTED.startPackageId ||
    !world ||
    world.worldId !== TRUSTED.worldId ||
    world.rootHash !== TRUSTED.worldRootHash ||
    world.revision !== 1 ||
    source.rules?.ruleSetId !== TRUSTED.ruleSetId ||
    source.rules?.rootHash !== TRUSTED.ruleRootHash ||
    source.rules?.revision !== 1
  ) {
    throw new Error('Pinned checksum mismatch for fixture descriptor');
  }
  if (
    source.rules?.engine?.adapterId !== TRUSTED.adapterId ||
    source.rules?.engine?.adapterVersion !== TRUSTED.adapterVersion
  ) {
    throw new Error('Unknown executable adapter');
  }
  return source;
}

function describeFailure(error) {
  const coded = error?.code ?? error?.cause?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (
    coded === 'ENOENT' ||
    /ENOENT|no such file|requires WORLD\.md/i.test(message)
  ) {
    const target = error?.path ?? error?.cause?.path ?? message;
    return new Error(`Missing fixture dependency: ${target}`);
  }
  return error instanceof Error ? error : new Error(message);
}

async function commitPin(storeRoot, pin) {
  const path = pinPath(storeRoot);
  const body = canonicalJson(pin);
  if ((await readPinBytes(storeRoot)) === body) return path;
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, body, 'utf8');
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return path;
}

async function openStore({ storeRoot, s3 }) {
  if (s3) {
    if (storeRoot) {
      throw new Error('S3 import does not take --store');
    }
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
    if (typeof store.ensureBucket === 'function') {
      await store.ensureBucket();
    }
    return store;
  }
  if (!storeRoot) {
    throw new Error('A document store directory is required');
  }
  return new LocalDocumentStore(storeRoot);
}

export async function importPinnedFixture({
  storeRoot = null,
  fixtureRoot,
  s3 = false,
}) {
  if (!fixtureRoot) {
    throw new Error('A fixture root is required');
  }
  const before = storeRoot ? await readPinBytes(storeRoot) : null;
  try {
    const paths = fixturePaths(fixtureRoot);
    await readTrustedDescriptor(paths.start);
    const store = await openStore({ storeRoot, s3 });
    const rules = await importRulePackageDirectory(store, paths.rules);
    assertPinnedHash(rules.rootHash, TRUSTED.ruleRootHash, 'rule root');
    const world = await importWorldPackageDirectory(store, {
      sourceDirectory: paths.world,
      worldId: TRUSTED.worldId,
      operationId: TRUSTED.worldOperationId,
      title: TRUSTED.worldTitle,
    });
    assertPinnedHash(world.rootHash, TRUSTED.worldRootHash, 'world root');
    const start = await importStartPackageDirectory(store, paths.start);
    assertPinnedHash(start.rootHash, TRUSTED.startRootHash, 'start root');
    if (start.manifest.worlds[0]?.rootHash !== world.rootHash) {
      throw new Error(
        'Missing fixture dependency: pinned world root is not the imported world',
      );
    }
    if (start.manifest.rules.rootHash !== rules.rootHash) {
      throw new Error(
        'Missing fixture dependency: pinned rule root is not the imported rules',
      );
    }
    await store.readRulePackageManifest(rules.rootHash);
    await store.readWorldPackageManifest(world.rootHash);
    await store.readStartPackageManifest(start.rootHash);
    const pin = {
      format: 'offscreen.fixture-pin.v1',
      fixtureId: TRUSTED.fixtureId,
      catalogue: false,
      openingCandidate: false,
      campaignCreated: false,
      world: {
        worldId: world.manifest.worldId,
        rootHash: world.rootHash,
        revision: world.manifest.revision,
      },
      rules: {
        ruleSetId: rules.manifest.ruleSetId,
        rootHash: rules.rootHash,
        revision: rules.manifest.revision,
        adapterId: rules.manifest.engine.adapterId,
        adapterVersion: rules.manifest.engine.adapterVersion,
      },
      start: {
        startPackageId: start.manifest.startPackageId,
        rootHash: start.rootHash,
        revision: start.manifest.revision,
      },
    };
    const written = storeRoot ? await commitPin(storeRoot, pin) : null;
    return {
      ok: true,
      fixtureId: TRUSTED.fixtureId,
      worldRootHash: world.rootHash,
      ruleRootHash: rules.rootHash,
      startRootHash: start.rootHash,
      revision: start.manifest.revision,
      pinPath: written,
      catalogue: false,
      openingCandidate: false,
      campaignCreated: false,
    };
  } catch (error) {
    if (storeRoot) {
      const after = await readPinBytes(storeRoot);
      if (after !== before) {
        throw new Error('Failed import changed the previous fixture pin');
      }
    }
    throw describeFailure(error);
  }
}

function repoRootFromScript() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

async function main() {
  const s3 = process.argv.includes('--s3');
  const storeArg = arg('--store');
  const fixtureRoot = arg('--fixture-root') ?? repoRootFromScript();
  if (s3 === Boolean(storeArg)) {
    console.error(
      'Required: --store <directory> or --s3 [--fixture-root <directory>]',
    );
    return 2;
  }
  try {
    const result = await importPinnedFixture({
      storeRoot: storeArg ? resolve(storeArg) : null,
      fixtureRoot: resolve(fixtureRoot),
      s3,
    });
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

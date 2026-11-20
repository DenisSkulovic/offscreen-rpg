import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import {
  canonicalDocumentSchema,
  importRulePackageDirectory,
  LocalDocumentStore,
  rulePackageManifestSchema,
} from '@offscreen/documents';
import { resolveStartupDefaultRules } from '../dist/src/default-rules-startup.js';

async function seedRulePackage(store) {
  const ruleSetId = randomUUID();
  const orientationId = randomUUID();
  const orientation = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: orientationId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
    },
    title: 'Rules index',
    body: '# Rules index',
  });
  const objectHash = await store.putDocument(orientation);
  const engine = { adapterId: 'srd-5.2.1-subset', adapterVersion: 1 };
  const manifest = rulePackageManifestSchema.parse({
    format: 'offscreen.rule-package-manifest.v1',
    ruleSetId,
    title: 'Pinned rules',
    revision: 1,
    previousRootHash: null,
    authorOperationId: randomUUID(),
    orientationDocumentId: orientationId,
    engine,
    license: {
      name: 'CC BY 4.0',
      source: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Pinned attribution',
    },
    entries: [
      {
        documentId: orientationId,
        revision: 1,
        path: 'RULES.md',
        objectHash,
        kind: 'orientation',
        authority: 'source',
        visibility: 'player-known',
        sourceBytes: Buffer.byteLength(orientation.body, 'utf8'),
        topics: ['rules-index'],
        sections: [],
      },
    ],
  });
  const rootHash = await store.putRulePackageManifest(manifest);
  return { rootHash, ruleSetId, engine, revision: manifest.revision };
}

test('resolveStartupDefaultRules reads a pinned manifest without local source import', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-api-pinned-rules-'));
  try {
    const store = new LocalDocumentStore(root);
    const pinned = await seedRulePackage(store);
    const rules = await resolveStartupDefaultRules(store, {
      OFFSCREEN_DEFAULT_RULE_ROOT_HASH: pinned.rootHash,
    });
    assert.deepEqual(rules, {
      ruleSetId: pinned.ruleSetId,
      rootHash: pinned.rootHash,
      revision: pinned.revision,
      engine: pinned.engine,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveStartupDefaultRules rejects conflicting hash and source configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-api-rule-conflict-'));
  try {
    const store = new LocalDocumentStore(root);
    const pinned = await seedRulePackage(store);
    await assert.rejects(
      () =>
        resolveStartupDefaultRules(store, {
          OFFSCREEN_DEFAULT_RULE_ROOT_HASH: pinned.rootHash,
          OFFSCREEN_DEFAULT_RULE_SOURCE: 'content/rules/srd-5.2.1-subset',
        }),
      /cannot both be set/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveStartupDefaultRules rejects invalid pinned hash before manifest lookup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-api-bad-hash-'));
  try {
    const store = new LocalDocumentStore(root);
    await assert.rejects(
      () =>
        resolveStartupDefaultRules(store, {
          OFFSCREEN_DEFAULT_RULE_ROOT_HASH: 'not-a-hash',
        }),
      /SHA-256 hash/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveStartupDefaultRules fails when pinned manifest is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-api-missing-manifest-'));
  try {
    const store = new LocalDocumentStore(root);
    await assert.rejects(
      () =>
        resolveStartupDefaultRules(store, {
          OFFSCREEN_DEFAULT_RULE_ROOT_HASH:
            'a'.repeat(64),
        }),
      /not found|missing|ENOENT/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveStartupDefaultRules preserves directory import when hash is unset', async () => {
  const documentRoot = await mkdtemp(
    join(tmpdir(), 'offscreen-api-compose-rules-'),
  );
  try {
    const store = new LocalDocumentStore(documentRoot);
    const sourceRoot = join(
      import.meta.dirname,
      '..',
      '..',
      '..',
      'content',
      'rules',
      'srd-5.2.1-subset',
    );
    const imported = await importRulePackageDirectory(store, sourceRoot);
    const rules = await resolveStartupDefaultRules(store, {
      OFFSCREEN_DEFAULT_RULE_SOURCE: sourceRoot,
    });
    assert.equal(rules.rootHash, imported.rootHash);
    assert.equal(rules.ruleSetId, imported.manifest.ruleSetId);
    assert.deepEqual(rules.engine, imported.manifest.engine);
  } finally {
    await rm(documentRoot, { recursive: true, force: true });
  }
});
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { LocalDocumentStore } from '@offscreen/documents';
import {
  importRulePackageDirectory,
  importStartPackageDirectory,
  importWorldPackage,
  importWorldPackageDirectory,
  maximumWorldImportFileBytes,
} from '../dist/index.js';

test('provider-free world import preserves authored pages and exposes section metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-world-import-'));
  const store = new LocalDocumentStore(root);
  const worldId = randomUUID();
  const imported = await importWorldPackage(store, {
    worldId,
    operationId: randomUUID(),
    title: 'The Glass Sea',
    files: [
      {
        path: 'WORLD.md',
        content:
          '# The Glass Sea\n\nUse the glossary before reading local histories.',
      },
      {
        path: 'history/first-tide.txt',
        content: '# The First Tide\n\nThe mirrors learned to remember rain.',
      },
    ],
  });
  assert.equal(imported.manifest.entries.length, 2);
  assert.equal(
    imported.manifest.orientationDocumentId,
    imported.manifest.entries.find((entry) => entry.path === 'WORLD.md')
      ?.documentId,
  );
  const history = imported.manifest.entries.find(
    (entry) => entry.path === 'history/first-tide.md',
  );
  assert.ok(history);
  assert.deepEqual(history?.sections, [
    { heading: 'The First Tide', level: 1, line: 1 },
  ]);
  assert.equal(
    (await store.readDocument(history.objectHash)).body,
    '# The First Tide\n\nThe mirrors learned to remember rain.',
  );
});

test('local world directory import is bounded and reports ignored files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-world-directory-'));
  const source = join(root, 'authored-world');
  await mkdir(join(source, 'places'), { recursive: true });
  await writeFile(
    join(source, 'WORLD.md'),
    '# Small World\n\nRead only what matters.',
  );
  await writeFile(
    join(source, 'places', 'tower.txt'),
    '# Tower\n\nIt has no doors.',
  );
  await writeFile(join(source, 'map.png'), 'not imported');
  const store = new LocalDocumentStore(join(root, 'store'));
  const imported = await importWorldPackageDirectory(store, {
    sourceDirectory: source,
    worldId: randomUUID(),
    operationId: randomUUID(),
    title: 'Small World',
  });
  assert.deepEqual(imported.ignoredPaths, ['map.png']);
  assert.deepEqual(
    imported.manifest.entries.map((entry) => entry.path).sort(),
    ['places/tower.md', 'WORLD.md'].sort(),
  );
});

test('default rule source imports focused Markdown pages without inference', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-default-rules-'));
  const store = new LocalDocumentStore(root);
  const imported = await importRulePackageDirectory(
    store,
    join(
      import.meta.dirname,
      '..',
      '..',
      '..',
      'content',
      'rules',
      'srd-5.2.1-subset',
    ),
  );
  assert.equal(imported.manifest.entries.length, 7);
  assert.deepEqual(imported.manifest.engine, {
    adapterId: 'srd-5.2.1-subset',
    adapterVersion: 1,
  });
  const checks = imported.manifest.entries.find(
    (entry) => entry.path === 'checks/ability-checks.md',
  );
  assert.ok(checks?.topics.includes('ability-check'));
  assert.ok(checks && checks.sourceBytes < 4096);
  assert.match(
    (await store.readDocument(checks.objectHash)).body,
    /d20 \+ ability modifier/,
  );
});

test('start package directory import preserves authored activation boundaries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-start-import-'));
  const source = join(root, 'source');
  await mkdir(join(source, 'possibilities'), { recursive: true });
  await mkdir(join(source, 'obligations'), { recursive: true });
  await writeFile(
    join(source, 'START.md'),
    '# A shore without people\n\nOnly tides and cells.',
  );
  await writeFile(
    join(source, 'possibilities', 'bloom.md'),
    '# Possible bloom\n\nA red bloom may form if the water warms.',
  );
  await writeFile(
    join(source, 'obligations', 'tide.json'),
    JSON.stringify({
      version: 1,
      obligation: {
        id: randomUUID(),
        revision: 1,
        source: { id: 'tidal-start', revision: 1 },
        label: 'The tide rises',
        visibility: { kind: 'hidden' },
        consequence: {
          kind: 'condition.set.v1',
          condition: {
            id: 'high-tide',
            label: 'High tide',
            value: true,
          },
        },
        followUp: 'report',
        due: { kind: 'game-second', gameSecond: 12 },
      },
    }),
  );
  const startPackageId = randomUUID();
  await writeFile(
    join(source, 'start-package.json'),
    JSON.stringify({
      format: 'offscreen.start-package-source.v1',
      startPackageId,
      authorOperationId: randomUUID(),
      title: 'Tidal microbe',
      worlds: [],
      rules: {
        ruleSetId: randomUUID(),
        rootHash: 'a'.repeat(64),
        revision: 1,
        engine: { adapterId: 'offscreen-core', adapterVersion: 1 },
      },
      documents: [
        {
          path: 'START.md',
          kind: 'orientation',
          activation: 'initial-canon',
          authority: 'canon',
          visibility: 'player-known',
        },
        {
          path: 'possibilities/bloom.md',
          kind: 'private-possibility',
          activation: 'private-possibility',
          authority: 'noncanonical',
          visibility: 'storyteller-private',
        },
        {
          path: 'obligations/tide.json',
          kind: 'world-obligation',
          activation: 'executable-obligation',
          authority: 'canon',
          visibility: 'storyteller-private',
          schemaId: 'world-obligation.v1',
        },
      ],
    }),
  );
  const store = new LocalDocumentStore(join(root, 'store'));
  const imported = await importStartPackageDirectory(store, source);
  assert.equal(imported.manifest.startPackageId, startPackageId);
  assert.deepEqual(
    imported.manifest.entries.map((entry) => [entry.path, entry.activation]),
    [
      ['obligations/tide.json', 'executable-obligation'],
      ['possibilities/bloom.md', 'private-possibility'],
      ['START.md', 'initial-canon'],
    ],
  );
  const obligation = imported.manifest.entries.find(
    (entry) => entry.path === 'obligations/tide.json',
  );
  assert.ok(obligation);
  const obligationData = (
    await store.readStructuredDocument(obligation.objectHash)
  ).data;
  assert.equal(obligationData.version, 1);
  assert.equal(obligationData.obligation.due.gameSecond, 12);
  assert.equal(obligationData.obligation.consequence.condition.id, 'high-tide');
});

test('world import rejects symlink, traversal, duplicate paths, missing orientation and oversize files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-world-negative-'));
  const store = new LocalDocumentStore(join(root, 'store'));
  const worldId = randomUUID();
  const operationId = randomUUID();
  await assert.rejects(
    importWorldPackage(store, {
      worldId,
      operationId,
      title: 'Missing orientation',
      files: [{ path: 'notes/only.txt', content: 'no world' }],
    }),
    /WORLD.md/,
  );
  await assert.rejects(
    importWorldPackage(store, {
      worldId,
      operationId,
      title: 'Duplicate',
      files: [
        { path: 'WORLD.md', content: '# Same\n' },
        { path: 'notes/a.txt', content: '# Page\n' },
        { path: 'notes/a.md', content: '# Page again\n' },
      ],
    }),
    /unique after normalization/,
  );
  await assert.rejects(
    importWorldPackage(store, {
      worldId,
      operationId,
      title: 'Traversal',
      files: [{ path: '../WORLD.md', content: '# Out\n' }],
    }),
    /cannot traverse/,
  );
  await assert.rejects(
    importWorldPackage(store, {
      worldId,
      operationId,
      title: 'Oversize',
      files: [
        {
          path: 'WORLD.md',
          content: 'x'.repeat(maximumWorldImportFileBytes + 1),
        },
      ],
    }),
    /size limit/,
  );
  const source = join(root, 'linked');
  await mkdir(source, { recursive: true });
  await writeFile(join(source, 'WORLD.md'), '# Linked\n');
  await symlink(join(source, 'WORLD.md'), join(source, 'alias.md'));
  await assert.rejects(
    importWorldPackageDirectory(store, {
      sourceDirectory: source,
      worldId,
      operationId,
      title: 'Linked',
    }),
    /symbolic link/,
  );
});

test('rule import rejects an invalid license', async () => {
  const root = await mkdtemp(join(tmpdir(), 'offscreen-rule-license-'));
  const source = join(root, 'rules');
  await mkdir(source, { recursive: true });
  await writeFile(join(source, 'RULES.md'), '# Rules\n\nA check uses a die.');
  await writeFile(
    join(source, 'rule-package.json'),
    JSON.stringify({
      format: 'offscreen.rule-package-source.v1',
      ruleSetId: randomUUID(),
      authorOperationId: randomUUID(),
      title: 'Broken license',
      engine: { adapterId: 'offscreen-core', adapterVersion: 1 },
      license: {
        name: 'Test',
        source: 'not-a-url',
        attribution: 'none',
      },
      pages: [{ path: 'RULES.md', topics: ['orientation'] }],
    }),
  );
  const store = new LocalDocumentStore(join(root, 'store'));
  await assert.rejects(
    importRulePackageDirectory(store, source),
    /url|invalid/i,
  );
});

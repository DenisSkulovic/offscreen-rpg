#!/usr/bin/env node
/**
 * Idempotent local lab demo bootstrap: staff principal, pinned fixture import,
 * and one campaign from the pinned start package via application use cases.
 *
 * Idempotency: staff by auth user id (bootstrapAdminStaff); content by pinned
 * roots (importPinnedFixture); campaign story id from LOCAL_DEMO_CAMPAIGN_KEY
 * (default "local-demo") and auth user id — see stableDemoStoryId().
 *
 * Requires LOCAL_DEMO_SEED=1. Refuses NODE_ENV=production and non-loopback APP_ORIGIN.
 * Reuses the existing lab Seyda Neen pin (scripts/repo-tools/import-pinned-fixture.mjs).
 *
 * Usage:
 *   LOCAL_DEMO_SEED=1 node scripts/repo-tools/seed-local-demo.mjs \
 *     --auth-user-id <better-auth-user-id> \
 *     --environment local \
 *     --actor-label <operator> \
 *     [--s3 | --store <directory>]
 */
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importPinnedFixture } from './import-pinned-fixture.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../..');
const requireFromRepo = createRequire(joinRequirePath(repoRoot, 'package.json'));

function joinRequirePath(...parts) {
  return resolve(...parts).replace(/\\/g, '/');
}

const { createDatabase, readDatabaseConfig } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/db/dist/src/index.js'),
);
const { bootstrapAdminStaff } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/application/dist/admin/index.js'),
);
const { createDrafts } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/application/dist/drafts/index.js'),
);
const { createScriptedOpenings } = requireFromRepo(
  joinRequirePath(
    repoRoot,
    'packages/application/dist/generations/scripted-openings.js',
  ),
);
const { createStories } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/application/dist/stories/index.js'),
);
const { createStorytellerRuntime } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/application/dist/storyteller/runtime.js'),
);
const { LocalDocumentStore, createDocumentStoreFromEnv } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/documents/dist/index.js'),
);
const { offlineExecution } = requireFromRepo(
  joinRequirePath(repoRoot, 'packages/storyteller/dist/src/tasks/index.js'),
);

/** UUID namespace for deterministic demo story ids (pinned start package id). */
const DEMO_STORY_NAMESPACE = '6d5e6ae5-e0b2-4689-b780-3c8e0e1711f5';

const PINNED_RULES = {
  ruleSetId: 'd73c2a94-1f5b-5a83-91c3-3a9f9897e6bb',
  adapterId: 'srd-5.2.1-subset',
  adapterVersion: 1,
};

const PINNED_START = {
  startPackageId: '6d5e6ae5-e0b2-4689-b780-3c8e0e1711f5',
  worldId: '7c14e5bc-4d72-4f8c-9a6b-97f334b83c11',
};

const DEMO_OPENING_CONTENT_ID = 'seyda-neen-arrival.v1';

export function assertLocalDemoSeedEnvironment() {
  if (process.env.LOCAL_DEMO_SEED !== '1') {
    throw new Error('Refusing to run without LOCAL_DEMO_SEED=1');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run when NODE_ENV=production');
  }
  const origin = process.env.APP_ORIGIN?.trim();
  if (!origin) return;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('Refusing invalid APP_ORIGIN');
  }
  if (parsed.protocol !== 'http:') {
    throw new Error('Refusing non-http APP_ORIGIN');
  }
  const host = parsed.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('Refusing non-loopback APP_ORIGIN');
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

function repoRootFromScript() {
  return repoRoot;
}

export function stableDemoStoryId(campaignKey, authUserId) {
  const namespace = Buffer.from(DEMO_STORY_NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(namespace)
    .update(`${campaignKey}\0${authUserId}`, 'utf8')
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readStartReferenceHash(documentStore, rootHash) {
  const manifest = await documentStore.readManifest(rootHash);
  const startEntry = manifest.entries.find(
    (entry) => entry.path === 'start/reference.json',
  );
  if (!startEntry) return null;
  const document = await documentStore.readStructuredDocument(
    startEntry.objectHash,
  );
  if (document.schemaId !== 'start-reference.v1') return null;
  const data = document.data;
  return typeof data?.rootHash === 'string' ? data.rootHash : null;
}

async function findExistingDemoCampaign(
  database,
  documentStore,
  ownerId,
  storyId,
  expectedStartRootHash,
) {
  const { rows } = await database.db.$client.query(
    `select id, owner_id, document_root_hash
     from story
     where id = $1 and owner_id = $2`,
    [storyId, ownerId],
  );
  const existing = rows[0];
  if (!existing?.document_root_hash) return null;
  const pinnedStartRoot = await readStartReferenceHash(
    documentStore,
    existing.document_root_hash,
  );
  if (pinnedStartRoot !== expectedStartRootHash) {
    throw new Error(
      'Existing demo campaign start reference does not match pinned root',
    );
  }
  return {
    storyId: existing.id,
    documentRootHash: existing.document_root_hash,
    idempotent: true,
  };
}

async function seedDemoCampaign({
  database,
  documentStore,
  ownerId,
  storyId,
  importResult,
}) {
  const defaultRules = {
    ruleSetId: PINNED_RULES.ruleSetId,
    rootHash: importResult.ruleRootHash,
    revision: 1,
    engine: {
      adapterId: PINNED_RULES.adapterId,
      adapterVersion: PINNED_RULES.adapterVersion,
    },
  };
  const startReference = {
    startPackageId: PINNED_START.startPackageId,
    rootHash: importResult.startRootHash,
    revision: importResult.revision ?? 1,
  };

  const existing = await findExistingDemoCampaign(
    database,
    documentStore,
    ownerId,
    storyId,
    importResult.startRootHash,
  );
  if (existing) {
    return {
      storyId: existing.storyId,
      created: false,
      documentRootHash: existing.documentRootHash,
      startRootHash: importResult.startRootHash,
    };
  }

  const drafts = createDrafts(database);
  const draftId = randomUUID();
  const generationId = randomUUID();
  await drafts.save(ownerId, draftId, {
    title: 'Local demo campaign',
    premise: 'A pinned lab opening for local Kubernetes development.',
    storytellingDirection: 'Keep the lab path deterministic and idempotent.',
    storyteller: { id: 'absurd-action-comedy', revision: 1 },
    expectedRevision: 0,
  });

  await createScriptedOpenings(database, offlineExecution, undefined, {
    documentStore,
  }).request(
    ownerId,
    draftId,
    generationId,
    1,
    DEMO_OPENING_CONTENT_ID,
    startReference,
  );

  const runtime = createStorytellerRuntime(database, {
    documentStore,
    realDurationMs: () => 100,
  });
  await runtime.complete(generationId);

  const stories = createStories(database, {
    documentStore,
    defaultRules,
  });
  const campaign = {
    mechanics: true,
    locked: false,
    pace: { kind: 'instant' },
    time: {
      kind: 'elapsed',
      id: 'simulation-game-seconds',
      revision: 1,
      unit: {
        id: 'game-second',
        label: 'game-second',
        pluralLabel: 'gameSeconds',
        gameSecondsPerUnit: 1,
      },
      epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
    },
    worldObligations: [],
    worlds: [],
    startPackage: startReference,
  };

  await stories.startFromCandidate({
    ownerId,
    storyId,
    candidateId: generationId,
    expectedDraftRevision: 1,
    campaign,
  });

  const { rows: createdRows } = await database.db.$client.query(
    `select document_root_hash from story where id = $1`,
    [storyId],
  );

  return {
    storyId,
    created: true,
    documentRootHash: createdRows[0]?.document_root_hash ?? null,
    startRootHash: importResult.startRootHash,
  };
}

export async function runSeedLocalDemo(argv = process.argv) {
  const authUserId = argFrom(argv, '--auth-user-id');
  const environment = argFrom(argv, '--environment');
  const actorLabel = argFrom(argv, '--actor-label');

  if (!authUserId || !environment || !actorLabel) {
    throw new Error(
      'Required: --auth-user-id <id> --environment local --actor-label <label>',
    );
  }

  if (environment !== 'local') {
    throw new Error('Only --environment local is allowed for this CLI');
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required');
  }

  const s3 = argv.includes('--s3');
  const storeArg = argFrom(argv, '--store');
  if (s3 === Boolean(storeArg)) {
    throw new Error('Required: --store <directory> or --s3');
  }

  const database = createDatabase(readDatabaseConfig(process.env), (error) => {
    console.error(error);
  });

  let documentStore;
  try {
    const staff = await bootstrapAdminStaff(database, {
      authUserId,
      environment,
      actorLabel,
    });

    const importResult = await importPinnedFixture({
      storeRoot: storeArg ? resolve(storeArg) : null,
      fixtureRoot: resolve(repoRootFromScript()),
      s3,
    });

    if (s3) {
      documentStore = createDocumentStoreFromEnv(process.env);
      if (!documentStore) {
        throw new Error('S3 document store environment is required');
      }
    } else {
      documentStore = new LocalDocumentStore(resolve(storeArg));
    }

    const campaignKey =
      process.env.LOCAL_DEMO_CAMPAIGN_KEY?.trim() || 'local-demo';
    const storyId = stableDemoStoryId(campaignKey, authUserId);

    let campaignResult;
    try {
      campaignResult = await seedDemoCampaign({
        database,
        documentStore,
        ownerId: authUserId,
        storyId,
        importResult,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(`campaign-seed-unavailable: ${message}`);
      return {
        ok: false,
        exitCode: 3,
        staff,
        import: importResult,
        campaign: null,
        campaignSeedError: message,
      };
    }

    return {
      ok: true,
      exitCode: 0,
      staff,
      import: importResult,
      campaign: {
        ...campaignResult,
        campaignKey,
      },
    };
  } finally {
    await database.close();
  }
}

function argFrom(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) return null;
  return argv[index + 1];
}

async function main() {
  try {
    assertLocalDemoSeedEnvironment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }

  try {
    const result = await runSeedLocalDemo();
    if (result.exitCode !== 0) {
      return result.exitCode;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return 2;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  process.exit(await main());
}
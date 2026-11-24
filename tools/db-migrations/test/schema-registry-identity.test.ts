import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { is, Relations } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import {
  accountRelations as registryAccountRelations,
  sessionRelations as registrySessionRelations,
  userRelations as registryUserRelations,
} from '../src/registry/auth.js';
import * as admin from '../src/registry/admin.js';
import * as auth from '../src/registry/auth.js';
import * as outbox from '../src/registry/outbox.js';
import * as qa from '../src/registry/qa.js';
import * as story from '../src/registry/story.js';
import {
  accountRelations as sourceAccountRelations,
  sessionRelations as sourceSessionRelations,
  userRelations as sourceUserRelations,
} from '@offscreen/identity-persistence/auth';
import { canonicalSnapshotDigest } from '../src/canonical-snapshot.js';

const ORIGIN_SHA = '7033f654091a4fc66c7de6b0dce37e2b8fb504c1';

const BASELINE_DIGEST =
  '1958c5f5dd8d31ff703fe3a8cce383e829900f9abc4a60d5c8d29eed0de34bad';

const IDENTITY_EXPORTS = [
  'user',
  'session',
  'account',
  'verification',
  'rateLimit',
  'terminalDevicePairing',
  'terminalAccessToken',
] as const;

const AUTH_RELATION_EXPORTS = [
  'userRelations',
  'sessionRelations',
  'accountRelations',
] as const;

const STORY_EXPORTS = [
  'storyDraft',
  'generation',
  'draftOpening',
  'story',
  'storyDocumentCommit',
  'storyPassage',
  'storySceneCheckpoint',
  'storyControl',
  'storyResolution',
  'storyItem',
  'storyViewerVisit',
  'storyViewerVisitOpen',
  'storyViewerVisitAck',
  'storyPublicInspectTarget',
  'customIntentCandidate',
  'storyLaunch',
  'campaign',
  'worldObligation',
  'worldObligationEvent',
  'campaignSettings',
  'campaignCommand',
  'storyDelegationPolicy',
  'storyDelegationPolicyCommand',
  'gameOffer',
  'campaignDelegatedOffer',
  'gameActivity',
  'gameActivityEvent',
  'campaignReport',
  'gameRoll',
  'campaignConsequence',
  'gameActionReceipt',
  'gameActionExecution',
  'gameActionExecutionEvent',
  'storyPublicEvent',
  'storytellerPreset',
  'storytellerPublication',
  'storytellerContextCapture',
  'storytellerContextCaptureRearm',
  'storytellerMemoryExploration',
  'storytellerDispatchReview',
  'storytellerDispatchReviewDecision',
  'storytellerFunding',
  'storytellerRun',
  'storytellerOperation',
  'storytellerAttempt',
  'storytellerUsageAllocation',
  'storytellerRetry',
  'storytellerPromptProvenance',
  'storytellerExecutionStage',
  'storytellerSavedRepairAudit',
  'storytellerCurrentPlatformPolicy',
  'storytellerCurrentOwnerGrant',
  'storytellerWriterMission',
  'storytellerWriterStep',
  'storytellerWriterChild',
] as const;

const ADMIN_EXPORTS = [
  'adminStaffPrincipal',
  'adminStaffSession',
  'adminCapabilityAssignment',
  'adminAuditEvent',
  'adminCase',
  'adminCaseLink',
] as const;

const QA_EXPORTS = ['qaRun', 'qaRunStage'] as const;

const OUTBOX_EXPORTS = ['outbox'] as const;

const ALL_TABLE_EXPORTS = [
  ...IDENTITY_EXPORTS,
  ...STORY_EXPORTS,
  ...ADMIN_EXPORTS,
  ...QA_EXPORTS,
  ...OUTBOX_EXPORTS,
] as const;

function qualifiedName(table: PgTable): string {
  const cfg = getTableConfig(table);
  const schema = cfg.schema ?? 'public';
  return `${schema}.${cfg.name}`;
}

function collectTableExports(
  moduleNs: Record<string, unknown>,
  expected: readonly string[],
): string[] {
  const found: string[] = [];
  for (const name of expected) {
    const value = moduleNs[name];
    assert.ok(value !== undefined, `missing export ${name}`);
    assert.ok(is(value, PgTable), `${name} is not a PgTable`);
    found.push(name);
  }
  return found;
}

const fixturePath = path.resolve('test/fixtures/schema-baseline.json');

function loadBaseline(): Record<string, unknown> {
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<
    string,
    unknown
  >;
}

test('registry exports match expected partition counts', () => {
  assert.equal(IDENTITY_EXPORTS.length, 7);
  assert.equal(STORY_EXPORTS.length, 55);
  assert.equal(ADMIN_EXPORTS.length, 6);
  assert.equal(QA_EXPORTS.length, 2);
  assert.equal(OUTBOX_EXPORTS.length, 1);
  assert.equal(ALL_TABLE_EXPORTS.length, 71);
  assert.equal(AUTH_RELATION_EXPORTS.length, 3);

  collectTableExports(auth, IDENTITY_EXPORTS);
  collectTableExports(story, STORY_EXPORTS);
  collectTableExports(admin, ADMIN_EXPORTS);
  collectTableExports(qa, QA_EXPORTS);
  collectTableExports(outbox, OUTBOX_EXPORTS);
});

test('registry exposes 71 unique qualified SQL table names', () => {
  const names = new Set<string>();
  const modules: Array<[Record<string, unknown>, readonly string[]]> = [
    [auth, IDENTITY_EXPORTS],
    [story, STORY_EXPORTS],
    [admin, ADMIN_EXPORTS],
    [qa, QA_EXPORTS],
    [outbox, OUTBOX_EXPORTS],
  ];
  for (const [mod, expected] of modules) {
    for (const exportName of expected) {
      const table = mod[exportName];
      assert.ok(is(table, PgTable));
      const q = qualifiedName(table);
      assert.ok(!names.has(q), `duplicate qualified name ${q}`);
      names.add(q);
    }
  }
  assert.equal(names.size, 71);

  const baseline = loadBaseline();
  const tables = baseline.tables as Record<string, unknown>;
  const snapshotNames = Object.keys(tables).sort();
  const registryNames = [...names].sort();
  assert.deepEqual(registryNames, snapshotNames);
});

test('frozen synthetic baseline digest matches origin capture', () => {
  const baseline = loadBaseline();
  assert.equal(canonicalSnapshotDigest(baseline), BASELINE_DIGEST);
  assert.equal(ORIGIN_SHA, '7033f654091a4fc66c7de6b0dce37e2b8fb504c1');
});

test('auth relation exports are identical to @offscreen/identity-persistence/auth', () => {
  for (const name of AUTH_RELATION_EXPORTS) {
    const value = auth[name];
    assert.ok(is(value, Relations), `${name} is not Relations`);
  }
  assert.equal(registryUserRelations, sourceUserRelations);
  assert.equal(registrySessionRelations, sourceSessionRelations);
  assert.equal(registryAccountRelations, sourceAccountRelations);
});

test('mutating a copied snapshot table name breaks the baseline digest', () => {
  const copy = structuredClone(loadBaseline()) as {
    tables: Record<string, Record<string, unknown>>;
  };
  const firstKey = Object.keys(copy.tables).sort()[0]!;
  copy.tables[firstKey]!.name = 'mutated_table_name';
  assert.notEqual(canonicalSnapshotDigest(copy), BASELINE_DIGEST);
});

test('mutating a copied snapshot column default breaks the baseline digest', () => {
  const copy = structuredClone(loadBaseline()) as {
    tables: Record<string, Record<string, unknown>>;
  };
  const firstKey = Object.keys(copy.tables).sort()[0]!;
  const table = copy.tables[firstKey]! as {
    columns: Record<string, { default?: unknown }>;
  };
  const colKey = Object.keys(table.columns).sort()[0]!;
  table.columns[colKey]!.default = 'mutated_default';
  assert.notEqual(canonicalSnapshotDigest(copy), BASELINE_DIGEST);
});

test('mutating a copied snapshot foreign key breaks the baseline digest', () => {
  const copy = structuredClone(loadBaseline()) as {
    tables: Record<string, { foreignKeys: Record<string, unknown> }>;
  };
  const withFk = Object.entries(copy.tables).find(
    ([, t]) => Object.keys(t.foreignKeys ?? {}).length > 0,
  );
  assert.ok(withFk, 'expected at least one table with foreign keys');
  const [, table] = withFk;
  const fkKey = Object.keys(table.foreignKeys).sort()[0]!;
  (table.foreignKeys[fkKey] as { tableFrom: string }).tableFrom =
    'mutated_from_table';
  assert.notEqual(canonicalSnapshotDigest(copy), BASELINE_DIGEST);
});
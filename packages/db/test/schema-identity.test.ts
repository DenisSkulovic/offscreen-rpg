import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import * as storyteller from '../src/schema/storyteller';

const EXPECTED_EXPORTS = [
  'storytellerAttempt',
  'storytellerContextCapture',
  'storytellerContextCaptureRearm',
  'storytellerCurrentOwnerGrant',
  'storytellerCurrentPlatformPolicy',
  'storytellerDispatchReview',
  'storytellerDispatchReviewDecision',
  'storytellerExecutionStage',
  'storytellerFunding',
  'storytellerMemoryExploration',
  'storytellerOperation',
  'storytellerPromptProvenance',
  'storytellerPublication',
  'storytellerRetry',
  'storytellerRun',
  'storytellerSavedRepairAudit',
  'storytellerUsageAllocation',
  'storytellerWriterChild',
  'storytellerWriterMission',
  'storytellerWriterStep',
] as const;

/** Frozen from getTableConfig before the lifecycle-file split. */
const BASELINE_FINGERPRINT =
  'd6a9a98b262f8c31869e5ec75bc6f2fd14ac2a4f3c811a3cabfe52748759f3ba';

function sqlText(value: unknown): unknown {
  if (value == null) {
    return null;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, inner) =>
        typeof inner === 'bigint' ? String(inner) : inner,
      ),
    );
  } catch {
    return String(value);
  }
}

function fingerprint() {
  const out: Record<string, unknown> = {};
  for (const [exportName, table] of Object.entries(storyteller)) {
    if (!is(table, PgTable)) {
      continue;
    }
    const cfg = getTableConfig(table);
    out[exportName] = {
      sqlName: cfg.name,
      schema: cfg.schema ?? null,
      enableRLS: cfg.enableRLS,
      columns: cfg.columns.map((c) => ({
        name: c.name,
        columnType: c.columnType,
        dataType: c.dataType,
        notNull: c.notNull,
        hasDefault: c.hasDefault,
        isUnique: c.isUnique,
        uniqueName: c.uniqueName ?? null,
        primary: c.primary,
        generated: c.generated ?? null,
        enumValues: c.enumValues ?? null,
        default: sqlText(c.default),
      })),
      indexes: cfg.indexes.map((i) => ({
        name: i.config.name,
        unique: i.config.unique,
        columns: i.config.columns.map((c) =>
          c && typeof c === 'object' && 'name' in c ? c.name : String(c),
        ),
        where: sqlText(i.config.where),
      })),
      checks: cfg.checks.map((c) => ({
        name: c.name,
        value: sqlText(c.value),
      })),
      primaryKeys: cfg.primaryKeys.map((p) => ({
        name: p.name,
        columns: p.columns.map((c) => c.name),
      })),
      uniqueConstraints: cfg.uniqueConstraints.map((u) => ({
        name: u.name,
        columns: u.columns.map((c) => c.name),
        nullsNotDistinct: u.nullsNotDistinct,
      })),
      foreignKeys: cfg.foreignKeys.map((f) => {
        const ref = f.reference();
        const foreignTable = ref.foreignColumns[0]?.table;
        return {
          name: f.getName(),
          onDelete: f.onDelete,
          onUpdate: f.onUpdate,
          columns: ref.columns.map((c) => c.name),
          foreignTable: foreignTable ? getTableConfig(foreignTable).name : null,
          foreignColumns: ref.foreignColumns.map((c) => c.name),
        };
      }),
      policies: cfg.policies.length,
    };
  }
  return out;
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

test('storyteller barrel keeps the same 20 Drizzle table identities', () => {
  const current = fingerprint();
  const names = Object.keys(current).sort();
  assert.deepEqual(names, [...EXPECTED_EXPORTS]);
  const sorted: Record<string, unknown> = {};
  for (const name of names) {
    sorted[name] = current[name];
  }
  assert.equal(digest(sorted), BASELINE_FINGERPRINT);
});

test('a dropped or renamed table fingerprint does not match the baseline', () => {
  const current = fingerprint();
  const sorted: Record<string, unknown> = {};
  for (const name of Object.keys(current).sort()) {
    if (name === 'storytellerFunding') {
      continue;
    }
    sorted[name] = current[name];
  }
  assert.notEqual(digest(sorted), BASELINE_FINGERPRINT);
  assert.equal(Object.keys(sorted).length, 19);
});

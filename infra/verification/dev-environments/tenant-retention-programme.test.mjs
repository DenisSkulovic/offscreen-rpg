import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DEV_KIND_CONTEXT,
  REQUIRED_MEM_KIB,
  SIX_SLOT_DEPLOYMENTS,
} from './lifecycle-programme.mjs';
import {
  compareTenantMarkerSnapshots,
  runDataTenantRetentionProgramme,
  TENANT_MARKER_ROW_ID,
  TENANT_MARKER_TABLE,
} from './tenant-retention-programme.mjs';
import { DEV_LIFECYCLE_LIVE_TOKEN } from './recovery-programme.mjs';

function baseRecord(slotId, worktree) {
  return {
    slotId,
    worktreePath: worktree,
    cluster: 'offscreen-dev',
    namespace: `offscreen-${slotId}`,
    ports: { game: 3000, control: 3001, tilt: 10350, spare: 3002 },
    resourceUids: { ns: 'uid-1' },
    lease: null,
    processIdentity: null,
  };
}

function makeTenantPorts(overrides = {}) {
  const worktree = overrides.worktree ?? '/tmp/inf52-tenant';
  const slotId = overrides.slotId ?? 'dev-9';
  const registryRoot =
    overrides.registryRoot ?? mkdtempSync(join(tmpdir(), 'inf52-tenant-'));
  const sql = new Map();
  const s3 = new Map();
  let deleteFails = overrides.deleteFails ?? false;

  return {
    slotId,
    sql,
    s3,
    ports: {
      registryRoot,
      sessionRoot: join(registryRoot, 'sessions'),
      getEnvironment: (_root, id) =>
        id === slotId ? baseRecord(slotId, worktree) : null,
      readEnvironmentSession: () => null,
      gitWorktreeState: () => ({ ok: true, head: 'abc', dirty: false }),
      readKubeContext: () => DEV_KIND_CONTEXT,
      readMemAvailableKib: () => REQUIRED_MEM_KIB + 1024,
      listActiveSlotIds: () => [],
      getDefaultEnvironment: () => null,
      proveOwnedSqlIdentity: async () => ({
        ok: true,
        database: 'dev_9',
      }),
      proveOwnedS3Identity: async () => ({
        ok: true,
        bucket: 'offscreen-dev-9',
      }),
      proveOwnedTemporalIdentity: async () => ({
        ok: true,
        namespace: 'offscreen-dev-9',
        serverIdentity: 'temporal-dev-9',
      }),
      writeSqlMarker: async (_slot, marker) => {
        sql.set(marker.rowId, marker.rowValue);
      },
      readSqlMarker: async (_slot, marker) => sql.get(marker.rowId) ?? null,
      deleteSqlMarker: async (_slot, marker) => {
        if (deleteFails) throw new Error('delete failed');
        sql.delete(marker.rowId);
      },
      writeS3Marker: async (_slot, marker, body) => {
        s3.set(marker.key, body);
      },
      readS3Marker: async (_slot, marker) => s3.get(marker.key) ?? null,
      deleteS3Marker: async (_slot, marker) => {
        if (deleteFails) throw new Error('delete failed');
        s3.delete(marker.key);
      },
      readTemporalIdentity: async () => ({
        namespace: 'offscreen-dev-9',
        serverIdentity: 'temporal-dev-9',
      }),
      runPnpm: async () => ({ code: 0 }),
      readParkedState: ({ slotId: id }) => ({
        slotId: id,
        replicasByDeploy: Object.fromEntries(
          SIX_SLOT_DEPLOYMENTS.map((name) => [name, 0]),
        ),
        ownedListeners: [],
        ownedProcesses: [],
        reservationRetained: true,
      }),
      now: () => Date.now(),
      ...overrides.portOverrides,
    },
  };
}

test('compareTenantMarkerSnapshots detects sql drift', () => {
  const before = {
    sql: {
      database: 'dev_9',
      table: TENANT_MARKER_TABLE,
      rowId: TENANT_MARKER_ROW_ID,
      rowValue: 'same',
    },
    s3: null,
    temporal: null,
  };
  const after = {
    ...before,
    sql: { ...before.sql, rowValue: 'changed' },
  };
  const outcome = compareTenantMarkerSnapshots(before, after);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'sql-tenant-changed');
});

test('DATA-01 survives park and resume with marker cleanup', async () => {
  const fixture = makeTenantPorts();
  const result = await runDataTenantRetentionProgramme({
    scenarioId: 'DATA-01',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-tenant',
    ownedSlotId: 'dev-9',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
  assert.equal(fixture.sql.size, 0);
  assert.equal(fixture.s3.size, 0);
  assert.ok(result.cleanup.some((row) => row.action === 'delete-sql-marker'));
});

test('DATA-01 blocks when tenant identity cannot be proven', async () => {
  const fixture = makeTenantPorts({
    portOverrides: {
      proveOwnedSqlIdentity: async () => ({ ok: false }),
    },
  });
  const result = await runDataTenantRetentionProgramme({
    scenarioId: 'DATA-01',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-tenant',
    ownedSlotId: 'dev-9',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'tenant-identity-unproven');
});

test('failed marker cleanup is recorded', async () => {
  const fixture = makeTenantPorts({ deleteFails: true });
  const result = await runDataTenantRetentionProgramme({
    scenarioId: 'DATA-01',
    live: true,
    authorizeToken: DEV_LIFECYCLE_LIVE_TOKEN,
    worktree: '/tmp/inf52-tenant',
    ownedSlotId: 'dev-9',
    ports: fixture.ports,
  });
  assert.equal(result.status, 'PASS');
  assert.ok(
    result.cleanup.some(
      (row) => row.action === 'delete-markers' && row.status === 'FAIL',
    ),
  );
});
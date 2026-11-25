import {
  DEV_LIFECYCLE_LIVE_TOKEN,
  LIFECYCLE_BOUNDS,
  assessLifecycleActivationPreconditions,
  captureOwnerRegistryIdentity,
  refuseUnlessLiveAuthorized,
  verifyParkedState,
} from './lifecycle-programme.mjs';

export { DEV_LIFECYCLE_LIVE_TOKEN };

export const DATA_TENANT_SCENARIO_IDS = Object.freeze(['DATA-01']);
export const TENANT_MARKER_TABLE = 'inf52_verification_marker';
export const TENANT_MARKER_ROW_ID = 'inf52-row';

/** @typedef {'PASS' | 'FAIL' | 'BLOCKED' | 'NOT-RUN'} ProgrammeStatus */

/**
 * @typedef {{
 *   database: string,
 *   table: string,
 *   rowId: string,
 *   rowValue: string,
 * }} SqlMarkerRef
 */

/**
 * @typedef {{
 *   bucket: string,
 *   key: string,
 *   etag: string,
 * }} S3MarkerRef
 */

/**
 * @typedef {{
 *   namespace: string,
 *   serverIdentity: string,
 * }} TemporalMarkerRef
 */

/**
 * @typedef {{
 *   sql: SqlMarkerRef | null,
 *   s3: S3MarkerRef | null,
 *   temporal: TemporalMarkerRef | null,
 * }} TenantMarkerSnapshot
 */

/**
 * @typedef {{
 *   registryRoot: string,
 *   sessionRoot: string,
 *   getEnvironment: (registryRoot: string, slotId: string) => object | null,
 *   readEnvironmentSession: (sessionRoot: string, slotId: string) => object | null,
 *   gitWorktreeState: (worktree: string) => { ok: boolean, dirty?: boolean, reason?: string },
 *   readKubeContext: () => string | null,
 *   readMemAvailableKib: () => number | null,
 *   listActiveSlotIds: (registryRoot: string, sessionRoot: string) => string[],
 *   getDefaultEnvironment: (registryRoot: string, worktree: string) => object | null,
 *   proveOwnedSqlIdentity: (
 *     slotId: string,
 *   ) => Promise<{ ok: boolean, reason?: string, database?: string }>,
 *   proveOwnedS3Identity: (
 *     slotId: string,
 *   ) => Promise<{ ok: boolean, reason?: string, bucket?: string }>,
 *   proveOwnedTemporalIdentity: (
 *     slotId: string,
 *   ) => Promise<{ ok: boolean, reason?: string, namespace?: string, serverIdentity?: string }>,
 *   writeSqlMarker: (slotId: string, marker: SqlMarkerRef) => Promise<void>,
 *   readSqlMarker: (slotId: string, marker: SqlMarkerRef) => Promise<string | null>,
 *   deleteSqlMarker: (slotId: string, marker: SqlMarkerRef) => Promise<void>,
 *   writeS3Marker: (slotId: string, marker: S3MarkerRef, body: string) => Promise<void>,
 *   readS3Marker: (slotId: string, marker: S3MarkerRef) => Promise<string | null>,
 *   deleteS3Marker: (slotId: string, marker: S3MarkerRef) => Promise<void>,
 *   readTemporalIdentity: (
 *     slotId: string,
 *   ) => Promise<TemporalMarkerRef | null>,
 *   runPnpm: (
 *     args: string[],
 *     options?: { cwd?: string, timeoutMs?: number },
 *   ) => Promise<{ code: number, timedOut?: boolean }>,
 *   readParkedState: (input: { slotId: string, registryRoot: string }) => {
 *     slotId: string,
 *     replicasByDeploy: Record<string, number>,
 *     ownedListeners: number[],
 *     ownedProcesses: number[],
 *     reservationRetained: boolean,
 *   },
 *   now: () => number,
 * }} TenantRetentionCommandPort
 */

/**
 * @param {TenantMarkerSnapshot | null | undefined} before
 * @param {TenantMarkerSnapshot | null | undefined} after
 */
export function compareTenantMarkerSnapshots(before, after) {
  if (!before || !after) {
    return { ok: false, reason: 'missing-snapshot' };
  }
  if (before.sql && after.sql) {
    if (
      before.sql.database !== after.sql.database ||
      before.sql.rowValue !== after.sql.rowValue
    ) {
      return { ok: false, reason: 'sql-tenant-changed' };
    }
  }
  if (before.s3 && after.s3) {
    if (
      before.s3.bucket !== after.s3.bucket ||
      before.s3.etag !== after.s3.etag
    ) {
      return { ok: false, reason: 's3-tenant-changed' };
    }
  }
  if (before.temporal && after.temporal) {
    if (
      before.temporal.namespace !== after.temporal.namespace ||
      before.temporal.serverIdentity !== after.temporal.serverIdentity
    ) {
      return { ok: false, reason: 'temporal-tenant-changed' };
    }
  }
  return { ok: true };
}

/**
 * @param {{
 *   scenarioId: string,
 *   live: boolean,
 *   worktree: string,
 *   ports: TenantRetentionCommandPort,
 *   ownedSlotId: string,
 *   authorizeToken?: string | null,
 * }} input
 */
export async function runDataTenantRetentionProgramme(input) {
  const started = input.ports.now();
  const refuse = refuseUnlessLiveAuthorized(input.live, {
    authorizeToken: input.authorizeToken,
  });
  if (refuse) {
    return { ...refuse, durationMs: 0, cleanup: [] };
  }

  if (!DATA_TENANT_SCENARIO_IDS.includes(input.scenarioId)) {
    return {
      status: /** @type {ProgrammeStatus} */ ('FAIL'),
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
      cleanup: [],
    };
  }

  if (!input.ownedSlotId) {
    return {
      status: 'BLOCKED',
      reason: 'owned-slot-missing',
      reasonCode: 'owned-slot-missing',
      durationMs: 0,
      cleanup: [],
    };
  }

  const owner = input.ports.getEnvironment(
    input.ports.registryRoot,
    input.ownedSlotId,
  );
  if (!owner) {
    return {
      status: 'BLOCKED',
      reason: 'unknown-environment',
      reasonCode: 'unknown-environment',
      durationMs: 0,
      cleanup: [],
    };
  }

  const identity = captureOwnerRegistryIdentity(
    owner,
    input.ports.registryRoot,
    input.ports,
  );
  if (!identity.ok) {
    return {
      status: 'BLOCKED',
      reason: identity.reason ?? 'identity-missing',
      reasonCode: identity.reason ?? 'identity-missing',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const pre = assessLifecycleActivationPreconditions({
    worktree: input.worktree,
    registryRoot: input.ports.registryRoot,
    ports: input.ports,
    ownedSlotId: input.ownedSlotId,
  });
  if (!pre.ok) {
    return {
      status: pre.status ?? 'FAIL',
      reason: pre.reason ?? 'precondition-failed',
      reasonCode: pre.reason ?? 'precondition-failed',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  const sqlIdentity = await input.ports.proveOwnedSqlIdentity(input.ownedSlotId);
  const s3Identity = await input.ports.proveOwnedS3Identity(input.ownedSlotId);
  const temporalIdentity = await input.ports.proveOwnedTemporalIdentity(
    input.ownedSlotId,
  );
  if (!sqlIdentity.ok || !s3Identity.ok || !temporalIdentity.ok) {
    return {
      status: 'BLOCKED',
      reason: 'tenant-identity-unproven',
      reasonCode: 'tenant-identity-unproven',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup: [],
    };
  }

  /** @type {TenantMarkerSnapshot} */
  const markerRefs = {
    sql: {
      database: sqlIdentity.database ?? `dev_${input.ownedSlotId.split('-')[1]}`,
      table: TENANT_MARKER_TABLE,
      rowId: TENANT_MARKER_ROW_ID,
      rowValue: `sql-${input.ownedSlotId}`,
    },
    s3: {
      bucket: s3Identity.bucket ?? `offscreen-${input.ownedSlotId}`,
      key: `inf52-marker-${input.ownedSlotId}.txt`,
      etag: `etag-${input.ownedSlotId}`,
    },
    temporal: {
      namespace:
        temporalIdentity.namespace ?? `offscreen-${input.ownedSlotId}`,
      serverIdentity:
        temporalIdentity.serverIdentity ?? `temporal-${input.ownedSlotId}`,
    },
  };

  /** @type {Array<{ action: string, status: string, reason: string | null }>} */
  const cleanup = [];

  try {
    await input.ports.writeSqlMarker(input.ownedSlotId, markerRefs.sql);
    await input.ports.writeS3Marker(
      input.ownedSlotId,
      markerRefs.s3,
      markerRefs.s3.key,
    );

    /** @type {TenantMarkerSnapshot} */
    const before = {
      sql: {
        ...markerRefs.sql,
        rowValue:
          (await input.ports.readSqlMarker(input.ownedSlotId, markerRefs.sql)) ??
          markerRefs.sql.rowValue,
      },
      s3: {
        ...markerRefs.s3,
        etag:
          (await input.ports.readS3Marker(input.ownedSlotId, markerRefs.s3)) ??
          markerRefs.s3.etag,
      },
      temporal: await input.ports.readTemporalIdentity(input.ownedSlotId),
    };

    const stop = await input.ports.runPnpm(
      ['dev:stop', '--instance', input.ownedSlotId],
      { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.parkMs },
    );
    const parked = input.ports.readParkedState({
      slotId: input.ownedSlotId,
      registryRoot: input.ports.registryRoot,
    });
    const parkCheck = verifyParkedState(parked);
    if (stop.code !== 0 || !parkCheck.ok) {
      return {
        status: 'FAIL',
        reason: parkCheck.reason ?? 'park-failed',
        reasonCode: parkCheck.reason ?? 'park-failed',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    const resume = await input.ports.runPnpm(
      ['dev', '--instance', input.ownedSlotId],
      { cwd: input.worktree, timeoutMs: LIFECYCLE_BOUNDS.activationMs },
    );
    if (resume.code !== 0 || resume.timedOut) {
      return {
        status: 'FAIL',
        reason: 'resume-failed',
        reasonCode: 'resume-failed',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    /** @type {TenantMarkerSnapshot} */
    const after = {
      sql: {
        ...markerRefs.sql,
        rowValue:
          (await input.ports.readSqlMarker(input.ownedSlotId, markerRefs.sql)) ??
          '',
      },
      s3: {
        ...markerRefs.s3,
        etag:
          (await input.ports.readS3Marker(input.ownedSlotId, markerRefs.s3)) ??
          '',
      },
      temporal: await input.ports.readTemporalIdentity(input.ownedSlotId),
    };

    const survival = compareTenantMarkerSnapshots(before, after);
    if (!survival.ok) {
      return {
        status: 'FAIL',
        reason: survival.reason ?? 'tenant-not-retained',
        reasonCode: survival.reason ?? 'tenant-not-retained',
        durationMs: Math.max(0, input.ports.now() - started),
        cleanup,
      };
    }

    return {
      status: 'PASS',
      reason: null,
      reasonCode: null,
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
      measurements: {
        scenarioId: input.scenarioId,
        slotId: input.ownedSlotId,
      },
    };
  } catch {
    return {
      status: 'FAIL',
      reason: 'programme-error',
      reasonCode: 'programme-error',
      durationMs: Math.max(0, input.ports.now() - started),
      cleanup,
    };
  } finally {
    try {
      if (markerRefs.sql) {
        await input.ports.deleteSqlMarker(input.ownedSlotId, markerRefs.sql);
        cleanup.push({
          action: 'delete-sql-marker',
          status: 'PASS',
          reason: null,
        });
      }
      if (markerRefs.s3) {
        await input.ports.deleteS3Marker(input.ownedSlotId, markerRefs.s3);
        cleanup.push({
          action: 'delete-s3-marker',
          status: 'PASS',
          reason: null,
        });
      }
    } catch {
      cleanup.push({
        action: 'delete-markers',
        status: 'FAIL',
        reason: 'marker-cleanup-failed',
      });
    }
    await input.ports.runPnpm(['dev:stop', '--instance', input.ownedSlotId], {
      cwd: input.worktree,
      timeoutMs: LIFECYCLE_BOUNDS.parkMs,
    });
    cleanup.push({ action: 'park', status: 'PASS', reason: null });
  }
}
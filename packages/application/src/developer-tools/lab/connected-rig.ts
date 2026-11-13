/**
 * CH13: isolated connected-rig planner and provider-free fake driver.
 * Real Nest/DB/Temporal boot requires confirmConnectedRig + owner permission.
 */
import { randomUUID } from 'node:crypto';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import {
  assertSandboxDatabaseTarget,
  buildSandboxDatabaseUrl,
  sandboxDatabaseNameForRun,
  SandboxGuardError,
} from './sandbox-guard.js';
import {
  createCommitAckFaultAdapter,
  createLabFaultRegistry,
  LabFaultError,
} from './lab-faults.js';
import { finalizeLabRunEvidence } from './lab-evidence.js';
import {
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from './sandbox-postgres.js';
import { createConnection } from 'node:net';

export class ConnectedRigError extends Error {
  constructor(
    readonly code:
      | 'not-confirmed'
      | 'parallel-forbidden'
      | 'infra-missing'
      | 'isolation'
      | 'cross-run'
      | 'cleanup-failed',
    message: string,
  ) {
    super(message);
    this.name = 'ConnectedRigError';
  }
}

export type ConnectedRigPlan = {
  runId: string;
  databaseName: string;
  taskQueue: string;
  temporalNamespace: string;
  serialOnly: true;
  providerMode: 'offline';
  playObservationOptional: true;
};

export function planConnectedRig(args?: { runId?: string }): ConnectedRigPlan {
  const runId = args?.runId ?? randomUUID();
  const compact = runId.replace(/-/g, '').toLowerCase();
  return {
    runId,
    databaseName: sandboxDatabaseNameForRun(runId),
    taskQueue: `chamber-connected-${compact.slice(0, 12)}`,
    temporalNamespace: `chamber_ns_${compact.slice(0, 12)}`,
    serialOnly: true,
    providerMode: 'offline',
    playObservationOptional: true,
  };
}

export type ConnectedRigHandle = {
  plan: ConnectedRigPlan;
  status: 'prepared' | 'running' | 'blocked' | 'completed' | 'failed';
  blockedReason: string | null;
  effectCount: number;
  deliveries: number;
  evidenceId: string | null;
  cleanup(): Promise<{ cleaned: boolean; forgottenDisarmCaught: boolean }>;
};

type ActiveLock = { runId: string };

const globalLock: { current: ActiveLock | null } = { current: null };

/**
 * Opt-in connected driver. Without confirmation or DATABASE URL, returns blocked.
 * Fake path proves hold/duplicate delivery semantics without Nest boot.
 */
export async function openConnectedRig(args: {
  ownerId: string;
  confirmConnectedRig?: boolean;
  databaseUrl?: string | null;
  temporalAddress?: string | null;
  /** Unit/fake path: exercise CH08 seams without infrastructure. */
  mode?: 'fake-offline' | 'live-stack';
  runId?: string;
}): Promise<ConnectedRigHandle> {
  const plan = planConnectedRig(
    args.runId !== undefined ? { runId: args.runId } : {},
  );
  const mode = args.mode ?? 'fake-offline';

  if (globalLock.current && globalLock.current.runId !== plan.runId) {
    throw new ConnectedRigError(
      'parallel-forbidden',
      `Connected rig is serial-only; active run ${globalLock.current.runId}`,
    );
  }

  if (args.confirmConnectedRig !== true) {
    return {
      plan,
      status: 'blocked',
      blockedReason:
        'confirmConnectedRig=true required before Nest/DB/Temporal boot or fake connected exercise',
      effectCount: 0,
      deliveries: 0,
      evidenceId: null,
      async cleanup() {
        return { cleaned: true, forgottenDisarmCaught: false };
      },
    };
  }

  if (mode === 'live-stack') {
    const temporalAddress = args.temporalAddress ?? '127.0.0.1:7233';
    const databaseUrl =
      args.databaseUrl ?? buildSandboxDatabaseUrl({ runId: plan.runId });
    try {
      assertSandboxDatabaseTarget(databaseUrl, plan.runId);
    } catch (error) {
      if (error instanceof SandboxGuardError) {
        throw new ConnectedRigError(
          'isolation',
          `Sandbox guard rejected connected DB: ${error.message}`,
        );
      }
      throw error;
    }

    await assertTemporalReachable(temporalAddress);
    globalLock.current = { runId: plan.runId };
    await provisionDisposableSandboxDatabase({
      runId: plan.runId,
      confirmDisposableProvision: true,
      applyFullMigrations: true,
    });
    const database = createDatabase(
      readDatabaseConfig({ DATABASE_URL: databaseUrl }),
      () => {},
    );
    const faults = createLabFaultRegistry();
    const operationId = randomUUID();
    let effectCount = 0;
    let deliveries = 0;
    let evidenceId: string | null = null;
    try {
      await database.checkConnection();
      const client = database.db.$client as {
        query: (
          text: string,
          params?: unknown[],
        ) => Promise<{
          rows: Record<string, unknown>[];
        }>;
      };
      const tables = await client.query(
        `SELECT to_regclass('public.outbox') AS outbox`,
      );
      if (!tables.rows[0]?.outbox) {
        throw new ConnectedRigError(
          'infra-missing',
          'Migrated sandbox DB missing outbox table',
        );
      }
      faults.arm({
        faultId: 'connected-live-dup',
        runId: plan.runId,
        cutPoint: 'duplicate-delivery',
        targetOperationId: operationId,
        storyId: null,
        expectedObservation: 'exactly-one-effect-after-duplicate',
      });
      const exercised = faults.exercise({
        runId: plan.runId,
        faultId: 'connected-live-dup',
        operationId,
        payload: { ownerId: args.ownerId, intent: 'connected-live' },
      });
      deliveries = Number(exercised.observation.deliveries ?? 0);
      effectCount = Number(exercised.observation.effectCount ?? 0);
      const finished = finalizeLabRunEvidence({
        runId: plan.runId,
        scenarioId: 'connected-activity-receipt',
        scenarioVersion: 1,
        fixtureHash: null,
        seed: 0,
        lane: 'connected',
        status: 'completed',
        steps: [
          {
            commandKind: 'connected-live-stack',
            temporalAddress,
            databaseName: plan.databaseName,
            deliveries,
            effectCount,
          },
        ],
        sideEffectCounts: { effectCount, deliveries },
        gitCommit: 'connected-rig-live',
        dirty: true,
        startedAt: new Date().toISOString(),
      });
      evidenceId = finished.capsule.evidenceId;
    } catch (error) {
      await database.close().catch(() => undefined);
      await destroyDisposableSandboxDatabase({
        runId: plan.runId,
        confirmDisposableProvision: true,
      }).catch(() => undefined);
      if (globalLock.current?.runId === plan.runId) {
        globalLock.current = null;
      }
      throw error;
    }

    return {
      plan,
      status: 'completed',
      blockedReason: null,
      effectCount,
      deliveries,
      evidenceId,
      async cleanup() {
        const cleanup = faults.cleanup(plan.runId);
        await database.close().catch(() => undefined);
        await destroyDisposableSandboxDatabase({
          runId: plan.runId,
          confirmDisposableProvision: true,
        });
        if (globalLock.current?.runId === plan.runId) {
          globalLock.current = null;
        }
        return {
          cleaned: true,
          forgottenDisarmCaught: cleanup.forgottenDisarmCaught,
        };
      },
    };
  }

  // fake-offline connected proof: real fault adapters, no Nest.
  globalLock.current = { runId: plan.runId };
  const faults = createLabFaultRegistry();
  const commitAck = createCommitAckFaultAdapter();
  const operationId = randomUUID();
  let effectCount = 0;
  let deliveries = 0;
  let evidenceId: string | null = null;
  let status: ConnectedRigHandle['status'] = 'running';

  try {
    faults.arm({
      faultId: 'connected-dup',
      runId: plan.runId,
      cutPoint: 'duplicate-delivery',
      targetOperationId: operationId,
      storyId: null,
      expectedObservation: 'exactly-one-effect-after-duplicate',
    });
    const exercised = faults.exercise({
      runId: plan.runId,
      faultId: 'connected-dup',
      operationId,
      payload: { ownerId: args.ownerId, intent: 'connected-activity' },
    });
    deliveries = Number(exercised.observation.deliveries ?? 0);
    effectCount = Number(exercised.observation.effectCount ?? 0);

    // Lost-ACK path: commit remains; body conflict still conflicts.
    commitAck.commit({
      runId: plan.runId,
      operationId,
      payload: { ownerId: args.ownerId, intent: 'connected-activity' },
      dropAck: true,
    });
    try {
      commitAck.commit({
        runId: plan.runId,
        operationId,
        payload: { ownerId: args.ownerId, intent: 'different-body' },
        dropAck: false,
      });
      status = 'failed';
    } catch (error) {
      if (!(error instanceof LabFaultError) || error.code !== 'body-conflict') {
        throw error;
      }
    }

    const finished = finalizeLabRunEvidence({
      runId: plan.runId,
      scenarioId: 'connected-activity-receipt',
      scenarioVersion: 1,
      fixtureHash: null,
      seed: 0,
      lane: 'connected',
      status: 'completed',
      steps: [
        {
          commandKind: 'connected-duplicate-delivery',
          deliveries,
          effectCount,
        },
      ],
      sideEffectCounts: { effectCount, deliveries },
      gitCommit: 'connected-rig-local',
      dirty: true,
      startedAt: new Date().toISOString(),
    });
    evidenceId = finished.capsule.evidenceId;
    status = 'completed';
  } catch (error) {
    status = 'failed';
    throw error;
  }

  return {
    plan,
    status,
    blockedReason: null,
    effectCount,
    deliveries,
    evidenceId,
    async cleanup() {
      const cleanup = faults.cleanup(plan.runId);
      commitAck.clear();
      if (globalLock.current?.runId === plan.runId) {
        globalLock.current = null;
      }
      return {
        cleaned: true,
        forgottenDisarmCaught: cleanup.forgottenDisarmCaught,
      };
    },
  };
}

/** Test helper: expose lock state without starting a rig. */
export function connectedRigLockOccupied(): boolean {
  return globalLock.current !== null;
}

export function forceClearConnectedRigLockForTests(): void {
  globalLock.current = null;
}

function assertTemporalReachable(address: string): Promise<void> {
  const [host, portRaw] = address.split(':');
  const port = Number(portRaw);
  if (!host || !Number.isInteger(port)) {
    return Promise.reject(
      new ConnectedRigError(
        'infra-missing',
        `Invalid Temporal address ${address}`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => {
      socket.end();
      resolve();
    });
    socket.setTimeout(3000, () => {
      socket.destroy();
      reject(
        new ConnectedRigError(
          'infra-missing',
          `Temporal not reachable at ${address}`,
        ),
      );
    });
    socket.on('error', (error) => {
      reject(
        new ConnectedRigError(
          'infra-missing',
          `Temporal not reachable at ${address}: ${error.message}`,
        ),
      );
    });
  });
}

import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../',
);

/**
 * Lightweight admission subject backed by the real package controller and fake clients.
 * Used only for verification source/fixture tiers (not LIVE PASS).
 */
export async function createImmediateAdmissionSubject(options) {
  await import(join(REPO_ROOT, 'packages/db/dist/src/connection/admission.js'));
  const managedModule = await import(
    join(REPO_ROOT, 'packages/db/dist/src/connection/managed-client.js')
  );
  const { createManagedClientRuntime } = managedModule;

  let clientId = 0;
  const runtime = createManagedClientRuntime({
    maxActive: options.maxActive,
    maxQueued: options.maxQueued,
    acquireTimeoutMs: options.acquireTimeoutMs,
    connect: async () => {
      const id = ++clientId;
      return {
        id,
        releases: 0,
        release() {
          this.releases += 1;
        },
      };
    },
    end: async () => {},
    ...(options.clock ? { clock: options.clock } : {}),
  });

  return {
    async withClient(acquireOptions, run) {
      return runtime.withClient(acquireOptions, run);
    },
    async close() {
      await runtime.close();
    },
  };
}

export async function createControllerAdmissionSubject(options) {
  await import(join(REPO_ROOT, 'packages/db/dist/src/connection/admission.js'));
  const managedModule = await import(
    join(REPO_ROOT, 'packages/db/dist/src/connection/managed-client.js')
  );

  const { createManagedClientRuntime } = managedModule;

  let clientId = 0;
  const pendingConnects = [];

  const runtime = createManagedClientRuntime({
    maxActive: options.maxActive,
    maxQueued: options.maxQueued,
    acquireTimeoutMs: options.acquireTimeoutMs,
    connect: () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      const entry = {
        promise,
        resolve: /** @type {(client: object) => void} */ (resolve),
        reject: /** @type {(error: Error) => void} */ (reject),
      };
      pendingConnects.push(entry);
      return promise;
    },
    end: async () => {},
    ...(options.clock ? { clock: options.clock } : {}),
  });

  const makeClient = () => {
    const id = ++clientId;
    return {
      id,
      releases: 0,
      release() {
        this.releases += 1;
      },
    };
  };

  return {
    runtime,
    pendingConnects,
    makeClient,
    async withClient(acquireOptions, run) {
      return runtime.withClient(acquireOptions, run);
    },
    async close() {
      await runtime.close();
    },
    resolveNextConnect(client = makeClient()) {
      const entry = pendingConnects.shift();
      if (!entry) {
        throw new Error('no-pending-connect');
      }
      entry.resolve(client);
      return client;
    },
    rejectNextConnect(error) {
      const entry = pendingConnects.shift();
      if (!entry) {
        throw new Error('no-pending-connect');
      }
      entry.reject(error);
    },
  };
}

/**
 * @param {import('./admission.mjs').DbSubjectPort & { db?: { execute?: Function }}} subject
 */
export async function runLegacyDirectExecuteProbe(subject, options = {}) {
  const base = {
    id: 'legacy-direct-db-execute',
    managedCapacityActive: Boolean(options.managedCapacityActive),
  };
  if (!subject?.db?.execute) {
    return {
      ...base,
      status: 'NOT-RUN',
      reason: 'no-legacy-execute-surface',
      reasonCode: 'no-legacy-surface',
    };
  }
  const started = performance.now();
  try {
    const result = await subject.db.execute(
      options.sqlText ?? 'SELECT 1::int AS value',
    );
    const row =
      result?.rows?.[0]?.value ??
      result?.[0]?.value ??
      (Array.isArray(result) ? result[0]?.value : undefined);
    return {
      ...base,
      status: 'PASS',
      reason: null,
      reasonCode: null,
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
      measurements: {
        legacyWhileManagedSaturated: true,
        sampleValue: row ?? null,
      },
    };
  } catch {
    return {
      ...base,
      status: 'FAIL',
      reason: 'legacy-execute-failed',
      reasonCode: 'legacy-execute-failed',
      durationMs: Math.max(0, Math.floor(performance.now() - started)),
    };
  }
}

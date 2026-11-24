#!/usr/bin/env node
import { CONTEXT_NAME } from './stack-preflight.mjs';
import { EXPECTED_IMPORT_ROOTS } from '../../infra/verification/release-acceptance/turn03/fixture-import-roots.mjs';

export { EXPECTED_IMPORT_ROOTS };

/** @type {ReadonlyArray<{ namespace: string, name: string }>} */
const REQUIRED_DEPLOYMENTS = Object.freeze([
  { namespace: 'lab-edge', name: 'game-web' },
  { namespace: 'lab-edge', name: 'game-api' },
  { namespace: 'lab-authority', name: 'game-authority' },
  { namespace: 'lab-workers', name: 'game-control' },
  { namespace: 'lab-workers', name: 'game-executor' },
  { namespace: 'lab-workers', name: 'game-relay' },
]);

/**
 * @typedef {{
 *   context: string | null,
 *   apiServerAddress: string,
 *   nodesReady: boolean,
 *   memAvailableKib: number | null,
 *   durations?: { coldMs?: number, warmMs?: number },
 *   migration: 'absent' | 'running' | 'complete' | 'failed',
 *   deployments: Array<{ namespace: string, name: string, ready: boolean }>,
 *   pinnedObjectPresent: boolean,
 *   importRoots: { world: string, rule: string, start: string } | null,
 *   repeatStart: boolean,
 * }} StackHealthObservation
 */

/**
 * @param {{ world: string, rule: string, start: string } | null} roots
 * @returns {boolean}
 */
function importRootsMatch(roots) {
  if (roots === null) {
    return false;
  }
  return (
    roots.world === EXPECTED_IMPORT_ROOTS.world &&
    roots.rule === EXPECTED_IMPORT_ROOTS.rule &&
    roots.start === EXPECTED_IMPORT_ROOTS.start
  );
}

/**
 * @param {Array<{ namespace: string, name: string, ready: boolean }>} deployments
 * @param {string} namespace
 * @param {string} name
 * @returns {boolean}
 */
function deploymentReady(deployments, namespace, name) {
  const entry = deployments.find((d) => d.namespace === namespace && d.name === name);
  return entry?.ready === true;
}

/**
 * @param {StackHealthObservation} observation
 */
export function assessStackHealth(observation) {
  const {
    context,
    apiServerAddress,
    nodesReady,
    memAvailableKib,
    durations = {},
    migration,
    deployments,
    pinnedObjectPresent,
    importRoots,
  } = observation;

  const memoryKib = memAvailableKib ?? null;
  const normalizedDurations = {
    coldMs: durations.coldMs ?? null,
    warmMs: durations.warmMs ?? null,
  };

  /** @type {{ ready: boolean, diagnostics: string[] }} */
  const cluster = { ready: false, diagnostics: [] };
  /** @type {{ ready: boolean, diagnostics: string[] }} */
  const service = { ready: false, diagnostics: [] };
  /** @type {{ ready: boolean, diagnostics: string[] }} */
  const playable = { ready: false, diagnostics: [] };

  const externalPort = apiServerAddress !== '127.0.0.1';
  if (externalPort) {
    cluster.diagnostics.push(
      `Refusing stack health: API server bind ${apiServerAddress} is not loopback; external port bind refused.`,
    );
    return {
      cluster,
      service,
      playable,
      ready: false,
      dataReset: false,
      externalPort: true,
      memoryKib,
      durations: normalizedDurations,
    };
  }

  if (context !== CONTEXT_NAME) {
    cluster.diagnostics.push(`Cluster context must be ${CONTEXT_NAME}; got ${context ?? 'null'}.`);
  } else if (!nodesReady) {
    cluster.diagnostics.push('Cluster nodes are not ready.');
  } else {
    cluster.ready = true;
  }

  if (cluster.ready) {
    if (migration === 'failed') {
      service.diagnostics.push('Migration Job game-migrate in namespace lab-edge failed.');
    } else if (migration !== 'complete') {
      service.diagnostics.push(
        `Migration Job game-migrate in namespace lab-edge is not complete (status: ${migration}).`,
      );
    } else {
      let deploymentsReady = true;
      for (const required of REQUIRED_DEPLOYMENTS) {
        if (!deploymentReady(deployments, required.namespace, required.name)) {
          deploymentsReady = false;
          service.diagnostics.push(
            `Deployment ${required.name} in namespace ${required.namespace} is not ready.`,
          );
        }
      }
      if (deploymentsReady) {
        service.ready = true;
      }
    }
  }

  if (service.ready) {
    if (!pinnedObjectPresent) {
      playable.diagnostics.push('Pinned fixture object is missing.');
    } else if (!importRootsMatch(importRoots)) {
      if (importRoots === null) {
        playable.diagnostics.push('Import roots are missing.');
      } else if (importRoots.world !== EXPECTED_IMPORT_ROOTS.world) {
        playable.diagnostics.push('Import root world does not match pinned fixture.');
      } else if (importRoots.rule !== EXPECTED_IMPORT_ROOTS.rule) {
        playable.diagnostics.push('Import root rule does not match pinned fixture.');
      } else {
        playable.diagnostics.push('Import root start does not match pinned fixture.');
      }
    } else {
      playable.ready = true;
    }
  }

  return {
    cluster,
    service,
    playable,
    ready: playable.ready,
    dataReset: false,
    externalPort: false,
    memoryKib,
    durations: normalizedDurations,
  };
}
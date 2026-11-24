#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLUSTER_NAME,
  CONTEXT_NAME,
  runStackPreflight,
} from '../../../../scripts/repo-tools/stack-preflight.mjs';
import { RELEASE_API_PORT, readKindProfile, renderKindConfig } from './config.mjs';
import { createKindCluster } from './lifecycle.mjs';

/**
 * @typedef {import('../../../../scripts/repo-tools/stack-preflight.mjs').StackPreflightProbes & {
 *   kindInventoryOk?: boolean,
 * }} ReleaseCreateProbes
 */

/**
 * @param {ReleaseCreateProbes} probes
 * @returns {{ id: string, detail: string }[]}
 */
export function assessReleaseCreateInventory(probes) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (probes.kindInventoryOk === false) {
    refusals.push({ id: 'kind-inventory-failed', detail: 'kind cluster inventory failed' });
  }
  if (probes.ownedClusterExists === true) {
    refusals.push({
      id: 'release-cluster-exists',
      detail: `Cluster ${CLUSTER_NAME} already exists. Run destroy.sh with confirmation ${CONTEXT_NAME} before creating it again.`,
    });
  }
  return refusals;
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function readInjectedReleaseClusterProbe(env) {
  const raw = env.OFFSCREEN_RELEASE_CLUSTER_PROBE;
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * @param {{
 *   collectProbes: () => ReleaseCreateProbes | Promise<ReleaseCreateProbes>,
 *   run: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => {
 *     ok: boolean,
 *     stdout?: string,
 *     stderr?: string,
 *   },
 * }} deps
 */
export async function executeReleaseClusterCreate(deps) {
  const probes = await deps.collectProbes();
  const preflight = runStackPreflight(probes);
  if (!preflight.ok) {
    return {
      ok: false,
      mutated: false,
      refusals: preflight.refusals.map((refusal) => ({ id: refusal.id, detail: refusal.message })),
      actions: [],
    };
  }

  const inventoryRefusals = assessReleaseCreateInventory(probes);
  if (inventoryRefusals.length > 0) {
    return { ok: false, mutated: false, refusals: inventoryRefusals, actions: [] };
  }

  const profile = readKindProfile('release');
  const config = renderKindConfig(profile, RELEASE_API_PORT);
  const previousContext = probes.currentContext ?? null;
  const created = createKindCluster(
    { profile: 'release', port: RELEASE_API_PORT, previousContext, config },
    deps,
  );

  const action = { op: 'create-cluster', name: profile.clusterName, context: profile.contextName };
  if (created.ok) {
    return { ok: true, mutated: true, refusals: [], actions: [action] };
  }
  return {
    ok: false,
    mutated: created.mutated,
    refusals: created.refusals ?? [{ id: 'cluster-create-failed', detail: 'kind create cluster failed' }],
    actions: created.mutated ? [action] : [],
  };
}

function kindInventoryOk() {
  const result = spawnSync('kind', ['get', 'clusters'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return result.status === 0;
}

async function collectLiveReleaseCreateProbes() {
  const { collectDefaultProbes } = await import('../../../../scripts/repo-tools/stack-preflight.mjs');
  const probes = await collectDefaultProbes();
  return { ...probes, kindInventoryOk: kindInventoryOk() };
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const command = process.argv[2] ?? '';
  const subcommand = process.argv[3] ?? '';

  if (command === 'create' && subcommand === 'release') {
    const injected = readInjectedReleaseClusterProbe(process.env);
    if (injected) {
      process.stderr.write('refusing live create: an injected probe cannot authorize mutation\n');
      process.exitCode = 2;
    } else {
      const result = await executeReleaseClusterCreate({
        collectProbes: collectLiveReleaseCreateProbes,
        run(commandName, args, options = {}) {
          const child = spawnSync(commandName, args, {
            encoding: 'utf8',
            input: options.input,
            timeout: options.timeoutMs ?? 30000,
          });
          return {
            ok: !child.error && child.status === 0,
            stdout: child.stdout ?? '',
            stderr: `${child.stderr ?? ''}${child.error ? child.error.message : ''}`,
          };
        },
      });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      if (!result.ok) {
        for (const refusal of result.refusals) {
          process.stderr.write(`${refusal.detail}\n`);
        }
        process.exitCode = 1;
      }
    }
  } else if (command !== '' || subcommand !== '') {
    process.stderr.write('usage: cli.mjs create release\n');
    process.exitCode = 2;
  }
}
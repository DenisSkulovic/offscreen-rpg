import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPlatformCommand } from '../../../platform/common/commands.mjs';
import { GRAFANA_DATASOURCE_UIDS } from './proof-host.mjs';
import { PLATFORM_OBSERVABILITY_NS } from './signals.mjs';

const MODULE_ROOT = dirname(fileURLToPath(import.meta.url));
export const RESOURCE_OBSERVATION_PATH = join(
  MODULE_ROOT,
  'resource-observation.py',
);

export const RESOURCES_PHASE_BUDGET_MS = Object.freeze({
  sampling: 800_000,
  grafana: 90_000,
});

export const RESOURCE_SAMPLE_COUNT = 12;
export const RESOURCE_SAMPLE_INTERVAL_S = 10;

const GRAFANA_SERVICE = 'obs-grafana';

/**
 * @param {object} session
 * @param {{ httpGet?: Function, readAdminPassword?: Function, portForward?: Function }} [deps]
 */
export async function queryGrafanaDatasourceHealth(session, deps = {}) {
  /** @type {Record<string, { ok: boolean, status: string }>} */
  const out = {};
  for (const uid of GRAFANA_DATASOURCE_UIDS) {
    const remaining = session.remainingWorkMs();
    if (remaining < 5_000) {
      out[uid] = { ok: false, status: 'budget' };
      continue;
    }
    if (deps.probeDatasource) {
      out[uid] = await deps.probeDatasource({ session, uid });
      continue;
    }
    out[uid] = { ok: false, status: 'probe-not-wired' };
  }
  return out;
}

/**
 * @param {Record<string, { min?: number, mean?: number, max?: number, cpuMean?: number | null, cpuMax?: number | null, missingCpu?: boolean }>} samples
 */
export function summarizeResourceSamples(samples) {
  /** @type {Record<string, object>} */
  const report = {};
  for (const [role, points] of Object.entries(samples)) {
    if (!Array.isArray(points) || points.length !== RESOURCE_SAMPLE_COUNT) {
      report[role] = { ok: false, reason: 'sample-count' };
      continue;
    }
    const mem = points.map((p) => p.workingSetBytes);
    const cpuValues = points
      .map((p) => p.cpuNanoCores)
      .filter((v) => v != null);
    report[role] = {
      memoryMiB: {
        min: roundMib(Math.min(...mem)),
        mean: roundMib(mean(mem)),
        max: roundMib(Math.max(...mem)),
      },
      cpuMilli: cpuValues.length
        ? {
            mean: roundCpu(mean(cpuValues)),
            max: roundCpu(Math.max(...cpuValues)),
          }
        : 'not-observed',
      distinctMemoryTimestamps: new Set(points.map((p) => p.memoryTime)).size,
    };
  }
  return report;
}

/**
 * @param {number[]} values
 */
function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function roundMib(bytes) {
  return Math.round((bytes / 1_048_576) * 10) / 10;
}

function roundCpu(nanoCores) {
  return Math.round((nanoCores / 1e6) * 10) / 10;
}

/**
 * @param {object} session
 * @param {{ runObservation?: Function, runPython?: Function, listNodes?: Function }} [deps]
 */
export async function runResourcesProof(session, deps = {}) {
  if (session.remainingWorkMs() < RESOURCES_PHASE_BUDGET_MS.sampling) {
    return { ok: false, reasonCode: 'resources-budget', phase: 'preflight' };
  }
  const workDir = join(session.evidenceDir, 'resources');
  const contextName = session.identity.contextName;
  const snapshotPath = session.identity.snapshotPath;

  const nodes =
    deps.listNodes?.(session) ?? listClusterNodes(contextName, session, deps);
  if (!nodes.ok) {
    return { ok: false, reasonCode: nodes.reasonCode, phase: 'nodes' };
  }

  const port = deps.prometheusPort ?? '0';
  const argv = [
    RESOURCE_OBSERVATION_PATH,
    workDir,
    snapshotPath,
    contextName,
    port,
    ...nodes.names,
  ];

  if (deps.runObservation) {
    const observed = await deps.runObservation({ session, argv, workDir });
    if (!observed.ok) {
      return { ok: false, reasonCode: observed.reasonCode, phase: 'sampling' };
    }
    return {
      ok: true,
      reasonCode: null,
      phase: 'resources-complete',
      report: observed.report,
    };
  }

  const run = deps.run ?? runPlatformCommand;
  const result = run('python3', argv, {
    timeoutMs: Math.min(session.remainingWorkMs(), 800_000),
    env: { ...process.env, RESOURCE_SAMPLE_INTERVAL_S: '0' },
  });
  if (!result.ok) {
    return {
      ok: false,
      reasonCode: 'resource-observation-failed',
      phase: 'sampling',
    };
  }

  let samples;
  try {
    samples = JSON.parse(readFileSync(join(workDir, 'samples.json'), 'utf8'));
  } catch {
    return { ok: false, reasonCode: 'samples-unreadable', phase: 'sampling' };
  }
  const report = summarizeResourceSamples(samples);
  writeResourceReport(workDir, report);
  return { ok: true, reasonCode: null, phase: 'resources-complete', report };
}

/**
 * @param {string} workDir
 * @param {object} report
 */
function writeResourceReport(workDir, report) {
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, 'resource-report.json'),
    JSON.stringify(report, null, 2),
  );
}

/**
 * @param {string} contextName
 * @param {object} session
 * @param {object} [deps]
 */
function listClusterNodes(contextName, session, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      'get',
      'nodes',
      '-o',
      'jsonpath={.items[*].metadata.name}',
    ],
    { timeoutMs: 15_000 },
  );
  if (!result.ok || !result.stdout.trim()) {
    return { ok: false, reasonCode: 'nodes-unreadable' };
  }
  const names = result.stdout.trim().split(/\s+/).filter(Boolean);
  if (names.length < 1) {
    return { ok: false, reasonCode: 'nodes-empty' };
  }
  return { ok: true, names };
}

export { PLATFORM_OBSERVABILITY_NS, GRAFANA_SERVICE };

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPlatformCommand } from '../../../platform/common/commands.mjs';
import { openForwards } from '../../../platform/observability/forward.mjs';
import {
  GRAFANA_ADMIN_SECRET_NAME,
  GRAFANA_DATASOURCE_UIDS,
} from './proof-host.mjs';
import { PLATFORM_OBSERVABILITY_NS } from './signals.mjs';

const DATASOURCE_CONTRACT = Object.freeze({
  'offscreen-metrics': {
    type: 'prometheus',
    url: 'http://obs-prometheus:9090',
  },
  'offscreen-logs': { type: 'loki', url: 'http://obs-loki:3100' },
  'offscreen-traces': { type: 'tempo', url: 'http://obs-tempo:3200' },
});

export const DEV_NODE_NAMES = Object.freeze([
  'offscreen-dev-control-plane',
  'offscreen-dev-worker',
]);

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
  const remaining = session.remainingWorkMs();
  if (remaining < 5_000) {
    for (const uid of GRAFANA_DATASOURCE_UIDS) {
      out[uid] = { ok: false, status: 'budget' };
    }
    return out;
  }
  const password = await readGrafanaAdminPassword(session, deps);
  if (!password.ok) {
    for (const uid of GRAFANA_DATASOURCE_UIDS) {
      out[uid] = { ok: false, status: 'auth' };
    }
    return out;
  }
  let forwards = null;
  const port = deps.grafanaPort;
  try {
    if (port == null) {
      const open = deps.openForwards ?? openForwards;
      const fd = session.custody?.fd;
      if (!Number.isInteger(fd)) {
        for (const uid of GRAFANA_DATASOURCE_UIDS) {
          out[uid] = { ok: false, status: 'forward' };
        }
        return out;
      }
      forwards = await open(
        session.identity,
        { fd, mode: 'shared', pending: false },
        {
          bindings: [{ key: 'grafana' }],
          deadline: session.clock.now() + Math.min(90_000, remaining),
          now: session.clock.now,
        },
      );
    }
    const localPort = port ?? forwards?.ports?.grafana;
    const httpGet = deps.httpGet ?? defaultHttpGet;
    const database = await readGrafanaDatabase(httpGet, localPort, password.user, password.password);
    if (!database.ok) {
      for (const uid of GRAFANA_DATASOURCE_UIDS) {
        out[uid] = { ok: false, status: 'auth' };
      }
      return out;
    }
    for (const uid of GRAFANA_DATASOURCE_UIDS) {
      out[uid] = await readDatasource(httpGet, localPort, password.user, password.password, uid);
    }
    return out;
  } catch {
    for (const uid of GRAFANA_DATASOURCE_UIDS) {
      out[uid] = { ok: false, status: 'forward' };
    }
    return out;
  } finally {
    await forwards?.close?.();
  }
}

async function readGrafanaAdminPassword(session, deps) {
  if (deps.readAdminPassword) {
    return deps.readAdminPassword(session);
  }
  const run = deps.run ?? runPlatformCommand;
  const result = run(
    'kubectl',
    [
      '--kubeconfig',
      session.identity.snapshotPath,
      '--context',
      session.identity.contextName,
      '-n',
      PLATFORM_OBSERVABILITY_NS,
      'get',
      'secret',
      GRAFANA_ADMIN_SECRET_NAME,
      '-o',
      'json',
    ],
    { timeoutMs: 15_000 },
  );
  if (!result.ok) {
    return { ok: false };
  }
  try {
    const secret = JSON.parse(result.stdout);
    const user = decodeSecret(secret.data?.['admin-user']) ?? 'admin';
    const password = decodeSecret(secret.data?.['admin-password']);
    if (!password) {
      return { ok: false };
    }
    return { ok: true, user, password };
  } catch {
    return { ok: false };
  }
}

function decodeSecret(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return Buffer.from(value, 'base64').toString('utf8');
}

async function defaultHttpGet(url, headers) {
  const response = await fetch(url, { headers, redirect: 'error' });
  const body = await response.text();
  return { status: response.status, body };
}

async function readGrafanaDatabase(httpGet, port, user, password) {
  const auth = basicAuth(user, password);
  const health = await httpGet(`http://127.0.0.1:${port}/api/health`, {
    authorization: auth,
  });
  if (health.status !== 200) {
    return { ok: false };
  }
  try {
    const parsed = JSON.parse(health.body);
    return { ok: parsed.database === 'ok' };
  } catch {
    return { ok: false };
  }
}

async function readDatasource(httpGet, port, user, password, uid) {
  const auth = basicAuth(user, password);
  const headers = { authorization: auth };
  const described = await httpGet(
    `http://127.0.0.1:${port}/api/datasources/uid/${uid}`,
    headers,
  );
  const probed = await httpGet(
    `http://127.0.0.1:${port}/api/datasources/uid/${uid}/health`,
    headers,
  );
  const expected = DATASOURCE_CONTRACT[uid];
  if (described.status !== 200 || probed.status !== 200 || !expected) {
    return { ok: false, status: described.status === 401 ? 'auth' : 'mismatch' };
  }
  try {
    const body = JSON.parse(described.body);
    const health = JSON.parse(probed.body);
    const matches =
      body.uid === uid &&
      body.type === expected.type &&
      body.url === expected.url &&
      health.status === 'OK';
    return { ok: matches, status: matches ? 'ok' : 'mismatch' };
  } catch {
    return { ok: false, status: 'mismatch' };
  }
}

function basicAuth(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
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

  let forwards = null;
  let port = deps.prometheusPort;
  if (port == null || port === '0' || port === 0) {
    const open = deps.openForwards ?? openForwards;
    const fd = session.custody?.fd;
    if (!Number.isInteger(fd)) {
      return { ok: false, reasonCode: 'resources-port', phase: 'forward' };
    }
    try {
      forwards = await open(
        session.identity,
        { fd, mode: 'shared', pending: false },
        {
          bindings: [{ key: 'prometheus' }],
          deadline: session.clock.now() + Math.min(90_000, session.remainingWorkMs()),
          now: session.clock.now,
        },
      );
      port = forwards.ports?.prometheus;
    } catch {
      return { ok: false, reasonCode: 'resources-port', phase: 'forward' };
    }
  }
  if (port == null || String(port) === '0') {
    await forwards?.close?.();
    return { ok: false, reasonCode: 'resources-port', phase: 'forward' };
  }
  const argv = [
    RESOURCE_OBSERVATION_PATH,
    workDir,
    snapshotPath,
    contextName,
    String(port),
    nodes.controlPlane,
    nodes.controlPlaneUid,
    nodes.worker,
    nodes.workerUid,
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
    env: { ...process.env },
  });
  if (!result.ok) {
    return {
      ok: false,
      reasonCode: 'resource-observation-failed',
      phase: 'sampling',
    };
  }

  let samples;
  let resultJson;
  try {
    samples = JSON.parse(readFileSync(join(workDir, 'samples.json'), 'utf8'));
    resultJson = JSON.parse(readFileSync(join(workDir, 'result.json'), 'utf8'));
  } catch {
    await forwards?.close?.();
    return { ok: false, reasonCode: 'samples-unreadable', phase: 'sampling' };
  }
  if (
    resultJson?.schema !== 1 ||
    resultJson.ok !== true ||
    resultJson.sampleCount !== RESOURCE_SAMPLE_COUNT ||
    !Array.isArray(resultJson.observedFamilies) ||
    resultJson.observedFamilies.length < 1
  ) {
    await forwards?.close?.();
    return { ok: false, reasonCode: 'resource-report-rejected', phase: 'sampling' };
  }
  const report = summarizeResourceSamples(samples);
  writeResourceReport(workDir, report);
  await forwards?.close?.();
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
      '--kubeconfig',
      session.identity.snapshotPath,
      '--context',
      contextName,
      'get',
      'nodes',
      '-o',
      'json',
    ],
    { timeoutMs: 15_000 },
  );
  if (!result.ok || !result.stdout.trim()) {
    return { ok: false, reasonCode: 'nodes-unreadable' };
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return { ok: false, reasonCode: 'nodes-unreadable' };
  }
  const items = parsed.items;
  if (!Array.isArray(items) || items.length !== 2) {
    return { ok: false, reasonCode: 'nodes-unexpected' };
  }
  const byName = new Map(items.map((item) => [item?.metadata?.name, item]));
  const control = byName.get(DEV_NODE_NAMES[0]);
  const worker = byName.get(DEV_NODE_NAMES[1]);
  if (!control || !worker) {
    return { ok: false, reasonCode: 'nodes-unexpected' };
  }
  if (!nodeAdmitted(control, true) || !nodeAdmitted(worker, false)) {
    return { ok: false, reasonCode: 'nodes-unexpected' };
  }
  if (control.metadata.uid === worker.metadata.uid) {
    return { ok: false, reasonCode: 'nodes-unexpected' };
  }
  return {
    ok: true,
    names: [DEV_NODE_NAMES[0], DEV_NODE_NAMES[1]],
    controlPlane: DEV_NODE_NAMES[0],
    controlPlaneUid: control.metadata.uid,
    worker: DEV_NODE_NAMES[1],
    workerUid: worker.metadata.uid,
  };
}

function nodeAdmitted(node, controlPlane) {
  if (node.metadata?.deletionTimestamp) {
    return false;
  }
  const uid = node.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    return false;
  }
  const ready = (node.status?.conditions ?? []).find((row) => row.type === 'Ready');
  if (ready?.status !== 'True') {
    return false;
  }
  const labels = node.metadata.labels ?? {};
  const control =
    labels['node-role.kubernetes.io/control-plane'] != null ||
    labels['node-role.kubernetes.io/master'] != null;
  return controlPlane ? control : !control;
}

export { PLATFORM_OBSERVABILITY_NS, GRAFANA_SERVICE };

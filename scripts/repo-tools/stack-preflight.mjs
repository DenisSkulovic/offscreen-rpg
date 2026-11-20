#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLUSTER_NAME = 'offscreen-lab';
export const CONTEXT_NAME = 'kind-offscreen-lab';
export const MIN_MEM_AVAILABLE_KIB = 4_194_304;
export const API_SERVER_ADDRESS = '127.0.0.1';
export const API_SERVER_PORT = 6443;
export const NODE_COUNT = 2;
export const NODE_IMAGE = 'kindest/node:v1.37.0';
export const PREREQ_COMMANDS = Object.freeze(['docker', 'kind', 'kubectl']);

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const KIND_YAML_PATH = join(REPO_ROOT, 'infra/kubernetes/lab/kind.yaml');
const LIB_SH_PATH = join(REPO_ROOT, 'infra/kubernetes/lab/lib.sh');

/** @typedef {{ id: string, message: string }} StackPreflightRefusal */

/** @typedef {{
 *   commandsPresent?: Record<string, boolean>,
 *   dockerDaemonOk?: boolean,
 *   currentContext?: string | null,
 *   ownedClusterExists?: boolean,
 *   memAvailableKib?: number | null,
 *   apiPort?: { occupied: boolean, ownedByCluster: boolean },
 *   kindYamlText?: string,
 *   libShText?: string,
 * }} StackPreflightProbes */

/**
 * @param {string} kindYamlText
 * @param {string} libShText
 * @returns {StackPreflightRefusal[]}
 */
export function verifyInfraPins(kindYamlText, libShText) {
  /** @type {StackPreflightRefusal[]} */
  const refusals = [];
  const expectCluster = `CLUSTER_NAME="${CLUSTER_NAME}"`;
  const expectContext = `CONTEXT_NAME="${CONTEXT_NAME}"`;
  if (!libShText.includes(expectCluster)) {
    refusals.push({ id: 'pin-drift-lib-cluster', message: `lib.sh must pin ${expectCluster}.` });
  }
  if (!libShText.includes(expectContext)) {
    refusals.push({ id: 'pin-drift-lib-context', message: `lib.sh must pin ${expectContext}.` });
  }
  if (!kindYamlText.includes(`apiServerAddress: "${API_SERVER_ADDRESS}"`)) {
    refusals.push({ id: 'pin-drift-kind-address', message: `kind.yaml must pin loopback ${API_SERVER_ADDRESS}.` });
  }
  if (!kindYamlText.includes(`apiServerPort: ${API_SERVER_PORT}`)) {
    refusals.push({ id: 'pin-drift-kind-port', message: `kind.yaml must pin apiServerPort ${API_SERVER_PORT}.` });
  }
  const imageMatches = (kindYamlText.match(new RegExp(`image: ${NODE_IMAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) ?? []).length;
  if (imageMatches < NODE_COUNT) {
    refusals.push({
      id: 'pin-drift-kind-image',
      message: `kind.yaml must declare ${NODE_COUNT} nodes using image ${NODE_IMAGE}.`,
    });
  }
  const roleLines = kindYamlText.match(/^\s*-\s*role:/gm) ?? [];
  if (roleLines.length !== NODE_COUNT) {
    refusals.push({
      id: 'pin-drift-kind-nodes',
      message: `kind.yaml must declare exactly ${NODE_COUNT} nodes.`,
    });
  }
  return refusals;
}

export function resourceProfileFromPins() {
  return Object.freeze({
    clusterName: CLUSTER_NAME,
    contextName: CONTEXT_NAME,
    apiServerAddress: API_SERVER_ADDRESS,
    apiServerPort: API_SERVER_PORT,
    nodeCount: NODE_COUNT,
    nodeImage: NODE_IMAGE,
  });
}

/**
 * @param {StackPreflightProbes} probes
 * @returns {{ ok: boolean, refusals: StackPreflightRefusal[], profile: ReturnType<typeof resourceProfileFromPins> }}
 */
export function runStackPreflight(probes) {
  /** @type {StackPreflightRefusal[]} */
  const refusals = [];
  const profile = resourceProfileFromPins();

  for (const cmd of PREREQ_COMMANDS) {
    if (probes.commandsPresent?.[cmd] !== true) {
      refusals.push({ id: `missing-${cmd}`, message: `Required command not found: ${cmd}.` });
    }
  }

  if (probes.dockerDaemonOk === false) {
    refusals.push({ id: 'docker-daemon', message: 'Docker daemon is not responding (docker info failed).' });
  }

  const ownedExists = probes.ownedClusterExists === true;
  const ctx = probes.currentContext === undefined ? null : probes.currentContext;
  if (ctx !== null && ctx !== '' && ctx !== CONTEXT_NAME) {
    refusals.push({
      id: 'foreign-context',
      message: `Refusing: current kubectl context is "${ctx}", not ${CONTEXT_NAME}.`,
    });
  } else if (ownedExists && ctx !== CONTEXT_NAME) {
    refusals.push({
      id: 'context-required',
      message: `Cluster ${CLUSTER_NAME} exists; kubectl context must be ${CONTEXT_NAME}.`,
    });
  }

  const mem = probes.memAvailableKib;
  if (mem === null || mem === undefined) {
    refusals.push({ id: 'memory-unknown', message: 'MemAvailable KiB is unknown.' });
  } else if (mem < MIN_MEM_AVAILABLE_KIB) {
    refusals.push({
      id: 'memory-low',
      message: `MemAvailable is ${mem} KiB, below ${MIN_MEM_AVAILABLE_KIB} KiB (4 GiB).`,
    });
  }

  const port = probes.apiPort ?? { occupied: false, ownedByCluster: false };
  if (port.occupied && !port.ownedByCluster) {
    refusals.push({
      id: 'api-port-conflict',
      message: `${API_SERVER_ADDRESS}:${API_SERVER_PORT} is in use by a non-owned listener.`,
    });
  }

  const kindYamlText = probes.kindYamlText ?? '';
  const libShText = probes.libShText ?? '';
  if (kindYamlText && libShText) {
    refusals.push(...verifyInfraPins(kindYamlText, libShText));
  } else if (!kindYamlText || !libShText) {
    refusals.push({ id: 'pin-files-missing', message: 'Infrastructure pin files were not provided for verification.' });
  }

  return { ok: refusals.length === 0, refusals, profile };
}

/**
 * @param {() => void} mutate
 * @param {StackPreflightProbes} probes
 * @returns {{ ok: boolean, refusals: StackPreflightRefusal[], profile: ReturnType<typeof resourceProfileFromPins>, mutated: boolean }}
 */
export function withStackPreflightGuard(mutate, probes) {
  const result = runStackPreflight(probes);
  if (result.ok) {
    mutate();
    return { ...result, mutated: true };
  }
  return { ...result, mutated: false };
}

function commandOnPath(name) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(probe, [name], { encoding: 'utf8' });
  return r.status === 0;
}

function dockerDaemonResponds() {
  const r = spawnSync('docker', ['info'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return r.status === 0;
}

function readCurrentContext() {
  const r = spawnSync('kubectl', ['config', 'current-context'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) return null;
  const text = (r.stdout ?? '').trim();
  return text.length ? text : null;
}

function ownedClusterExists() {
  const r = spawnSync('kind', ['get', 'clusters'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) return false;
  return (r.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === CLUSTER_NAME);
}

function readMemAvailableKib() {
  try {
    const text = readFileSync('/proc/meminfo', 'utf8');
    const match = text.match(/^MemAvailable:\s+(\d+)\s+kB/im);
    if (!match) return null;
    return Number.parseInt(match[1], 10);
  } catch {
    return null;
  }
}

function loopbackPortOwnedByCluster() {
  const r = spawnSync('docker', ['ps', '--filter', `name=${CLUSTER_NAME}`, '--format', '{{.Names}}'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0) return false;
  return (r.stdout ?? '')
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(`${CLUSTER_NAME}-`));
}

function probeLoopbackApiPort() {
  return new Promise((resolve) => {
    const socket = createConnection({ host: API_SERVER_ADDRESS, port: API_SERVER_PORT, timeout: 500 }, () => {
      socket.destroy();
      resolve({ occupied: true, ownedByCluster: loopbackPortOwnedByCluster() });
    });
    socket.on('error', () => resolve({ occupied: false, ownedByCluster: false }));
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ occupied: false, ownedByCluster: false });
    });
  });
}

export function readInfraPinFiles() {
  return {
    kindYamlText: readFileSync(KIND_YAML_PATH, 'utf8'),
    libShText: readFileSync(LIB_SH_PATH, 'utf8'),
  };
}

/** @returns {Promise<StackPreflightProbes>} */
export async function collectDefaultProbes() {
  const commandsPresent = Object.fromEntries(PREREQ_COMMANDS.map((cmd) => [cmd, commandOnPath(cmd)]));
  const pins = readInfraPinFiles();
  return {
    commandsPresent,
    dockerDaemonOk: commandsPresent.docker ? dockerDaemonResponds() : false,
    currentContext: commandsPresent.kubectl ? readCurrentContext() : null,
    ownedClusterExists: commandsPresent.kind ? ownedClusterExists() : false,
    memAvailableKib: existsSync('/proc/meminfo') ? readMemAvailableKib() : null,
    apiPort: await probeLoopbackApiPort(),
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
  };
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const probes = await collectDefaultProbes();
  const { ok, refusals } = runStackPreflight(probes);
  if (!ok) {
    for (const refusal of refusals) {
      console.error(refusal.message);
    }
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
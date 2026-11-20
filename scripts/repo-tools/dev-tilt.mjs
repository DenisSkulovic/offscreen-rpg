#!/usr/bin/env node
import { createConnection } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectDefaultProbes,
  runStackPreflight,
  CONTEXT_NAME,
} from './stack-preflight.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LOOPBACK = '127.0.0.1';
const GAME_PORT = 3000;
const TILT_PORT = 10350;
const PID_FILE = join(tmpdir(), 'offscreen-rpg-dev-tilt.json');

export const LAB_RESOURCES = Object.freeze([
  'game-web',
  'game-api',
  'game-authority',
  'game-control',
  'game-executor',
  'game-relay',
]);

/** @type {Record<string, string>} */
export const DEPLOYMENT_NAMESPACE = Object.freeze({
  'game-web': 'lab-edge',
  'game-api': 'lab-edge',
  'game-authority': 'lab-authority',
  'game-control': 'lab-workers',
  'game-executor': 'lab-workers',
  'game-relay': 'lab-workers',
});

/** @typedef {{ id: string, message: string }} DevRefusal */
/** @typedef {{ game: 'free'|'owned'|'foreign', tilt: 'free'|'owned'|'foreign' }} DevPorts */
/** @typedef {Record<string, boolean | undefined>} ReadinessMap */

const READY_URLS = Object.freeze({
  game: `http://${LOOPBACK}:${GAME_PORT}/`,
  control: `http://${LOOPBACK}:${GAME_PORT}/control`,
  tilt: `http://${LOOPBACK}:${TILT_PORT}/`,
});

/**
 * @param {{
 *   preflightOk: boolean,
 *   preflightRefusals: DevRefusal[],
 *   tiltOnPath: boolean,
 *   ports: DevPorts,
 *   readiness: ReadinessMap,
 * }} input
 * @returns {{ ok: boolean, urls: typeof READY_URLS | null, refusals: DevRefusal[] }}
 */
export function assessDevLaunch(input) {
  /** @type {DevRefusal[]} */
  const refusals = [];

  if (!input.preflightOk) {
    refusals.push(...input.preflightRefusals);
  }

  if (!input.tiltOnPath) {
    refusals.push({ id: 'missing-tilt', message: 'Required command not found: tilt.' });
  }

  if (input.ports.game === 'foreign') {
    refusals.push({
      id: 'foreign-game-port',
      message: `${LOOPBACK}:${GAME_PORT} is in use by a non-owned listener.`,
    });
  }
  if (input.ports.tilt === 'foreign') {
    refusals.push({
      id: 'foreign-tilt-port',
      message: `${LOOPBACK}:${TILT_PORT} is in use by a non-owned listener.`,
    });
  }

  for (const name of LAB_RESOURCES) {
    const ready = input.readiness[name];
    if (ready !== true) {
      const id = ready === undefined ? `resource-missing-${name}` : `resource-not-ready-${name}`;
      const verb = ready === undefined ? 'missing' : 'not ready';
      refusals.push({
        id,
        message: `Deployment ${name} is ${verb}.`,
      });
    }
  }

  const portsOk =
    (input.ports.game === 'free' || input.ports.game === 'owned') &&
    (input.ports.tilt === 'free' || input.ports.tilt === 'owned');

  const allReady = LAB_RESOURCES.every((name) => input.readiness[name] === true);

  const launchOk =
    input.preflightOk &&
    input.tiltOnPath &&
    portsOk &&
    input.ports.game !== 'foreign' &&
    input.ports.tilt !== 'foreign' &&
    allReady;

  return {
    ok: launchOk,
    urls: launchOk ? { ...READY_URLS } : null,
    refusals,
  };
}

/**
 * @param {{ game: string, control: string, tilt: string }} urls
 * @returns {string[]}
 */
export function formatReadyLines(urls) {
  return [
    `Game: ${urls.game}`,
    `Control: ${urls.control}`,
    `Tilt UI: ${urls.tilt}`,
  ];
}

/**
 * URL announcement waits on maybeAnnounce: the live CLI polls deployment readiness
 * and only prints lines when assessDevLaunch returns non-null urls.
 *
 * @param {{ urls?: { game: string, control: string, tilt: string } | null } | unknown} assessment
 * @returns {string[]}
 */
export function maybeAnnounce(assessment) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment)) {
    return [];
  }
  if (!('urls' in assessment) || assessment.urls == null) {
    return [];
  }
  return formatReadyLines(assessment.urls);
}

function commandOnPath(name) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(probe, [name], { encoding: 'utf8' });
  return r.status === 0;
}

/**
 * @param {string} host
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function probeLoopbackPortOccupied(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 500 }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readStoredTiltPid() {
  if (!existsSync(PID_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(PID_FILE, 'utf8'));
    const pid = Number(data?.pid);
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

function writeStoredTiltPid(pid) {
  writeFileSync(PID_FILE, `${JSON.stringify({ pid })}\n`, 'utf8');
}

function killStoredTiltIfAlive() {
  const pid = readStoredTiltPid();
  if (pid !== null && pidAlive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // ignore
    }
  }
}

/**
 * @param {string} namespace
 * @param {string} deployment
 * @returns {boolean}
 */
export function deploymentAvailableFromKubectlOutput(stdout) {
  return (stdout ?? '').trim() === 'True';
}

/**
 * @param {string} namespace
 * @param {string} deployment
 * @returns {Promise<boolean>}
 */
export async function queryDeploymentAvailable(namespace, deployment) {
  const r = spawnSync(
    'kubectl',
    [
      'get',
      'deployment',
      deployment,
      '-n',
      namespace,
      '-o',
      'jsonpath={.status.conditions[?(@.type=="Available")].status}',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (r.status !== 0) return false;
  return deploymentAvailableFromKubectlOutput(r.stdout);
}

/** @returns {Promise<ReadinessMap>} */
export async function collectLabReadiness() {
  /** @type {ReadinessMap} */
  const readiness = {};
  for (const name of LAB_RESOURCES) {
    const ns = DEPLOYMENT_NAMESPACE[name];
    readiness[name] = await queryDeploymentAvailable(ns, name);
  }
  return readiness;
}

function refuseAndExit(refusals) {
  for (const refusal of refusals) {
    console.error(refusal.message);
  }
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runDevTiltCli() {
  const probes = await collectDefaultProbes();
  const preflight = runStackPreflight(probes);
  const tiltOnPath = commandOnPath('tilt');

  // Drop a tilt this repo started before deciding a listener is foreign.
  const previousPid = readStoredTiltPid();
  const killedPrevious = previousPid !== null && pidAlive(previousPid);
  killStoredTiltIfAlive();
  if (killedPrevious) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!pidAlive(previousPid)) break;
      await sleep(100);
    }
  }

  const gameOccupied = await probeLoopbackPortOccupied(LOOPBACK, GAME_PORT);
  const tiltOccupied = await probeLoopbackPortOccupied(LOOPBACK, TILT_PORT);

  /** @type {DevRefusal[]} */
  const launchRefusals = [];
  if (!preflight.ok) {
    launchRefusals.push(...preflight.refusals);
  }
  if (!tiltOnPath) {
    launchRefusals.push({ id: 'missing-tilt', message: 'Required command not found: tilt.' });
  }
  if (gameOccupied) {
    launchRefusals.push({
      id: 'foreign-game-port',
      message: `${LOOPBACK}:${GAME_PORT} is in use by a non-owned listener.`,
    });
  }
  if (tiltOccupied) {
    launchRefusals.push({
      id: 'foreign-tilt-port',
      message: `${LOOPBACK}:${TILT_PORT} is in use by a non-owned listener.`,
    });
  }

  if (launchRefusals.length > 0) {
    refuseAndExit(launchRefusals);
  }

  let announced = false;
  let pollTimer;

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
  };

  const onSignal = (signal) => {
    stopPolling();
    const pid = readStoredTiltPid();
    if (pid !== null && pidAlive(pid)) {
      try {
        process.kill(pid, signal === 'SIGINT' ? 'SIGTERM' : signal);
      } catch {
        // ignore
      }
    }
    process.exit(signal === 'SIGTERM' ? 143 : 130);
  };

  process.once('SIGINT', () => onSignal('SIGINT'));
  process.once('SIGTERM', () => onSignal('SIGTERM'));

  const child = spawn(
    'tilt',
    ['up', '--context', CONTEXT_NAME, '--host', LOOPBACK, '--port', String(TILT_PORT)],
    { cwd: REPO_ROOT, stdio: 'inherit', env: process.env },
  );

  if (!child.pid) {
    console.error('Failed to start tilt.');
    process.exitCode = 1;
    return;
  }

  writeStoredTiltPid(child.pid);

  pollTimer = setInterval(async () => {
    if (announced) return;
    const readiness = await collectLabReadiness();
    const gameOcc = await probeLoopbackPortOccupied(LOOPBACK, GAME_PORT);
    const tiltOcc = await probeLoopbackPortOccupied(LOOPBACK, TILT_PORT);
    const assessment = assessDevLaunch({
      preflightOk: true,
      preflightRefusals: [],
      tiltOnPath: true,
      ports: {
        game: gameOcc ? 'owned' : 'free',
        tilt: tiltOcc ? 'owned' : 'free',
      },
      readiness,
    });
    const lines = maybeAnnounce(assessment);
    if (lines.length > 0) {
      announced = true;
      for (const line of lines) {
        console.log(line);
      }
    }
  }, 5_000);

  child.on('exit', (code) => {
    stopPolling();
    process.exit(code ?? 0);
  });
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  await runDevTiltCli();
}
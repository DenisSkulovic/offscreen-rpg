#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readPlatformObject } from '../../infra/platform/common/commands.mjs';
import { collectDefaultProbes, CONTEXT_NAME } from './stack-preflight.mjs';
import { buildStackPlan } from './stack-lifecycle.mjs';
import { assessStackHealth, EXPECTED_IMPORT_ROOTS } from './stack-health.mjs';

/**
 * @param {'up' | 'down' | 'reset'} command
 * @param {{ probes: import('./stack-preflight.mjs').StackPreflightProbes, observation: { clusterPresent: boolean, migration: 'absent' | 'running' | 'complete' | 'failed' | 'unreadable', importRoots: { world: string, rule: string, start: string } | null }, confirmation?: string }} input
 * @param {(argv: string[]) => { status: number | null, stdout?: string, stderr?: string }} runner
 */
export function runPlannedCommand(command, input, runner) {
  const plan = buildStackPlan({ ...input, command });
  if (!plan.ok) {
    return { ...plan, ran: [] };
  }
  /** @type {string[][]} */
  const ran = [];
  for (const argv of plan.commands) {
    const result = runner(argv);
    ran.push(argv);
    if (result.status !== 0) {
      const detail = (result.stderr ?? '').trim() || `${argv.join(' ')} failed`;
      return {
        ok: false,
        exitCode: result.status === null || result.status === undefined ? 1 : result.status,
        commands: plan.commands,
        ran,
        messages: [detail],
        urls: /** @type {[]} */ ([]),
      };
    }
  }
  return { ...plan, ran };
}

/**
 * @param {import('./stack-health.mjs').StackHealthObservation} observation
 * @param {{ fixtureChecked?: boolean }} [options]
 */
export function reportStackStatus(observation, options = {}) {
  const fixtureChecked = options.fixtureChecked === true;
  const health = assessStackHealth(
    fixtureChecked
      ? observation
      : {
          ...observation,
          pinnedObjectPresent: true,
          importRoots: { ...EXPECTED_IMPORT_ROOTS },
        },
  );
  if (fixtureChecked) {
    return health;
  }
  return {
    ...health,
    playable: {
      ready: false,
      diagnostics: ['Playable fixture was not read in this status call.'],
    },
    ready: false,
  };
}

/**
 * @param {string} stdout
 * @returns {'absent' | 'running' | 'complete' | 'failed'}
 */
export function migrationFromJobJson(stdout) {
  if (!stdout.trim()) {
    return 'absent';
  }
  const body = JSON.parse(stdout);
  const succeeded = body.status?.succeeded ?? 0;
  const failed = body.status?.failed ?? 0;
  if (succeeded > 0) return 'complete';
  if (failed > 0) return 'failed';
  if (body.metadata?.name) return 'running';
  return 'absent';
}

/**
 * @param {{ state: 'present', object: object } | { state: 'absent' } | { state: 'unreadable' }} observation
 */
export function migrationStatusFromJobRead(observation) {
  if (observation.state === 'unreadable') {
    return 'unreadable';
  }
  if (observation.state === 'absent') {
    return 'absent';
  }
  return migrationFromJobJson(JSON.stringify(observation.object));
}

/**
 * Warm stack up observation: migration Job via common read; fixture-reader logs when available.
 * @param {(argv: string[]) => { status: number | null, stdout?: string, stderr?: string }} runner
 */
export function readWarmStackObservation(runner) {
  const platformRun = (command, args) => {
    const result = runner([command, ...args]);
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      timedOut: false,
      missing: false,
    };
  };
  const migrationObservation = readPlatformObject(
    {
      profileId: 'release',
      resource: 'job',
      name: 'game-migrate',
      namespace: 'lab-edge',
    },
    { run: platformRun },
  );
  const migration = migrationStatusFromJobRead(migrationObservation);
  const contextArgs = ['kubectl', '--context', CONTEXT_NAME];
  const fixtureLog = runner([
    ...contextArgs,
    '-n',
    'lab-content-bootstrap',
    'logs',
    'job/fixture-reader',
    '--tail=40',
  ]);
  const importRoots =
    fixtureLog.status === 0 && fixtureLog.stdout
      ? importRootsFromBootstrapLog(fixtureLog.stdout)
      : null;
  return {
    clusterPresent: true,
    migration,
    importRoots,
  };
}

/**
 * @param {string} namespace
 * @param {string} stdout
 * @returns {Array<{ namespace: string, name: string, ready: boolean }>}
 */
export function deploymentsFromListJson(namespace, stdout) {
  const body = JSON.parse(stdout);
  return (body.items ?? []).map((item) => {
    const replicas = item.status?.replicas ?? 0;
    const readyReplicas = item.status?.readyReplicas ?? 0;
    return {
      namespace,
      name: item.metadata.name,
      ready: replicas > 0 && readyReplicas >= replicas,
    };
  });
}

/**
 * @param {string} stdout
 */
/**
 * @param {string} text
 * @returns {{ world: string, rule: string, start: string } | null}
 */
export function importRootsFromBootstrapLog(text) {
  const match = text.match(
    /content-bootstrap (?:importer|reader) world=([0-9a-f]{64}) rule=([0-9a-f]{64}) start=([0-9a-f]{64})/,
  );
  if (!match) return null;
  return { world: match[1], rule: match[2], start: match[3] };
}

export function nodesReadyFromListJson(stdout) {
  const body = JSON.parse(stdout);
  const items = body.items ?? [];
  if (items.length === 0) return false;
  return items.every((node) =>
    (node.status?.conditions ?? []).some((condition) => condition.type === 'Ready' && condition.status === 'True'),
  );
}

/**
 * @param {(argv: string[]) => { status: number | null, stdout?: string, stderr?: string }} runner
 */
export function readLiveStatusObservation(runner) {
  const contextArgs = ['kubectl', '--context', CONTEXT_NAME];
  const nodes = runner([...contextArgs, 'get', 'nodes', '-o', 'json']);
  const job = runner([...contextArgs, '-n', 'lab-edge', 'get', 'job', 'game-migrate', '-o', 'json']);
  /** @type {Array<{ namespace: string, name: string, ready: boolean }>} */
  const deployments = [];
  for (const namespace of ['lab-edge', 'lab-authority', 'lab-workers']) {
    const listed = runner([...contextArgs, '-n', namespace, 'get', 'deploy', '-o', 'json']);
    if (listed.status === 0 && listed.stdout) {
      deployments.push(...deploymentsFromListJson(namespace, listed.stdout));
    }
  }
  const fixtureLog = runner([
    ...contextArgs,
    '-n',
    'lab-content-bootstrap',
    'logs',
    'job/fixture-reader',
    '--tail=40',
  ]);
  const importRoots =
    fixtureLog.status === 0 && fixtureLog.stdout ? importRootsFromBootstrapLog(fixtureLog.stdout) : null;
  return {
    context: CONTEXT_NAME,
    apiServerAddress: '127.0.0.1',
    nodesReady: nodes.status === 0 && nodes.stdout ? nodesReadyFromListJson(nodes.stdout) : false,
    memAvailableKib: null,
    durations: {},
    migration: job.status === 0 && job.stdout ? migrationFromJobJson(job.stdout) : 'absent',
    deployments,
    pinnedObjectPresent: importRoots !== null,
    importRoots,
    repeatStart: false,
    fixtureChecked: true,
  };
}

function defaultRunner(argv) {
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const invokedAsScript = process.argv[1] && process.argv[1].endsWith('stack.mjs');
if (invokedAsScript) {
  const command = process.argv[2];
  if (command === 'status') {
    const observation = readLiveStatusObservation(defaultRunner);
    const report = reportStackStatus(observation, { fixtureChecked: observation.fixtureChecked === true });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 0;
  } else if (command === 'up' || command === 'down' || command === 'reset') {
    const probes = await collectDefaultProbes();
    const clusterPresent = probes.ownedClusterExists === true;
  const observation =
    clusterPresent && command === 'up'
      ? readWarmStackObservation(defaultRunner)
      : {
          clusterPresent,
          migration: /** @type {'absent'} */ ('absent'),
          importRoots: null,
        };
    const result = runPlannedCommand(
      command,
      {
        probes,
        observation,
        confirmation: process.argv[3],
      },
      defaultRunner,
    );
    for (const message of result.messages) {
      console.error(message);
    }
    if (result.ok) {
      for (const argv of result.ran) {
        console.log(argv.join(' '));
      }
    }
    process.exitCode = result.exitCode;
  } else {
    console.error('Usage: stack.mjs up|status|down|reset [confirmation]');
    process.exitCode = 2;
  }
}

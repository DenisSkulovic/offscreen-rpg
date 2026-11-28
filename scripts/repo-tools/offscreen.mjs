#!/usr/bin/env node
// Human-first `pnpm offscreen` adapter over existing operator entrypoints (CLI01).
// Thin routing only: delegated commands keep their own parsers, output and guards.
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlatformServiceSelection } from '../../infra/environments/platform-plan.mjs';
import { readKindProfile } from '../../infra/clusters/kind/manager/config.mjs';
import { runReadOnlyCommand } from '../../infra/clusters/kind/manager/host-probe.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
export const REPO_ROOT = resolve(dirname(MODULE_PATH), '../..');
const script = (...parts) => join(REPO_ROOT, ...parts);

export const ENTRYPOINTS = Object.freeze({
  infra: script('infra', 'environments', 'infra-cli.mjs'),
  dev: script('tools', 'dev-environments', 'src', 'cli', 'dev-tilt.mjs'),
  stack: script('scripts', 'repo-tools', 'stack.mjs'),
  postgres: script('infra', 'platform', 'postgres', 'topology-cli.mjs'),
  obs: script('infra', 'platform', 'observability', 'connect.mjs'),
  verify: script('infra', 'verification', 'verify.mjs'),
});

const PROFILES = ['dev', 'release'];
const DEV_VERBS = ['up', 'new', 'reserve', 'attach', 'status', 'stop'];

const HELP = {
  root: `Offscreen operator entry point (adapter over existing commands)

Usage: pnpm offscreen <command> [options]

  status                          Overview of local Kind clusters (read-only)
  cluster list|status|start       Inspect clusters; start ensures a cluster (no services)
  platform plan|up|status <env>   Platform services (dev|release), human output
  dev up|new|reserve|attach|status|stop   Owned dev environment slots
  release up|status|down          Release application lifecycle
  postgres plan|ensure|status     PostgreSQL topology (existing options)
  obs connect [--queries]         Dev observability connection
  verify --suite <suite>          Infrastructure verification

Run "pnpm offscreen <command> --help" for details. Native docker, kind, kubectl,
helm and tilt remain your inspection tools.
`,
  status: `Usage: pnpm offscreen status [--json]

Read-only overview of the dev and release Kind clusters from Docker and Kind
inventory. Reports container state only, not Kubernetes readiness.
`,
  cluster: `Usage:
  pnpm offscreen cluster list [--json]
  pnpm offscreen cluster status [dev|release] [--json]
  pnpm offscreen cluster start <dev|release>

start runs the guarded "infra up --services none" route. It never starts, stops
or deletes Docker nodes: if retained nodes are stopped it prints the native resume
commands for you to run.
`,
  platform: `Usage: pnpm offscreen platform <plan|up|status> <dev|release> [--services SELECTION] [--json]

SELECTION is core (default), none, all or a comma-separated service list. Human
output by default; --json prints the existing machine report. Omitted services are
not stopped.
`,
  dev: `Usage: pnpm offscreen dev <up|new|reserve|attach|status|stop> [--instance ID]

up starts the dev application (same as "pnpm dev"). --instance is not allowed with
new or reserve and is required for attach.
`,
  release: `Usage: pnpm offscreen release <up|status|down> [--json]

status prints READY / NOT READY for cluster, service and playable separately
(--json prints the legacy report). down removes application resources, not
cluster nodes.
`,
  postgres: `Usage: pnpm offscreen postgres <plan|ensure|status> --env <dev|release> [options]

Delegates to "pnpm infra:postgres"; run "pnpm infra:postgres --help" for options.
`,
  obs: `Usage: pnpm offscreen obs connect [--queries]

Foreground dev observability connection (existing behavior and credential custody).
`,
  verify: `Usage: pnpm offscreen verify --suite <suite> [options]

Delegates to "pnpm infra:verify"; run "pnpm infra:verify" options as documented.
`,
};

const isHelp = (t) => t === '--help' || t === '-h';

function refuse(deps, message, group) {
  deps.writeError(`${message}\n\n${HELP[group] ?? HELP.root}`);
  return { exitCode: 2 };
}

/** Split argv into positionals and own options; returns { error } on bad input. */
function scan(args, valueOptions, flagOptions) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const t = args[i];
    if (flagOptions.includes(t)) {
      if (t in options) return { error: `duplicate option: ${t}` };
      options[t] = true;
    } else if (valueOptions.includes(t)) {
      if (t in options) return { error: `duplicate option: ${t}` };
      const v = args[i + 1];
      if (v === undefined || v.startsWith('-')) return { error: `${t} requires a value` };
      options[t] = v;
      i += 1;
    } else if (t.startsWith('-')) {
      return { error: `unsupported option: ${t}` };
    } else {
      positional.push(t);
    }
  }
  return { positional, options };
}

function delegate(deps, entry, args) {
  const result = deps.run(process.execPath, [entry, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (result.error) {
    deps.writeError(`failed to launch child command: ${result.error.message}\n`);
    return { exitCode: 1 };
  }
  if (result.signal) {
    deps.writeError(`child command terminated by signal ${result.signal}\n`);
    return { exitCode: 1 };
  }
  return { exitCode: result.status ?? 1 };
}

// ---------------------------------------------------------------- inventory

function parseDockerRows(stdout) {
  const rows = [];
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue;
    const cols = line.split('\t');
    if (cols.length !== 3) return null;
    rows.push({ name: cols[0], state: cols[1], role: cols[2] });
  }
  return rows;
}

/** Observe one profile. Never throws; unknown inputs yield UNKNOWN/INCOMPLETE. */
export function observeCluster(profileId, deps) {
  const profile = deps.readProfile(profileId);
  const base = {
    profile: profileId,
    clusterName: profile.clusterName,
    contextName: profile.contextName,
    expectedNodes: 2,
  };
  const unknown = (state) => ({ ...base, state, runningNodes: null });

  const docker = deps.probe('docker', [
    'ps',
    '-a',
    '--filter',
    `label=io.x-k8s.kind.cluster=${profile.clusterName}`,
    '--format',
    '{{.Names}}\t{{.State}}\t{{.Label "io.x-k8s.kind.role"}}',
  ]);
  const kind = deps.probe('kind', ['get', 'clusters']);
  if (!docker.ok || !kind.ok) return unknown('UNKNOWN');
  const rows = parseDockerRows(docker.stdout);
  if (rows === null) return unknown('UNKNOWN');
  const kindNames = kind.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const inKind = kindNames.includes(profile.clusterName);

  if (rows.length === 0) {
    return inKind ? unknown('INCOMPLETE') : { ...base, state: 'ABSENT', runningNodes: 0 };
  }
  const cp = rows.filter((r) => r.name === `${profile.clusterName}-control-plane` && r.role === 'control-plane');
  const wk = rows.filter((r) => r.name === `${profile.clusterName}-worker` && r.role === 'worker');
  if (rows.length !== 2 || cp.length !== 1 || wk.length !== 1) return unknown('INCOMPLETE');
  const states = [cp[0].state, wk[0].state];
  const running = states.filter((s) => s === 'running').length;
  if (running === 2) {
    // Kind must list a running cluster; disagreement is not trustworthy.
    return inKind ? { ...base, state: 'RUNNING', runningNodes: 2 } : unknown('INCOMPLETE');
  }
  if (states.every((s) => s === 'exited' || s === 'created')) {
    return { ...base, state: 'STOPPED', runningNodes: 0 };
  }
  return { ...base, state: 'INCOMPLETE', runningNodes: running };
}

function observeAll(profileIds, deps) {
  return profileIds.map((id) => {
    try {
      return observeCluster(id, deps);
    } catch {
      return { profile: id, clusterName: null, contextName: null, state: 'UNKNOWN', runningNodes: null, expectedNodes: 2 };
    }
  });
}

function renderInventory(clusters, deps, json) {
  if (json) {
    deps.write(`${JSON.stringify({ schemaVersion: 1, clusters })}\n`);
  } else {
    for (const c of clusters) {
      const nodes = c.runningNodes === null ? '?' : c.runningNodes;
      deps.write(
        `${c.profile.padEnd(8)} ${String(c.state).padEnd(11)} nodes ${nodes}/${c.expectedNodes}  context ${c.contextName ?? 'unknown'}\n`,
      );
    }
    deps.write(
      'State is Docker/Kind container observation only, not Kubernetes readiness.\n' +
        'Next: kubectl --context <context> get nodes ; pnpm offscreen platform status <env>\n',
    );
  }
  return { exitCode: clusters.some((c) => c.state === 'UNKNOWN' || c.state === 'INCOMPLETE') ? 1 : 0 };
}

function clusterStart(deps, env) {
  const [c] = observeAll([env], deps);
  if (c.state === 'RUNNING' || c.state === 'ABSENT') {
    return delegate(deps, ENTRYPOINTS.infra, ['up', '--env', env, '--services', 'none', '--human']);
  }
  if (c.state === 'STOPPED') {
    deps.writeError(
      `Refusing: ${c.clusterName} nodes are stopped. This CLI never starts Docker nodes.\n` +
        `After checking nothing else depends on them, run yourself:\n` +
        `  docker start ${c.clusterName}-control-plane ${c.clusterName}-worker\n` +
        `  kubectl --context ${c.contextName} wait --for=condition=Ready nodes --all --timeout=180s\n` +
        `then retry: pnpm offscreen cluster start ${env}\n`,
    );
    return { exitCode: 1 };
  }
  deps.writeError(
    `Refusing: ${c.clusterName} inventory is ${c.state}. No automatic recovery.\n` +
      `Inspect read-only: docker ps -a ; kind get clusters ; kubectl config get-contexts\n`,
  );
  return { exitCode: 1 };
}

// ---------------------------------------------------------------- release status

function releaseStatus(deps, json) {
  if (json) return delegate(deps, ENTRYPOINTS.stack, ['status']);
  const r = deps.run(process.execPath, [ENTRYPOINTS.stack, 'status'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'ignore'],
  });
  let report = null;
  if (!r.error && !r.signal && r.status === 0) {
    try {
      report = JSON.parse(r.stdout);
    } catch {
      report = null;
    }
  }
  const ok = (k) => report && report[k] && typeof report[k].ready === 'boolean';
  if (!report || !ok('cluster') || !ok('service') || !ok('playable')) {
    deps.writeError('release status: UNKNOWN (status report failed or was malformed). Details: pnpm stack:status\n');
    return { exitCode: 1 };
  }
  deps.write(`cluster   ${report.cluster.ready ? 'READY' : 'NOT READY'}\n`);
  deps.write(`service   ${report.service.ready ? 'READY' : 'NOT READY'}\n`);
  deps.write(`playable  ${report.playable.ready ? 'READY' : 'NOT READY (NOT QUALIFIED; fixture not checked by status)'}\n`);
  deps.write('Details: pnpm stack:status\n');
  return { exitCode: 0 };
}

// ---------------------------------------------------------------- router

export function runOffscreenCli(argv, injected = {}) {
  const deps = {
    run: spawnSync,
    probe: runReadOnlyCommand,
    readProfile: readKindProfile,
    write: (s) => process.stdout.write(s),
    writeError: (s) => process.stderr.write(s),
    ...injected,
  };
  const [group, ...rest] = argv;
  if (group === undefined) {
    deps.write(HELP.root);
    return { exitCode: 0 };
  }
  if (isHelp(group)) {
    if (rest.length > 0) return refuse(deps, 'unexpected arguments after --help');
    deps.write(HELP.root);
    return { exitCode: 0 };
  }
  if (!(group in HELP) || group === 'root') {
    return refuse(deps, `unknown command: ${group}`);
  }
  if (rest.some(isHelp)) {
    if (rest.filter(isHelp).length > 1) return refuse(deps, 'duplicate option: --help', group);
    deps.write(HELP[group]);
    return { exitCode: 0 };
  }

  switch (group) {
    case 'status': {
      const s = scan(rest, [], ['--json']);
      if (s.error || s.positional.length) return refuse(deps, s.error ?? 'unexpected arguments', group);
      return renderInventory(observeAll(PROFILES, deps), deps, Boolean(s.options['--json']));
    }
    case 'cluster': {
      const [verb, ...more] = rest;
      const s = scan(more, [], ['--json']);
      if (s.error) return refuse(deps, s.error, group);
      const json = Boolean(s.options['--json']);
      if (verb === 'list' && s.positional.length === 0) {
        return renderInventory(observeAll(PROFILES, deps), deps, json);
      }
      if (verb === 'status' && s.positional.length <= 1) {
        const env = s.positional[0];
        if (env !== undefined && !PROFILES.includes(env)) return refuse(deps, `unknown profile: ${env}`, group);
        return renderInventory(observeAll(env ? [env] : PROFILES, deps), deps, json);
      }
      if (verb === 'start' && s.positional.length === 1 && !json) {
        if (!PROFILES.includes(s.positional[0])) return refuse(deps, `unknown profile: ${s.positional[0]}`, group);
        return clusterStart(deps, s.positional[0]);
      }
      return refuse(deps, 'invalid cluster command', group);
    }
    case 'platform': {
      const s = scan(rest, ['--services'], ['--json']);
      if (s.error) return refuse(deps, s.error, group);
      const [verb, env] = s.positional;
      if (!['plan', 'up', 'status'].includes(verb) || s.positional.length !== 2) {
        return refuse(deps, 'usage: platform <plan|up|status> <env>', group);
      }
      if (!PROFILES.includes(env)) return refuse(deps, `unknown profile: ${env}`, group);
      const services = s.options['--services'] ?? 'core';
      const sel = parsePlatformServiceSelection(env, services);
      if (!sel.ok) return refuse(deps, `invalid --services: ${sel.refusal.message}`, group);
      return delegate(deps, ENTRYPOINTS.infra, [
        verb,
        '--env',
        env,
        '--services',
        services,
        s.options['--json'] ? '--json' : '--human',
      ]);
    }
    case 'dev': {
      const s = scan(rest, ['--instance'], []);
      if (s.error) return refuse(deps, s.error, group);
      const [verb] = s.positional;
      const instance = s.options['--instance'];
      if (s.positional.length !== 1 || !DEV_VERBS.includes(verb)) return refuse(deps, 'usage: dev <verb>', group);
      if (instance && (verb === 'new' || verb === 'reserve')) {
        return refuse(deps, `--instance is not allowed with ${verb}`, group);
      }
      if (verb === 'attach' && !instance) return refuse(deps, 'attach requires --instance', group);
      const args = verb === 'up' ? [] : [verb];
      if (instance) args.push('--instance', instance);
      return delegate(deps, ENTRYPOINTS.dev, args);
    }
    case 'release': {
      const s = scan(rest, [], ['--json']);
      if (s.error) return refuse(deps, s.error, group);
      const [verb] = s.positional;
      if (s.positional.length !== 1 || !['up', 'status', 'down'].includes(verb)) {
        return refuse(deps, 'usage: release <up|status|down>', group);
      }
      if (s.options['--json'] && verb !== 'status') return refuse(deps, '--json is only supported by release status', group);
      return verb === 'status' ? releaseStatus(deps, Boolean(s.options['--json'])) : delegate(deps, ENTRYPOINTS.stack, [verb]);
    }
    case 'postgres': {
      if (!['plan', 'ensure', 'status'].includes(rest[0])) return refuse(deps, 'usage: postgres <plan|ensure|status> --env ...', group);
      if (!rest.includes('--env')) return refuse(deps, 'postgres requires an explicit --env target', group);
      return delegate(deps, ENTRYPOINTS.postgres, rest);
    }
    case 'obs': {
      if (rest[0] !== 'connect') return refuse(deps, 'usage: obs connect [--queries]', group);
      return delegate(deps, ENTRYPOINTS.obs, rest.slice(1));
    }
    case 'verify': {
      if (!rest.includes('--suite')) return refuse(deps, 'verify requires --suite', group);
      return delegate(deps, ENTRYPOINTS.verify, rest);
    }
    default:
      return refuse(deps, `unknown command: ${group}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === MODULE_PATH) {
  process.exitCode = runOffscreenCli(process.argv.slice(2)).exitCode;
}

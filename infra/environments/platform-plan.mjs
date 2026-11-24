import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPlatformTarget, runPlatformCommand } from '../platform/common/commands.mjs';
import { readPlatformProfile } from '../platform/common/profile.mjs';
import {
  assertHelmAvailable,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../platform/common/render.mjs';
import { MIN_HOST_MEMORY_MIB, parseMeminfoMiB } from '../clusters/kind/manager/host-probe.mjs';

const environmentsRoot = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(environmentsRoot, '../..');

export const OPTIONAL_EXCLUDED_SERVICES = Object.freeze([
  'redis',
  'rabbitmq',
  'observability',
]);

/** @typedef {'plan' | 'ensure'} PlatformCommand */

/**
 * @typedef {{
 *   id: string,
 *   argv: string[],
 *   env?: Record<string, string>,
 *   mutate: boolean,
 * }} PlatformPhase
 */

/**
 * @typedef {{
 *   id: string,
 *   message: string,
 * }} PlatformRefusal
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   profileId: 'dev' | 'release',
 *   contextName: string,
 *   command: PlatformCommand,
 *   phases: PlatformPhase[],
 *   preflight: string[],
 *   refusals: PlatformRefusal[],
 *   excludedOptional: string[],
 * }} PlatformPlan
 */

/**
 * @typedef {{
 *   ok: boolean,
 *   exitCode: number,
 *   ran: PlatformPhase[],
 *   skipped: PlatformPhase[],
 *   phases: { id: string, ok: boolean, detail?: string }[],
 *   refusals: PlatformRefusal[],
 *   rollback: false,
 * }} PlatformRunReceipt
 */

const DEV_ENSURE_ENV = Object.freeze({
  cnpg: { OFFSCREEN_DEV_CNPG_ENSURE: 'authorized' },
  'object-storage': { OFFSCREEN_DEV_S3_ENSURE: 'authorized' },
  temporal: { OFFSCREEN_DEV_TEMPORAL_ENSURE: 'authorized' },
});

const CORE_RELEASE_SERVICES = Object.freeze([
  'postgres',
  'object-storage',
  'temporal',
]);

const DEV_CLI = Object.freeze({
  cnpg: join(
    REPO_ROOT,
    'tools/dev-environments/src/adapters/dev-cnpg-bootstrap-cli.mjs',
  ),
  'object-storage': join(
    REPO_ROOT,
    'tools/dev-environments/src/adapters/dev-object-store-bootstrap-cli.mjs',
  ),
  temporal: join(
    REPO_ROOT,
    'tools/dev-environments/src/adapters/dev-temporal-bootstrap-cli.mjs',
  ),
});

const RELEASE_INSTALL = Object.freeze({
  postgres: join(REPO_ROOT, 'infra/platform/postgres/install.sh'),
  'object-storage': join(REPO_ROOT, 'infra/platform/object-storage/install.sh'),
  temporal: join(REPO_ROOT, 'infra/platform/temporal/install.sh'),
  gateway: join(REPO_ROOT, 'infra/platform/gateway/install.sh'),
});

/**
 * @param {'dev' | 'release'} profileId
 * @param {PlatformCommand} command
 * @returns {PlatformPhase[]}
 */
function corePhases(profileId, command) {
  if (profileId === 'dev') {
    const subcommand = command === 'ensure' ? 'ensure' : 'plan';
    return [
      {
        id: 'cnpg',
        argv: [process.execPath, DEV_CLI.cnpg, subcommand],
        env: command === 'ensure' ? { ...DEV_ENSURE_ENV.cnpg } : undefined,
        mutate: command === 'ensure',
      },
      {
        id: 'object-storage',
        argv: [process.execPath, DEV_CLI['object-storage'], subcommand],
        env: command === 'ensure' ? { ...DEV_ENSURE_ENV['object-storage'] } : undefined,
        mutate: command === 'ensure',
      },
      {
        id: 'temporal',
        argv: [process.execPath, DEV_CLI.temporal, subcommand],
        env: command === 'ensure' ? { ...DEV_ENSURE_ENV.temporal } : undefined,
        mutate: command === 'ensure',
      },
    ];
  }

  const mutate = command === 'ensure';
  return [
    { id: 'postgres', argv: ['bash', RELEASE_INSTALL.postgres], mutate },
    {
      id: 'object-storage',
      argv: ['bash', RELEASE_INSTALL['object-storage']],
      mutate,
    },
    { id: 'temporal', argv: ['bash', RELEASE_INSTALL.temporal], mutate },
    { id: 'gateway', argv: ['bash', RELEASE_INSTALL.gateway], mutate },
  ];
}

/**
 * @param {number | null | undefined} memoryMiB
 */
export function assertPlatformMemoryGate(memoryMiB) {
  if (memoryMiB == null || memoryMiB < MIN_HOST_MEMORY_MIB) {
    throw new Error(
      `available memory ${memoryMiB ?? 'unknown'}MiB is below ${MIN_HOST_MEMORY_MIB}MiB`,
    );
  }
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
function readHostMemoryMiB({ run = runPlatformCommand } = {}) {
  const result = run('cat', ['/proc/meminfo'], { timeoutMs: 3000 });
  if (!result.ok) {
    return null;
  }
  return parseMeminfoMiB(result.stdout).memAvailableMiB;
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function runChartRenderPreflight(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  for (const service of CORE_RELEASE_SERVICES) {
    lintPlatformChart({ service, profile: profileId }, { run });
    renderPlatformDocuments({ service, profile: profileId, section: 'all' }, {
      run,
    });
  }
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {PlatformCommand} command
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   memoryMiB?: number | null,
 * }} [deps]
 */
export function runEnsurePreflight(profileId, command, deps = {}) {
  if (command !== 'ensure') {
    return { ok: true, steps: /** @type {string[]} */ ([]) };
  }
  const run = deps.run ?? runPlatformCommand;
  /** @type {string[]} */
  const steps = [];
  assertPlatformTarget(profileId, { run });
  steps.push('target');
  const memoryMiB = deps.memoryMiB ?? readHostMemoryMiB({ run });
  assertPlatformMemoryGate(memoryMiB);
  steps.push('memory');
  if (profileId === 'release') {
    assertHelmAvailable({ run });
    steps.push('helm');
  }
  runChartRenderPreflight(profileId, { run });
  steps.push('chart-render');
  return { ok: true, steps };
}

/**
 * @param {'dev' | 'release' | {
 *   profileId: 'dev' | 'release',
 *   command?: PlatformCommand,
 *   confirmation?: string,
 * }} profile
 * @returns {PlatformPlan}
 */
export function buildPlatformPlan(profile) {
  const input =
    typeof profile === 'string' ? { profileId: profile, command: 'plan' } : profile;
  const profileId = input.profileId;
  const command = input.command ?? 'plan';

  if (profileId !== 'dev' && profileId !== 'release') {
    return {
      ok: false,
      profileId: /** @type {'dev'} */ ('dev'),
      contextName: '',
      command,
      phases: [],
      preflight: [],
      refusals: [
        { id: 'unknown-profile', message: `unsupported platform profile: ${profileId}` },
      ],
      excludedOptional: [...OPTIONAL_EXCLUDED_SERVICES],
    };
  }

  const platformProfile = readPlatformProfile(profileId);
  /** @type {PlatformRefusal[]} */
  const refusals = [];

  if (command === 'ensure') {
    if (input.confirmation !== platformProfile.contextName) {
      refusals.push({
        id: 'context-confirmation',
        message: `Refusing ensure: pass exact context confirmation "${platformProfile.contextName}".`,
      });
    }
  }

  if (command !== 'plan' && command !== 'ensure') {
    refusals.push({
      id: 'unknown-command',
      message: `unsupported platform command: ${command}`,
    });
  }

  const phases = refusals.length === 0 ? corePhases(profileId, command) : [];

  return {
    ok: refusals.length === 0,
    profileId,
    contextName: platformProfile.contextName,
    command,
    phases,
    preflight:
      command === 'ensure'
        ? ['target', 'memory', ...(profileId === 'release' ? ['helm'] : []), 'chart-render']
        : [],
    refusals,
    excludedOptional: [...OPTIONAL_EXCLUDED_SERVICES],
  };
}

/**
 * @param {unknown} value
 */
function redactValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.length > 200) {
    return `${value.slice(0, 80)}…[redacted]`;
  }
  return value.replace(
    /"(secretAccessKey|accessKeyId|password|token)":\s*"[^"]*"/gi,
    '"$1":"[redacted]"',
  );
}

/**
 * @param {PlatformRunReceipt} receipt
 */
export function redactPlatformReceipt(receipt) {
  return {
    ...receipt,
    phases: receipt.phases.map((phase) => ({
      ...phase,
      detail: phase.detail ? redactValue(phase.detail) : undefined,
    })),
  };
}

/**
 * @param {string[]} argv
 * @param {{ env?: Record<string, string> }} [options]
 * @returns {{ ok: boolean, status: number | null, stdout: string, stderr: string }}
 */
export function defaultPlatformRunner(argv, options = {}) {
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    timeout: 600_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const timedOut =
    result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM';
  const missing = result.error?.code === 'ENOENT';
  const status = result.status ?? null;
  return {
    ok: !timedOut && !missing && !result.error && status === 0,
    status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {PlatformPlan} plan
 * @param {(argv: string[], options?: { env?: Record<string, string>, phaseId?: string }) => { ok: boolean, status?: number | null, stdout?: string, stderr?: string }} runner
 * @param {{ memoryMiB?: number | null, run?: typeof runPlatformCommand }} [deps]
 * @returns {PlatformRunReceipt}
 */
export function runPlatformPlan(plan, runner, deps = {}) {
  if (!plan.ok) {
    return {
      ok: false,
      exitCode: 1,
      ran: [],
      skipped: plan.phases,
      phases: [],
      refusals: plan.refusals,
      rollback: false,
    };
  }

  if (plan.command === 'ensure') {
    try {
      const pre = runEnsurePreflight(plan.profileId, plan.command, deps);
      if (!pre.ok) {
        return {
          ok: false,
          exitCode: 1,
          ran: [],
          skipped: plan.phases,
          phases: [],
          refusals: [{ id: 'preflight', message: 'ensure preflight failed' }],
          rollback: false,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'preflight failed';
      return {
        ok: false,
        exitCode: 1,
        ran: [],
        skipped: plan.phases,
        phases: [],
        refusals: [{ id: 'preflight', message }],
        rollback: false,
      };
    }
  }

  /** @type {PlatformPhase[]} */
  const ran = [];
  /** @type {PlatformPhase[]} */
  const skipped = [];
  /** @type {PlatformRunReceipt['phases']} */
  const phaseReceipts = [];

  for (const phase of plan.phases) {
    const previewOnly =
      plan.command === 'plan' && plan.profileId === 'release';
    if (previewOnly) {
      skipped.push(phase);
      phaseReceipts.push({ id: phase.id, ok: true, detail: 'preview-only' });
      continue;
    }

    const env = { ...process.env, ...(phase.env ?? {}) };
    const result = runner(phase.argv, { env, phaseId: phase.id });
    ran.push(phase);
    if (!result.ok) {
      const detail =
        (result.stderr ?? '').trim() ||
        (result.stdout ?? '').trim() ||
        `${phase.id} failed`;
      phaseReceipts.push({
        id: phase.id,
        ok: false,
        detail: detail.slice(0, 500),
      });
      for (const remaining of plan.phases.slice(plan.phases.indexOf(phase) + 1)) {
        skipped.push(remaining);
      }
      return {
        ok: false,
        exitCode:
          result.status == null || result.status === undefined ? 1 : result.status,
        ran,
        skipped,
        phases: phaseReceipts,
        refusals: [],
        rollback: false,
      };
    }
    phaseReceipts.push({ id: phase.id, ok: true });
  }

  return {
    ok: true,
    exitCode: 0,
    ran,
    skipped,
    phases: phaseReceipts,
    refusals: [],
    rollback: false,
  };
}

/**
 * CLI helper: read optional memory override for tests.
 * @param {string | undefined} path
 */
export function readMemoryMiBFixture(path) {
  if (!path) return undefined;
  return parseMeminfoMiB(readFileSync(path, 'utf8')).memAvailableMiB ?? undefined;
}
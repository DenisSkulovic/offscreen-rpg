import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../platform/common/commands.mjs';
import { readPlatformProfile } from '../platform/common/profile.mjs';
import {
  PLATFORM_SERVICES,
  assertHelmAvailable,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../platform/common/render.mjs';
import {
  MIN_HOST_MEMORY_MIB,
  parseMeminfoMiB,
} from '../clusters/kind/manager/host-probe.mjs';

const environmentsRoot = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(environmentsRoot, '../..');

export const OPTIONAL_EXCLUDED_SERVICES = Object.freeze([
  'redis',
  'rabbitmq',
  'observability',
]);

/** @type {readonly string[]} */
export const PLATFORM_SERVICE_CATALOG = Object.freeze([
  'postgres',
  'object-storage',
  'temporal',
  'gateway',
  'redis',
  'rabbitmq',
  'observability',
]);

const SELECTION_ALIASES = new Set(['none', 'core', 'all']);

const DEV_SUPPORTED_SERVICES = new Set([
  'postgres',
  'object-storage',
  'temporal',
  'redis',
]);

const GATEWAY_TRAEFIK_IMAGE = 'traefik:v3.7.19';
const GATEWAY_TRAEFIK_DIGEST =
  'sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4';

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
 *   selectedServices: string[],
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
  redis: { OFFSCREEN_DEV_REDIS_ENSURE: 'authorized' },
});

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
  redis: join(REPO_ROOT, 'infra/platform/redis/dev-install.mjs'),
});

const RELEASE_INSTALL = Object.freeze({
  postgres: join(REPO_ROOT, 'infra/platform/postgres/install.sh'),
  'object-storage': join(REPO_ROOT, 'infra/platform/object-storage/install.sh'),
  temporal: join(REPO_ROOT, 'infra/platform/temporal/install.sh'),
  gateway: join(REPO_ROOT, 'infra/platform/gateway/install.sh'),
  redis: join(REPO_ROOT, 'infra/platform/redis/install.sh'),
  rabbitmq: join(REPO_ROOT, 'infra/platform/rabbitmq/install.sh'),
  observability: join(REPO_ROOT, 'infra/platform/observability/install.sh'),
});

/**
 * @param {'dev' | 'release'} profileId
 * @returns {string[]}
 */
function supportedServicesForProfile(profileId) {
  if (profileId === 'dev') {
    return PLATFORM_SERVICE_CATALOG.filter((id) =>
      DEV_SUPPORTED_SERVICES.has(id),
    );
  }
  return [...PLATFORM_SERVICE_CATALOG];
}

/**
 * @param {'dev' | 'release'} profileId
 * @returns {string[]}
 */
function coreServicesForProfile(profileId) {
  if (profileId === 'dev') {
    return ['postgres', 'object-storage', 'temporal'];
  }
  return ['postgres', 'object-storage', 'temporal', 'gateway'];
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {string} [services]
 * @returns {{ ok: true, selected: string[] } | { ok: false, refusal: PlatformRefusal }}
 */
export function parsePlatformServiceSelection(profileId, services = 'core') {
  if (typeof services !== 'string') {
    return {
      ok: false,
      refusal: {
        id: 'invalid-services',
        message: 'services selection must be a string',
      },
    };
  }
  const trimmed = services.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      refusal: {
        id: 'invalid-services',
        message: 'services selection must not be empty',
      },
    };
  }

  const supported = new Set(supportedServicesForProfile(profileId));

  if (SELECTION_ALIASES.has(trimmed)) {
    let selected;
    if (trimmed === 'none') {
      selected = [];
    } else if (trimmed === 'core') {
      selected = coreServicesForProfile(profileId);
    } else {
      selected = supportedServicesForProfile(profileId);
    }
    return { ok: true, selected };
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    if (parts.some((part) => part.trim() === '')) {
      return {
        ok: false,
        refusal: {
          id: 'invalid-services',
          message: 'explicit services list must not include empty tokens',
        },
      };
    }
    const tokens = parts.map((part) => part.trim());
    if (tokens.some((token) => SELECTION_ALIASES.has(token))) {
      return {
        ok: false,
        refusal: {
          id: 'invalid-services',
          message:
            'services selection cannot mix aliases with explicit services',
        },
      };
    }
    const seen = new Set();
    for (const token of tokens) {
      if (seen.has(token)) {
        return {
          ok: false,
          refusal: {
            id: 'invalid-services',
            message: `duplicate service in selection: ${token}`,
          },
        };
      }
      seen.add(token);
      if (!PLATFORM_SERVICE_CATALOG.includes(token)) {
        return {
          ok: false,
          refusal: {
            id: 'invalid-services',
            message: `unknown service: ${token}`,
          },
        };
      }
      if (!supported.has(token)) {
        return {
          ok: false,
          refusal: {
            id: 'unsupported-service',
            message: `${token} is not supported on profile ${profileId}`,
          },
        };
      }
    }
    const selected = PLATFORM_SERVICE_CATALOG.filter((id) => seen.has(id));
    return { ok: true, selected };
  }

  if (!PLATFORM_SERVICE_CATALOG.includes(trimmed)) {
    return {
      ok: false,
      refusal: {
        id: 'invalid-services',
        message: `unknown service: ${trimmed}`,
      },
    };
  }
  if (!supported.has(trimmed)) {
    return {
      ok: false,
      refusal: {
        id: 'unsupported-service',
        message: `${trimmed} is not supported on profile ${profileId}`,
      },
    };
  }
  return { ok: true, selected: [trimmed] };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {string[]} selectedServices
 * @returns {string[]}
 */
function deriveExcludedOptional(profileId, selectedServices) {
  const supportedOptional = OPTIONAL_EXCLUDED_SERVICES.filter((id) =>
    supportedServicesForProfile(profileId).includes(id),
  );
  const selected = new Set(selectedServices);
  return supportedOptional.filter((id) => !selected.has(id));
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {PlatformCommand} command
 * @param {string[]} selectedServices
 * @returns {PlatformPhase[]}
 */
export function corePhases(profileId, command, selectedServices) {
  const mutate = command === 'ensure';
  const subcommand = command === 'ensure' ? 'ensure' : 'plan';
  /** @type {PlatformPhase[]} */
  const phases = [];

  for (const logicalId of selectedServices) {
    if (profileId === 'dev') {
      if (logicalId === 'postgres') {
        phases.push({
          id: 'cnpg',
          argv: [process.execPath, DEV_CLI.cnpg, subcommand],
          env: command === 'ensure' ? { ...DEV_ENSURE_ENV.cnpg } : undefined,
          mutate,
        });
      } else if (logicalId === 'object-storage') {
        phases.push({
          id: 'object-storage',
          argv: [process.execPath, DEV_CLI['object-storage'], subcommand],
          env:
            command === 'ensure'
              ? { ...DEV_ENSURE_ENV['object-storage'] }
              : undefined,
          mutate,
        });
      } else if (logicalId === 'temporal') {
        phases.push({
          id: 'temporal',
          argv: [process.execPath, DEV_CLI.temporal, subcommand],
          env:
            command === 'ensure' ? { ...DEV_ENSURE_ENV.temporal } : undefined,
          mutate,
        });
      } else if (logicalId === 'redis') {
        phases.push({
          id: 'redis',
          argv: [process.execPath, DEV_CLI.redis, subcommand],
          env: command === 'ensure' ? { ...DEV_ENSURE_ENV.redis } : undefined,
          mutate,
        });
      }
      continue;
    }

    const installPath = RELEASE_INSTALL[logicalId];
    if (!installPath) {
      continue;
    }
    phases.push({
      id: logicalId,
      argv: ['bash', installPath],
      mutate,
    });
  }

  return phases;
}

/**
 * @param {string[]} selectedServices
 */
function selectedChartServices(selectedServices) {
  return selectedServices.filter(
    (service) => service !== 'gateway' && PLATFORM_SERVICES.has(service),
  );
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {PlatformCommand} command
 * @param {string[]} selectedServices
 */
function plannedPreflightSteps(profileId, command, selectedServices) {
  if (command !== 'ensure' || selectedServices.length === 0) {
    return [];
  }
  /** @type {string[]} */
  const steps = ['target', 'memory'];
  const chartServices = selectedChartServices(selectedServices);
  if (profileId === 'release') {
    steps.push('helm');
  }
  if (chartServices.length > 0) {
    steps.push('chart-render');
  }
  if (profileId === 'release' && selectedServices.includes('gateway')) {
    steps.push('gateway-install');
  }
  return steps;
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
 * @param {string[]} selectedServices
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function runChartRenderPreflight(
  profileId,
  selectedServices,
  deps = {},
) {
  const run = deps.run ?? runPlatformCommand;
  for (const service of selectedChartServices(selectedServices)) {
    lintPlatformChart({ service, profile: profileId }, { run });
    renderPlatformDocuments(
      { service, profile: profileId, section: 'all' },
      {
        run,
      },
    );
  }
}

/**
 * Pinned Traefik image/repo checks aligned with infra/platform/gateway/install.sh.
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function runGatewayInstallPreflight(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const inspect = run(
    'docker',
    [
      'image',
      'inspect',
      GATEWAY_TRAEFIK_IMAGE,
      '--format',
      '{{range .RepoDigests}}{{.}}{{"\n"}}{{end}}',
    ],
    { timeoutMs: 10_000 },
  );
  if (!inspect.ok) {
    throw new Error(
      `Refusing gateway install: ${GATEWAY_TRAEFIK_IMAGE} digest check failed`,
    );
  }
  const digests = inspect.stdout ?? '';
  if (!digests.includes(GATEWAY_TRAEFIK_DIGEST)) {
    throw new Error(
      `Refusing to install: ${GATEWAY_TRAEFIK_IMAGE} is not ${GATEWAY_TRAEFIK_DIGEST}.`,
    );
  }

  const repoList = run('helm', ['repo', 'list', '-o', 'json'], {
    timeoutMs: 10_000,
  });
  if (!repoList.ok) {
    throw new Error('helm repo list failed for gateway preflight');
  }
  let repos;
  try {
    repos = JSON.parse(repoList.stdout ?? '[]');
  } catch {
    throw new Error(
      'helm repo list returned invalid JSON for gateway preflight',
    );
  }
  if (
    !Array.isArray(repos) ||
    !repos.some(
      (item) => item && typeof item === 'object' && item.name === 'traefik',
    )
  ) {
    throw new Error('traefik helm repo is not configured');
  }
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {PlatformCommand} command
 * @param {{
 *   run?: typeof runPlatformCommand,
 *   memoryMiB?: number | null,
 *   selectedServices?: string[],
 * }} [deps]
 */
export function runEnsurePreflight(profileId, command, deps = {}) {
  if (command !== 'ensure') {
    return { ok: true, steps: /** @type {string[]} */ ([]) };
  }

  const selectedServices =
    deps.selectedServices ?? coreServicesForProfile(profileId);

  if (selectedServices.length === 0) {
    return { ok: true, steps: [] };
  }

  const run = deps.run ?? runPlatformCommand;
  /** @type {string[]} */
  const steps = [];
  assertPlatformTarget(profileId, { run });
  steps.push('target');
  const memoryMiB = deps.memoryMiB ?? readHostMemoryMiB({ run });
  assertPlatformMemoryGate(memoryMiB);
  steps.push('memory');
  const chartServices = selectedChartServices(selectedServices);
  if (profileId === 'release') {
    if (chartServices.length > 0 || selectedServices.includes('gateway')) {
      assertHelmAvailable({ run });
      steps.push('helm');
    }
  }
  if (chartServices.length > 0) {
    runChartRenderPreflight(profileId, selectedServices, { run });
    steps.push('chart-render');
  }
  if (profileId === 'release' && selectedServices.includes('gateway')) {
    runGatewayInstallPreflight({ run });
    steps.push('gateway-install');
  }
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
    typeof profile === 'string'
      ? { profileId: profile, command: 'plan' }
      : profile;
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
        {
          id: 'unknown-profile',
          message: `unsupported platform profile: ${profileId}`,
        },
      ],
      selectedServices: [],
      excludedOptional: [...OPTIONAL_EXCLUDED_SERVICES],
    };
  }

  const platformProfile = readPlatformProfile(profileId);
  /** @type {PlatformRefusal[]} */
  const refusals = [];
  /** @type {string[]} */
  let selectedServices = [];

  const parsed = parsePlatformServiceSelection(profileId, input.services);
  if (!parsed.ok) {
    refusals.push(parsed.refusal);
  } else {
    selectedServices = parsed.selected;
  }

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

  const phases =
    refusals.length === 0
      ? corePhases(profileId, command, selectedServices)
      : [];

  return {
    ok: refusals.length === 0,
    profileId,
    contextName: platformProfile.contextName,
    command,
    phases,
    preflight: plannedPreflightSteps(profileId, command, selectedServices),
    refusals,
    selectedServices,
    excludedOptional: deriveExcludedOptional(profileId, selectedServices),
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
      const pre = runEnsurePreflight(plan.profileId, plan.command, {
        ...deps,
        selectedServices: plan.selectedServices,
      });
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
      const message =
        error instanceof Error ? error.message : 'preflight failed';
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
    const previewOnly = plan.command === 'plan' && plan.profileId === 'release';
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
      for (const remaining of plan.phases.slice(
        plan.phases.indexOf(phase) + 1,
      )) {
        skipped.push(remaining);
      }
      return {
        ok: false,
        exitCode:
          result.status == null || result.status === undefined
            ? 1
            : result.status,
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
  return (
    parseMeminfoMiB(readFileSync(path, 'utf8')).memAvailableMiB ?? undefined
  );
}

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLUSTER_NAME,
  CONTEXT_NAME,
  RELEASE_IMAGES,
  runTurn03Preflight,
} from './turn03/preflight.mjs';
import { TURN03_MANDATORY_GATE_IDS } from './turn03/report.mjs';
import { runTurn03ColdTrace } from './turn03/run.mjs';

export const DEV_CONTEXT_NAME = 'kind-offscreen-dev';
export const KNOWN_MIGRATION_JOB = 'game-migrate';
export const INSTALL_SCRIPT = 'install.sh';
export const BUILD_RELEASE_IMAGES_SCRIPT = join(
  'infra',
  'kubernetes',
  'lab',
  'dev',
  'tilt',
  'build-release-images.sh',
);

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(MODULE_DIR, '../../..');

/** @typedef {'read-only' | 'mutating-gated' | 'mutating-refused'} ReleasePlanStageMode */

/**
 * @typedef {{
 *   id: string,
 *   mode: ReleasePlanStageMode,
 *   summary: string,
 *   turn03GateIds?: readonly string[],
 * }} ReleaseAcceptancePlanStage
 */

export const RELEASE_ACCEPTANCE_PLAN_STAGES = Object.freeze([
  {
    id: 'pin-release-identity',
    mode: 'read-only',
    summary: 'Pin git HEAD, dirty tree state, and release image tags for kind-offscreen-lab',
  },
  {
    id: 'turn03-lab-preflight',
    mode: 'read-only',
    summary: 'Read-only lab infrastructure and OAuth prerequisites via TURN03 preflight',
    turn03GateIds: ['cluster-real-app', 'auth-ssr'],
  },
  {
    id: 'release-image-build',
    mode: 'mutating-gated',
    summary: `Plan local release image build via ${BUILD_RELEASE_IMAGES_SCRIPT}`,
  },
  {
    id: 'cluster-release-install',
    mode: 'mutating-gated',
    summary: `Plan overlay apply via app-release/${INSTALL_SCRIPT} on ${CONTEXT_NAME} only`,
    turn03GateIds: ['cluster-real-app'],
  },
  {
    id: 'provider-free-scene-smoke',
    mode: 'mutating-gated',
    summary: 'Plan signed-in provider-free scene trace (TURN03 gates; no implicit live execution)',
    turn03GateIds: [
      'candidate-start',
      'auth-ssr',
      'command-temporal-executor',
      'ga-scene-publication',
      'sse-get',
      'historical-fork-independent-continuation',
    ],
  },
  {
    id: 'recovery-fault-suite',
    mode: 'mutating-gated',
    summary:
      'TURN03 recovery-negative-matrix; requires explicit authorizeFaultSuite (never implicit)',
    turn03GateIds: ['recovery-negative-matrix'],
  },
]);

/**
 * @param {string} text
 */
export function parseImagesPin(text) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const [key, value] = line.split('=', 2);
    values[key.trim()] = value.trim();
  }
  return values;
}

/**
 * @param {string} repoRoot
 */
export function loadPinnedReleaseImages(repoRoot) {
  const pinPath = join(repoRoot, 'infra/kubernetes/lab/app-release/images.pin');
  if (!existsSync(pinPath)) {
    return { pinPath, pins: {} };
  }
  return {
    pinPath,
    pins: parseImagesPin(readFileSync(pinPath, 'utf8')),
  };
}

/**
 * @param {string | undefined} csv
 */
export function parseReleaseImageSelection(csv) {
  const selected = (csv ?? 'web,api,game-authority,worker').trim();
  if (!selected) {
    return [];
  }
  return selected.split(',').map((part) => part.trim()).filter(Boolean);
}

/**
 * @param {readonly string[]} selected
 */
export function findUnknownReleaseImages(selected) {
  const allowed = new Set(['web', 'api', 'game-authority', 'worker']);
  return selected.filter((name) => !allowed.has(name));
}

/**
 * @param {{
 *   run?: (cmd: string, args: string[]) => { status: number | null, stdout: string, stderr: string },
 *   repoRoot?: string,
 * }} [options]
 */
export function readReleaseSourceIdentity(options = {}) {
  const run = options.run ?? defaultRun;
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;

  const shaResult = run('git', ['-C', repoRoot, 'rev-parse', 'HEAD']);
  const sourceSha =
    shaResult.status === 0 ? shaResult.stdout.trim() || null : null;

  const dirtyResult = run('git', ['-C', repoRoot, 'status', '--porcelain']);
  const dirty =
    dirtyResult.status === 0 && dirtyResult.stdout.trim().length > 0;

  return { sourceSha, dirty, repoRoot };
}

/**
 * @param {Record<string, string>} actual
 * @param {Record<string, string>} expected
 */
export function releaseImageDigestMismatch(actual, expected) {
  /** @type {string[]} */
  const mismatches = [];
  for (const [image, digest] of Object.entries(expected)) {
    const observed = actual[image];
    if (observed == null || observed !== digest) {
      mismatches.push(image);
    }
  }
  return mismatches;
}

/**
 * @param {{
 *   run?: (cmd: string, args: string[]) => { status: number | null, stdout: string, stderr: string },
 * }} [options]
 */
export function readActiveKubeContext(options = {}) {
  const run = options.run ?? defaultRun;
  const result = run('kubectl', ['config', 'current-context']);
  if (result.status !== 0) {
    return { present: false, name: null };
  }
  const name = result.stdout.trim() || null;
  return { present: name != null, name };
}

/**
 * @param {string | null | undefined} contextName
 */
export function classifyForeignKubeContext(contextName) {
  if (contextName == null || contextName.length === 0) {
    return { foreign: true, reason: 'kubectl current-context is unset' };
  }
  if (contextName === DEV_CONTEXT_NAME) {
    return {
      foreign: true,
      reason: `refusing dev cluster context ${DEV_CONTEXT_NAME}; release acceptance uses ${CONTEXT_NAME} only`,
    };
  }
  if (contextName !== CONTEXT_NAME) {
    return {
      foreign: true,
      reason: `foreign kubectl context ${contextName}; expected ${CONTEXT_NAME}`,
    };
  }
  return { foreign: false, reason: null };
}

/**
 * @param {readonly ReleaseAcceptancePlanStage[]} template
 * @param {import('./turn03/report.mjs').Turn03DistributedPocProofReport} turn03Report
 */
export function classifyReleasePlanStages(template, turn03Report) {
  /** @type {Record<string, string>} */
  const gateStatus = {};
  for (const gate of turn03Report.gates) {
    gateStatus[gate.id] = gate.status;
  }

  return template.map((stage) => {
    const gateIds = stage.turn03GateIds ?? [];
    /** @type {Record<string, string>} */
    const linkedGates = {};
    for (const gateId of gateIds) {
      linkedGates[gateId] = gateStatus[gateId] ?? 'NOT-RUN';
    }

    let classification = 'planned';
    if (gateIds.length > 0) {
      if (gateIds.some((id) => linkedGates[id] === 'BLOCKED' || linkedGates[id] === 'FAIL')) {
        classification = 'blocked';
      } else if (gateIds.every((id) => linkedGates[id] === 'NOT-RUN')) {
        classification = 'not-run';
      } else {
        classification = 'classified';
      }
    }

    return {
      id: stage.id,
      mode: stage.mode,
      summary: stage.summary,
      classification,
      linkedGates,
    };
  });
}

/**
 * @param {{
 *   authorizeMutatingAcceptance?: boolean,
 *   authorizeFaultSuite?: boolean,
 *   expectedSourceSha?: string | null,
 *   expectedImageDigests?: Record<string, string>,
 *   releaseImages?: string,
 *   migrationJob?: string,
 *   run?: (cmd: string, args: string[]) => { status: number | null, stdout: string, stderr: string },
 *   spawnSync?: typeof spawnSync,
 *   repoRoot?: string,
 *   runPreflight?: typeof runTurn03Preflight,
 *   runColdTrace?: typeof runTurn03ColdTrace,
 * }} [options]
 */
export async function runReleaseAcceptancePreflightSmoke(options = {}) {
  const run = options.run ?? defaultRun;
  const spawn = options.spawnSync ?? spawnSync;
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const runPreflight = options.runPreflight ?? runTurn03Preflight;
  const runColdTrace = options.runColdTrace ?? runTurn03ColdTrace;

  const authorizeMutating =
    options.authorizeMutatingAcceptance === true;
  const authorizeFaultSuite = options.authorizeFaultSuite === true;

  /** @type {string[]} */
  const refusalReasons = [];
  let readOnlyRefusal = false;

  const identity = readReleaseSourceIdentity({ run, repoRoot });
  const { pins } = loadPinnedReleaseImages(repoRoot);

  if (identity.dirty) {
    readOnlyRefusal = true;
    refusalReasons.push(
      'Refusing release acceptance: git working tree is dirty; pin a clean HEAD first',
    );
  }

  if (
    options.expectedSourceSha != null &&
    identity.sourceSha != null &&
    options.expectedSourceSha !== identity.sourceSha
  ) {
    readOnlyRefusal = true;
    refusalReasons.push(
      `Refusing release acceptance: source SHA mismatch (expected ${options.expectedSourceSha}, observed ${identity.sourceSha})`,
    );
  }

  const selectedImages = parseReleaseImageSelection(options.releaseImages);
  const unknownImages = findUnknownReleaseImages(selectedImages);
  if (unknownImages.length > 0) {
    readOnlyRefusal = true;
    refusalReasons.push(
      `Refusing release acceptance: unknown release image(s) ${unknownImages.join(', ')}`,
    );
  }

  const migrationJob = (options.migrationJob ?? KNOWN_MIGRATION_JOB).trim();
  if (migrationJob !== KNOWN_MIGRATION_JOB) {
    readOnlyRefusal = true;
    refusalReasons.push(
      `Refusing release acceptance: unknown migration job ${migrationJob}; only ${KNOWN_MIGRATION_JOB} is supported`,
    );
  }

  const activeContext = readActiveKubeContext({ run });
  const foreign = classifyForeignKubeContext(activeContext.name);
  if (foreign.foreign) {
    readOnlyRefusal = true;
    refusalReasons.push(`Refusing release acceptance: ${foreign.reason}`);
  }

  const preflight = await runPreflight({
    run,
    repoRoot,
    readEnvFile: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null),
  });

  if (preflight.missing.includes('oauthEnv') || !preflight.checks.oauthEnvPresent) {
    readOnlyRefusal = true;
    refusalReasons.push(
      'Refusing release acceptance: GitHub OAuth env prerequisites missing in root .env',
    );
  }

  if (preflight.missing.length > 0) {
    const infra = preflight.missing.filter((m) => m !== 'oauthEnv');
    if (infra.length > 0) {
      readOnlyRefusal = true;
      refusalReasons.push(
        `Refusing release acceptance: lab preflight missing ${infra.join(', ')}`,
      );
    }
  }

  const digestMismatches = releaseImageDigestMismatch(
    preflight.imageDigests,
    options.expectedImageDigests ?? {},
  );
  if (digestMismatches.length > 0) {
    readOnlyRefusal = true;
    refusalReasons.push(
      `Refusing release acceptance: pinned image digest mismatch for ${digestMismatches.join(', ')}`,
    );
  }

  const turn03Report = await runColdTrace({
    preflight,
    runDisposableKind: false,
  });

  const stages = classifyReleasePlanStages(
    RELEASE_ACCEPTANCE_PLAN_STAGES,
    turn03Report,
  );

  /** @type {string[]} */
  const plannedCommands = [
    `git -C ${repoRoot} rev-parse HEAD`,
    `OFFSCREEN_RELEASE_IMAGES=${selectedImages.join(',')} ${BUILD_RELEASE_IMAGES_SCRIPT}`,
  ];

  const apiSelected = selectedImages.includes('api');
  if (apiSelected) {
    plannedCommands.push(
      `kubectl --context ${CONTEXT_NAME} apply -f overlay/migrate.yaml (Job ${KNOWN_MIGRATION_JOB})`,
    );
  }

  plannedCommands.push(
    `kubectl --context ${CONTEXT_NAME} ${INSTALL_SCRIPT} (selected: ${selectedImages.join(',')})`,
  );
  plannedCommands.push(
    'TURN03 provider-free scene trace (gates only; live HTTP not started without authorizeMutatingAcceptance)',
  );

  if (!authorizeFaultSuite) {
    const faultStage = stages.find((s) => s.id === 'recovery-fault-suite');
    if (faultStage) {
      faultStage.classification = 'not-run';
      faultStage.linkedGates = {
        'recovery-negative-matrix': 'NOT-RUN',
      };
    }
    plannedCommands.push(
      'recovery-negative-matrix: NOT-RUN (authorizeFaultSuite not set; live fault suite refused)',
    );
  }

  const planText = [
    `context=${CONTEXT_NAME}`,
    `cluster=${CLUSTER_NAME}`,
    `images=${JSON.stringify({ ...RELEASE_IMAGES, pinFile: pins })}`,
    ...plannedCommands,
  ].join('\n');

  const mentionsDevTilt =
    /tilt\s+down|stop\s+dev\s+tilt|kind-offscreen-dev/i.test(planText);

  let installSpawned = false;
  if (authorizeMutating && !readOnlyRefusal) {
    const installPath = join(MODULE_DIR, INSTALL_SCRIPT);
    const child = spawn('bash', [installPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        OFFSCREEN_RELEASE_IMAGES: selectedImages.join(','),
      },
    });
    installSpawned = child.status === 0;
    if (child.status !== 0) {
      refusalReasons.push(
        `install.sh exited ${child.status ?? 'null'} during authorized mutating acceptance`,
      );
    }
  }

  return {
    mode: readOnlyRefusal
      ? 'read-only-refused'
      : authorizeMutating
        ? 'authorized-mutating'
        : 'read-only-plan',
    contextName: CONTEXT_NAME,
    clusterName: CLUSTER_NAME,
    devContextExcluded: DEV_CONTEXT_NAME,
    refused: readOnlyRefusal,
    refusalReasons,
    identity: {
      sourceSha: identity.sourceSha,
      dirty: identity.dirty,
      pinnedImages: pins,
      selectedImages,
      migrationJob,
      activeKubeContext: activeContext.name,
    },
    stages,
    turn03: {
      schema: turn03Report.schema,
      overall: turn03Report.overall,
      gateIds: TURN03_MANDATORY_GATE_IDS,
      gates: turn03Report.gates.map((gate) => ({
        id: gate.id,
        status: gate.status,
      })),
    },
    plannedCommands,
    authorizeMutatingAcceptance: authorizeMutating,
    authorizeFaultSuite,
    installSpawned,
    mentionsDevTilt,
  };
}

/**
 * @param {string} cmd
 * @param {string[]} args
 */
function defaultRun(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
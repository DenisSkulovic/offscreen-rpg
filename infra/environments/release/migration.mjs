#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readKindProfile } from '../../clusters/kind/manager/config.mjs';
import {
  discoverKindNodes,
  isValidSha256Digest,
  matchesRuntimeImageDigest,
  releaseGenerationRef,
  readKindImageIdentity,
  validateRefForProfile,
} from '../../images/distribution/kind-image-loader.mjs';
import {
  readPlatformObject,
  runPlatformCommand,
} from '../../platform/common/commands.mjs';
import { readPlatformProfile } from '../../platform/common/profile.mjs';
import { parseWorkloadDocuments } from '../../workloads/render.mjs';
import { migrationStatusFromJobRead } from '../../../scripts/repo-tools/stack.mjs';

const PROFILE_ID = 'release';
const JOB_NAME = 'game-migrate';
const JOB_NAMESPACE = 'lab-edge';
const LAB_LABEL_KEY = 'offscreen.rpg/lab';
const LAB_LABEL_VALUE = 'disposable';
const MIGRATION_IMAGE_ID_ANNOTATION = 'offscreen.rpg/migration-image-id';
const WAIT_COMPLETE_TIMEOUT_MS = 300_000;

/**
 * @param {string} message
 */
export function migrationRefusal(message) {
  return Object.assign(new Error(message), { migrationRefusal: true });
}

/**
 * @param {string} text
 */
export function parseLoaderReceipt(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw migrationRefusal('migration loader receipt is missing');
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw migrationRefusal('migration loader receipt is malformed');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw migrationRefusal('migration loader receipt is malformed');
  }
  const receipt =
    /** @type {{ ref?: unknown, digest?: unknown, nodes?: unknown }} */ (
      parsed
    );
  const ref = receipt.ref;
  const digest = receipt.digest;
  if (typeof ref !== 'string' || ref.length === 0) {
    throw migrationRefusal('migration loader receipt ref is missing');
  }
  if (typeof digest !== 'string' || !isValidSha256Digest(digest)) {
    throw migrationRefusal('migration loader receipt digest is invalid');
  }
  /** @type {Record<string, { configId: string, manifestDigest: string, targetDigest: string }> | undefined} */
  let nodes;
  if (receipt.nodes !== undefined && receipt.nodes !== null) {
    if (typeof receipt.nodes !== 'object' || Array.isArray(receipt.nodes)) {
      throw migrationRefusal('migration loader receipt nodes map is malformed');
    }
    nodes = {};
    for (const [node, value] of Object.entries(
      /** @type {Record<string, unknown>} */ (receipt.nodes),
    )) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw migrationRefusal(
          'migration loader receipt nodes map is malformed',
        );
      }
      const entry =
        /** @type {{ configId?: unknown, manifestDigest?: unknown, targetDigest?: unknown }} */ (
          value
        );
      const { configId, manifestDigest, targetDigest } = entry;
      if (
        typeof configId !== 'string' ||
        !isValidSha256Digest(configId) ||
        typeof manifestDigest !== 'string' ||
        !isValidSha256Digest(manifestDigest) ||
        typeof targetDigest !== 'string' ||
        !isValidSha256Digest(targetDigest)
      ) {
        throw migrationRefusal(
          'migration loader receipt nodes map is malformed',
        );
      }
      nodes[node] = { configId, manifestDigest, targetDigest };
    }
  }
  const runtimeRef = receipt.runtimeRef;
  if (runtimeRef !== undefined && runtimeRef !== releaseGenerationRef(ref, digest)) {
    throw migrationRefusal('loader receipt runtime generation ref mismatch');
  }
  return { ref, digest, nodes, runtimeRef };
}

/**
 * @param {string} renderedYaml
 */
export function parseRenderedMigrationJob(renderedYaml) {
  const docs = parseWorkloadDocuments(renderedYaml);
  const jobs = docs.filter((doc) => doc.kind === 'Job');
  if (jobs.length !== 1) {
    throw migrationRefusal(
      'rendered migration manifest must contain exactly one Job',
    );
  }
  const job = jobs[0];
  if (
    job.metadata?.name !== JOB_NAME ||
    job.metadata?.namespace !== JOB_NAMESPACE
  ) {
    throw migrationRefusal('rendered migration Job name or namespace mismatch');
  }
  return job;
}

/**
 * @param {object} job
 */
export function migrationJobIdentity(job) {
  const container = job.spec?.template?.spec?.containers?.[0];
  return {
    name: job.metadata?.name,
    namespace: job.metadata?.namespace,
    labels: {
      app: job.metadata?.labels?.app,
      lab: job.metadata?.labels?.[LAB_LABEL_KEY],
    },
    backoffLimit: job.spec?.backoffLimit,
    templateLabels: {
      app: job.spec?.template?.metadata?.labels?.app,
      lab: job.spec?.template?.metadata?.labels?.[LAB_LABEL_KEY],
    },
    container: {
      name: container?.name,
      image: container?.image,
      imagePullPolicy: container?.imagePullPolicy,
      command: container?.command,
    },
  };
}

/**
 * @param {object} existing
 * @param {object} template
 */
export function migrationJobsMatchKnownIdentity(existing, template) {
  return (
    JSON.stringify(migrationJobIdentity(existing)) ===
    JSON.stringify(migrationJobIdentity(template))
  );
}

/**
 * @param {object} job
 */
export function isProvenOwnedMigrationJob(job) {
  if (
    job.metadata?.name !== JOB_NAME ||
    job.metadata?.namespace !== JOB_NAMESPACE
  ) {
    return false;
  }
  if (job.metadata?.labels?.app !== 'game-migrate') {
    return false;
  }
  return job.metadata?.labels?.[LAB_LABEL_KEY] === LAB_LABEL_VALUE;
}

/**
 * @param {object} job
 */
export function migrationPhaseFromJob(job) {
  return migrationStatusFromJobRead({ state: 'present', object: job });
}

/**
 * @param {object} templateJob
 * @param {string} digest
 */
export function annotateMigrationJobManifest(templateJob, digest) {
  if (!isValidSha256Digest(digest)) {
    throw migrationRefusal('migration image digest is invalid');
  }
  const manifest = structuredClone(templateJob);
  manifest.metadata ??= {};
  manifest.metadata.annotations ??= {};
  manifest.metadata.annotations[MIGRATION_IMAGE_ID_ANNOTATION] = digest;
  return manifest;
}

/**
 * @param {Array<{ configId: string, manifestDigest: string, targetDigest: string } | null>} identities
 */
export function acceptedIdsFromKindImageIdentities(identities) {
  /** @type {Set<string>} */
  const accepted = new Set();
  for (const identity of identities) {
    if (!identity) {
      continue;
    }
    accepted.add(identity.configId);
    accepted.add(identity.manifestDigest);
    accepted.add(identity.targetDigest);
  }
  return [...accepted];
}

/**
 * @param {string} ref
 * @param {typeof runPlatformCommand} run
 */
export function collectAcceptedMigrationImageIds(ref, run) {
  const validatedRef = validateRefForProfile(PROFILE_ID, ref);

  /** @type {Set<string>} */
  const accepted = new Set();

  const hostInspect = run('docker', [
    'image',
    'inspect',
    validatedRef,
    '--format',
    '{{.Id}}',
  ]);
  if (hostInspect.ok) {
    const hostId = hostInspect.stdout.trim();
    if (isValidSha256Digest(hostId)) {
      accepted.add(hostId);
    }
  }

  const profile = readKindProfile(PROFILE_ID);
  /**
   * @param {string} command
   * @param {string[]} args
   */
  const commandRunner = (command, args) => {
    const result = run(command, args);
    return {
      status: result.ok ? 0 : result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  };
  let nodes;
  try {
    nodes = discoverKindNodes(profile, commandRunner);
  } catch {
    nodes = [];
  }
  for (const node of nodes) {
    let identity;
    try {
      identity = readKindImageIdentity({
        node,
        ref: validatedRef,
        run: commandRunner,
      });
    } catch {
      continue;
    }
    if (!identity) {
      continue;
    }
    accepted.add(identity.configId);
    accepted.add(identity.manifestDigest);
    accepted.add(identity.targetDigest);
  }

  if (accepted.size === 0) {
    throw migrationRefusal(
      'cannot derive accepted CRI image identities for migration image',
    );
  }
  return [...accepted];
}

/**
 * @param {string} imageId
 */
export function digestFromPodImageId(imageId) {
  if (typeof imageId !== 'string') {
    return null;
  }
  return imageId.match(/sha256:[a-f0-9]{64}/)?.[0] ?? null;
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 */
function waitMigrationJobComplete(run, contextName) {
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      '-n',
      JOB_NAMESPACE,
      'wait',
      '--for=condition=complete',
      `job/${JOB_NAME}`,
      `--timeout=${Math.ceil(WAIT_COMPLETE_TIMEOUT_MS / 1000)}s`,
    ],
    { timeoutMs: WAIT_COMPLETE_TIMEOUT_MS + 5_000 },
  );
  if (!result.ok) {
    throw migrationRefusal('migration Job did not complete');
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {string} uid
 */
export function deleteMigrationJobWithUidPrecondition(run, contextName, uid) {
  if (typeof uid !== 'string' || uid.length === 0) {
    throw migrationRefusal('migration Job uid is missing');
  }
  const deleteOptions = {
    kind: 'DeleteOptions',
    apiVersion: 'v1',
    preconditions: { uid },
  };
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      'delete',
      '--raw',
      `/apis/batch/v1/namespaces/${JOB_NAMESPACE}/jobs/${JOB_NAME}`,
      '-f',
      '-',
    ],
    { input: `${JSON.stringify(deleteOptions)}\n` },
  );
  if (!result.ok) {
    throw migrationRefusal('migration Job delete with uid precondition failed');
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 */
function waitMigrationJobAbsent(run, contextName) {
  const observation = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'job',
      name: JOB_NAME,
      namespace: JOB_NAMESPACE,
    },
    {
      run: (command, args, options) =>
        run(command, args, { ...options, timeoutMs: options?.timeoutMs }),
    },
  );
  if (observation.state !== 'absent') {
    throw migrationRefusal('migration Job still present after delete');
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {object} manifest
 */
function createMigrationJob(run, contextName, manifest) {
  const create = run(
    'kubectl',
    ['--context', contextName, '-n', JOB_NAMESPACE, 'create', '-f', '-'],
    { input: `${JSON.stringify(manifest)}\n` },
  );
  if (!create.ok) {
    throw migrationRefusal('migration Job create failed');
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} expectedDigest
 * @param {string[]} acceptedIds
 */
export function verifyCompletedMigrationExecution(
  run,
  expectedDigest,
  acceptedIds,
) {
  const profile = readPlatformProfile(PROFILE_ID);
  const jobRead = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'job',
      name: JOB_NAME,
      namespace: JOB_NAMESPACE,
    },
    { run },
  );
  if (jobRead.state !== 'present') {
    throw migrationRefusal('migration Job unreadable after completion');
  }
  const job = jobRead.object;
  if (migrationPhaseFromJob(job) !== 'complete') {
    throw migrationRefusal('migration Job is not complete');
  }
  const uid = job.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw migrationRefusal('migration Job uid missing after completion');
  }
  const annotated = job.metadata?.annotations?.[MIGRATION_IMAGE_ID_ANNOTATION];
  if (annotated !== expectedDigest) {
    throw migrationRefusal('migration Job annotation digest mismatch');
  }
  const pods = run('kubectl', [
    '--context',
    profile.contextName,
    '-n',
    JOB_NAMESPACE,
    'get',
    'pods',
    '-l',
    `job-name=${JOB_NAME}`,
    '-o',
    'json',
  ]);
  if (!pods.ok) {
    throw migrationRefusal('migration Job pod list unreadable');
  }
  /** @type {{ items?: Array<{ status?: { containerStatuses?: Array<{ imageID?: string }> } }> }} */
  let body;
  try {
    body = JSON.parse(pods.stdout);
  } catch {
    throw migrationRefusal('migration Job pod list malformed');
  }
  const pod = (body.items ?? []).find(
    (item) => typeof item?.status?.containerStatuses?.[0]?.imageID === 'string',
  );
  const imageId = pod?.status?.containerStatuses?.[0]?.imageID;
  const podDigest = digestFromPodImageId(imageId ?? '');
  if (!matchesRuntimeImageDigest({
    profileId: PROFILE_ID, node: pod?.spec?.nodeName, observedDigest: podDigest,
    expectedDigest, acceptedIds,
    run: (command, args) => {
      const result = run(command, args);
      return { ...result, status: result.ok ? 0 : 1 };
    },
  })) {
    throw migrationRefusal('migration Job pod image identity is unknown');
  }
}

/**
 * @param {string} selected
 */
export function apiImageSelectedInReleaseInstall(selected) {
  return selected
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .includes('api');
}

/**
 * @typedef {{
 *   renderedYamlPath: string,
 *   loaderReceipt?: string,
 *   apiSelected: boolean,
 *   run?: typeof runPlatformCommand,
 *   collectAcceptedIds?: typeof collectAcceptedMigrationImageIds,
 * }} EnsureReleaseMigrationInput
 */

/**
 * @param {EnsureReleaseMigrationInput} input
 */
export function ensureReleaseMigration(input) {
  const run = input.run ?? runPlatformCommand;
  const collectAcceptedIds =
    input.collectAcceptedIds ?? collectAcceptedMigrationImageIds;
  const profile = readPlatformProfile(PROFILE_ID);

  const jobRead = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'job',
      name: JOB_NAME,
      namespace: JOB_NAMESPACE,
    },
    { run },
  );

  if (!input.apiSelected) {
    if (jobRead.state === 'unreadable') {
      throw migrationRefusal('migration Job unreadable');
    }
    if (jobRead.state === 'absent') {
      throw migrationRefusal('migration Job absent');
    }
    if (!isProvenOwnedMigrationJob(jobRead.object)) {
      throw migrationRefusal('foreign migration Job');
    }
    const phase = migrationPhaseFromJob(jobRead.object);
    if (phase === 'failed') {
      throw migrationRefusal('migration Job failed');
    }
    if (phase !== 'complete') {
      throw migrationRefusal(`migration Job not complete (${phase})`);
    }
    return { ok: true, action: 'observed', mutations: 0 };
  }

  const renderedYaml = readFileSync(input.renderedYamlPath, 'utf8');
  const templateJob = parseRenderedMigrationJob(renderedYaml);
  const receipt = parseLoaderReceipt(input.loaderReceipt ?? '');
  const templateImage =
    templateJob.spec?.template?.spec?.containers?.[0]?.image;
  if (receipt.ref !== templateImage) {
    throw migrationRefusal(
      'migration loader receipt ref does not match rendered Job image',
    );
  }

  const acceptedIds = collectAcceptedIds(receipt.runtimeRef ?? receipt.ref, run);
  if (!acceptedIds.includes(receipt.digest)) {
    throw migrationRefusal(
      'loader receipt digest is not among accepted CRI image identities',
    );
  }

  if (jobRead.state === 'unreadable') {
    throw migrationRefusal('migration Job unreadable');
  }

  const annotatedManifest = annotateMigrationJobManifest(
    templateJob,
    receipt.digest,
  );
  if (receipt.runtimeRef) annotatedManifest.spec.template.spec.containers[0].image = receipt.runtimeRef;
  const phase =
    jobRead.state === 'absent'
      ? 'absent'
      : migrationPhaseFromJob(jobRead.object);

  if (phase === 'running') {
    throw migrationRefusal('migration Job is still running');
  }
  if (phase === 'failed') {
    throw migrationRefusal('migration Job failed');
  }

  /** @type {number} */
  let mutations = 0;

  if (phase === 'absent') {
    createMigrationJob(run, profile.contextName, annotatedManifest);
    mutations += 1;
    waitMigrationJobComplete(run, profile.contextName);
    verifyCompletedMigrationExecution(run, receipt.digest, acceptedIds);
    return { ok: true, action: 'created', mutations };
  }

  const existing = jobRead.object;
  if (!isProvenOwnedMigrationJob(existing)) {
    throw migrationRefusal('foreign migration Job');
  }

  const annotatedDigest =
    existing.metadata?.annotations?.[MIGRATION_IMAGE_ID_ANNOTATION];

  if (annotatedDigest === receipt.digest) {
    verifyCompletedMigrationExecution(run, receipt.digest, acceptedIds);
    return { ok: true, action: 'reused', mutations: 0 };
  }

  if (annotatedDigest && annotatedDigest !== receipt.digest) {
    const uid = existing.metadata?.uid;
    if (typeof uid !== 'string' || uid.length === 0) {
      throw migrationRefusal('migration Job uid missing');
    }
    deleteMigrationJobWithUidPrecondition(run, profile.contextName, uid);
    mutations += 1;
    waitMigrationJobAbsent(run, profile.contextName);
    createMigrationJob(run, profile.contextName, annotatedManifest);
    mutations += 1;
    waitMigrationJobComplete(run, profile.contextName);
    verifyCompletedMigrationExecution(run, receipt.digest, acceptedIds);
    return { ok: true, action: 'replaced-digest', mutations };
  }

  if (!migrationJobsMatchKnownIdentity(existing, templateJob)) {
    throw migrationRefusal('completed migration Job has unknown identity');
  }

  const uid = existing.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw migrationRefusal('migration Job uid missing');
  }
  deleteMigrationJobWithUidPrecondition(run, profile.contextName, uid);
  mutations += 1;
  waitMigrationJobAbsent(run, profile.contextName);
  createMigrationJob(run, profile.contextName, annotatedManifest);
  mutations += 1;
  waitMigrationJobComplete(run, profile.contextName);
  verifyCompletedMigrationExecution(run, receipt.digest, acceptedIds);
  return { ok: true, action: 'replaced-legacy', mutations };
}

function main() {
  const renderedYamlPath = process.argv[2];
  if (!renderedYamlPath) {
    process.stderr.write(
      'Refusing install: migration rendered manifest path is missing.\n',
    );
    process.exitCode = 1;
    return;
  }
  const selected =
    process.env.OFFSCREEN_RELEASE_IMAGES ?? 'web,api,game-authority,worker';
  const apiSelected = apiImageSelectedInReleaseInstall(selected);
  try {
    const receipt = ensureReleaseMigration({
      renderedYamlPath,
      loaderReceipt: process.env.OFFSCREEN_MIGRATION_LOADER_RECEIPT,
      apiSelected,
    });
    if (receipt.mutations > 0) {
      process.stderr.write(
        `Release migration reconciled (${receipt.action}).\n`,
      );
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Refusing install: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

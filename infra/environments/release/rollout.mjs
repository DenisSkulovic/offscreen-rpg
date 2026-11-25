#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isValidSha256Digest, matchesRuntimeImageDigest } from '../../images/distribution/kind-image-loader.mjs';
import {
  readPlatformObject,
  runPlatformCommand,
} from '../../platform/common/commands.mjs';
import { readPlatformProfile } from '../../platform/common/profile.mjs';
import {
  documentIdentity,
  parseWorkloadDocuments,
  renderWorkloadYaml,
} from '../../workloads/render.mjs';
import {
  collectAcceptedMigrationImageIds,
  digestFromPodImageId,
  parseLoaderReceipt,
} from './migration.mjs';

const PROFILE_ID = 'release';
export const DEPLOYMENT_IMAGE_ID_ANNOTATION =
  'offscreen.rpg/deployment-image-id';

/** @type {Readonly<Record<string, string>>} */
export const RELEASE_PINNED_IMAGES = Object.freeze({
  web: 'offscreen-lab-game-web:turn02',
  api: 'offscreen-lab-app-release-api:turn02',
  'game-authority': 'offscreen-lab-app-release-ga:turn02',
  worker: 'offscreen-lab-app-release-worker:turn02',
});

/** @type {Readonly<Record<string, readonly string[]>>} */
export const FAMILY_DEPLOYMENTS = Object.freeze({
  web: ['game-web'],
  api: ['game-api'],
  'game-authority': ['game-authority'],
  worker: ['game-control', 'game-executor', 'game-relay'],
});

const ALLOWED_SELECTION = new Set(['web', 'api', 'game-authority', 'worker']);
const ROLLOUT_WAIT_TIMEOUT_MS = 300_000;

/**
 * @param {string} message
 */
export function rolloutRefusal(message) {
  return Object.assign(new Error(message), { rolloutRefusal: true });
}

/**
 * @param {string} selected
 * @returns {Set<string>}
 */
export function parseReleaseImageSelection(selected) {
  const families = selected
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const family of families) {
    if (!ALLOWED_SELECTION.has(family)) {
      throw rolloutRefusal(`unknown release image family ${family}`);
    }
  }
  return new Set(families);
}

/**
 * @param {string} deploymentName
 * @returns {string | null}
 */
export function familyForWorkloadName(deploymentName) {
  for (const [family, names] of Object.entries(FAMILY_DEPLOYMENTS)) {
    if (names.includes(deploymentName)) {
      return family;
    }
  }
  return null;
}

/**
 * @param {object} deployment
 * @param {string} digest
 */
export function annotateDeploymentPodTemplate(deployment, digest) {
  if (!isValidSha256Digest(digest)) {
    throw rolloutRefusal('deployment image digest is invalid');
  }
  const manifest = structuredClone(deployment);
  manifest.spec ??= {};
  manifest.spec.template ??= {};
  manifest.spec.template.metadata ??= {};
  manifest.spec.template.metadata.annotations ??= {};
  manifest.spec.template.metadata.annotations[DEPLOYMENT_IMAGE_ID_ANNOTATION] =
    digest;
  return manifest;
}

/**
 * @param {object | null | undefined} deployment
 */
export function deploymentPodTemplateImageIdAnnotation(deployment) {
  return (
    deployment?.spec?.template?.metadata?.annotations?.[
      DEPLOYMENT_IMAGE_ID_ANNOTATION
    ] ?? null
  );
}

/**
 * @param {string | null | undefined} existingAnnotation
 * @param {string} digest
 */
export function deploymentRolloutRequired(existingAnnotation, digest) {
  return existingAnnotation !== digest;
}

/**
 * @param {Record<string, string>} rawReceipts
 * @returns {Record<string, {
 *   ref: string,
 *   digest: string,
 *   nodes?: Record<string, { configId: string, manifestDigest: string, targetDigest: string }>,
 * }>}
 */
export function parseLoaderReceiptMap(rawReceipts) {
  /** @type {Record<string, ReturnType<typeof parseLoaderReceipt>>} */
  const parsed = {};
  for (const [family, text] of Object.entries(rawReceipts)) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      continue;
    }
    parsed[family] = parseLoaderReceipt(text);
  }
  return parsed;
}

/**
 * @typedef {{
 *   section: string,
 *   documents: object[],
 *   selectedFamilies: Set<string>,
 *   loaderReceipts: Record<string, { ref: string, digest: string }>,
 *   existingDeployments?: Record<string, object | null>,
 * }} BuildFilteredApplyInput
 */

/**
 * @param {BuildFilteredApplyInput} input
 */
export function buildFilteredApplyManifest(input) {
  const output = [];
  for (const doc of input.documents) {
    if (doc.kind === 'Namespace') {
      output.push(doc);
      continue;
    }
    if (doc.kind === 'Service') {
      const family = familyForWorkloadName(doc.metadata?.name ?? '');
      if (family && input.selectedFamilies.has(family)) {
        output.push(doc);
      }
      continue;
    }
    if (doc.kind !== 'Deployment') {
      continue;
    }
    const name = doc.metadata?.name ?? '';
    const family = familyForWorkloadName(name);
    if (!family || !input.selectedFamilies.has(family)) {
      continue;
    }
    const receipt = input.loaderReceipts[family];
    if (!receipt) {
      throw rolloutRefusal(
        `loader receipt is missing for selected family ${family}`,
      );
    }
    const containerImage = doc.spec?.template?.spec?.containers?.[0]?.image;
    if (containerImage !== receipt.ref) {
      throw rolloutRefusal(
        `rendered Deployment ${name} image does not match loader receipt for ${family}`,
      );
    }
    const manifest = annotateDeploymentPodTemplate(doc, receipt.digest);
    if (receipt.runtimeRef) manifest.spec.template.spec.containers[0].image = receipt.runtimeRef;
    output.push(manifest);
  }
  return output;
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} namespace
 * @param {string} name
 */
export function readExistingReleaseDeployment(run, namespace, name) {
  const observation = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'deployment',
      name,
      namespace,
    },
    { run },
  );
  if (observation.state === 'unreadable') {
    throw rolloutRefusal(`deployment ${namespace}/${name} is unreadable`);
  }
  if (observation.state === 'absent') {
    return null;
  }
  return observation.object;
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} section
 * @param {object[]} documents
 * @param {Set<string>} selectedFamilies
 */
export function loadExistingDeploymentsForSection(
  run,
  section,
  documents,
  selectedFamilies,
) {
  /** @type {Record<string, object | null>} */
  const existing = {};
  for (const doc of documents) {
    if (doc.kind !== 'Deployment') {
      continue;
    }
    const family = familyForWorkloadName(doc.metadata?.name ?? '');
    if (!family || !selectedFamilies.has(family)) {
      continue;
    }
    const namespace = doc.metadata?.namespace;
    const name = doc.metadata?.name;
    if (typeof namespace !== 'string' || typeof name !== 'string') {
      throw rolloutRefusal('rendered Deployment is missing namespace or name');
    }
    const key = `${namespace}/${name}`;
    if (Object.prototype.hasOwnProperty.call(existing, key)) {
      continue;
    }
    existing[key] = readExistingReleaseDeployment(run, namespace, name);
  }
  return existing;
}

/**
 * @param {{
 *   section: string,
 *   renderedYamlPath: string,
 *   outputYamlPath: string,
 *   selected: string,
 *   loaderReceiptsJsonPath: string,
 *   run?: typeof runPlatformCommand,
 * }} input
 */
export function prepareReleaseApplyManifest(input) {
  const run = input.run ?? runPlatformCommand;
  const selectedFamilies = parseReleaseImageSelection(input.selected);
  const renderedYaml = readFileSync(input.renderedYamlPath, 'utf8');
  const documents = parseWorkloadDocuments(renderedYaml);
  const loaderReceipts = parseLoaderReceiptMap(
    JSON.parse(readFileSync(input.loaderReceiptsJsonPath, 'utf8')),
  );
  const existingDeployments = loadExistingDeploymentsForSection(
    run,
    input.section,
    documents,
    selectedFamilies,
  );
  const filtered = buildFilteredApplyManifest({
    section: input.section,
    documents,
    selectedFamilies,
    loaderReceipts,
    existingDeployments,
  });
  writeFileSync(input.outputYamlPath, renderWorkloadYaml(filtered));
  return {
    ok: true,
    applyCount: filtered.filter((doc) => doc.kind === 'Deployment').length,
    identities: filtered.map(documentIdentity),
  };
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} namespace
 * @param {string} name
 */
function waitDeploymentRollout(run, contextName, namespace, name) {
  const result = run(
    'kubectl',
    [
      '--context',
      contextName,
      '-n',
      namespace,
      'rollout',
      'status',
      `deployment/${name}`,
      `--timeout=${Math.ceil(ROLLOUT_WAIT_TIMEOUT_MS / 1000)}s`,
    ],
    { timeoutMs: ROLLOUT_WAIT_TIMEOUT_MS + 5_000 },
  );
  if (!result.ok) {
    throw rolloutRefusal(
      `deployment ${namespace}/${name} rollout did not complete`,
    );
  }
}

/**
 * @param {object | null | undefined} pod
 */
function isPodTerminating(pod) {
  return typeof pod?.metadata?.deletionTimestamp === 'string';
}

/**
 * @param {object[]} items
 * @param {string} deploymentUid
 * @returns {Map<string, object>}
 */
function replicaSetsOwnedByDeployment(items, deploymentUid) {
  /** @type {Map<string, object>} */
  const index = new Map();
  for (const rs of items ?? []) {
    const owner = (rs?.metadata?.ownerReferences ?? []).find(
      (ref) => ref.kind === 'Deployment' && ref.controller === true,
    );
    if (!owner || owner.uid !== deploymentUid) {
      continue;
    }
    const name = rs?.metadata?.name;
    const uid = rs?.metadata?.uid;
    if (typeof name !== 'string' || typeof uid !== 'string') {
      continue;
    }
    index.set(name, rs);
  }
  return index;
}

/**
 * @param {object} pod
 * @param {Map<string, object>} replicaSets
 * @returns {object | null}
 */
function resolvePodReplicaSet(pod, replicaSets) {
  const rsRef = (pod?.metadata?.ownerReferences ?? []).find(
    (ref) => ref.kind === 'ReplicaSet' && ref.controller === true,
  );
  if (!rsRef || typeof rsRef.name !== 'string' || typeof rsRef.uid !== 'string') {
    return null;
  }
  const match = replicaSets.get(rsRef.name);
  if (!match || match.metadata?.uid !== rsRef.uid) {
    return null;
  }
  return match;
}

/**
 * @param {object} replicaSet
 * @param {string} expectedDigest
 */
function replicaSetMatchesRolloutDigest(replicaSet, expectedDigest) {
  const annotated =
    replicaSet?.spec?.template?.metadata?.annotations?.[
      DEPLOYMENT_IMAGE_ID_ANNOTATION
    ];
  return annotated === expectedDigest;
}

/**
 * @param {object} pod
 * @param {string} containerName
 * @returns {{ ready: boolean, imageID: string } | null}
 */
function mainContainerStatus(pod, containerName) {
  const statuses = pod?.status?.containerStatuses ?? [];
  const match = statuses.find((entry) => entry?.name === containerName);
  if (!match) {
    return null;
  }
  return {
    ready: match.ready === true,
    imageID: typeof match.imageID === 'string' ? match.imageID : '',
  };
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {string} namespace
 * @param {string} deploymentName
 * @param {string} expectedDigest
 * @param {string[]} acceptedIds
 */
export function verifyDeploymentRolloutExecution(
  run,
  contextName,
  namespace,
  deploymentName,
  expectedDigest,
  acceptedIds,
) {
  const deploymentRead = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'deployment',
      name: deploymentName,
      namespace,
    },
    { run },
  );
  if (deploymentRead.state !== 'present') {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} unreadable after rollout`,
    );
  }
  const deployment = deploymentRead.object;
  const annotated =
    deployment.spec?.template?.metadata?.annotations?.[
      DEPLOYMENT_IMAGE_ID_ANNOTATION
    ];
  if (annotated !== expectedDigest) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} pod template annotation digest mismatch`,
    );
  }
  const deploymentUid = deployment.metadata?.uid;
  const generation = deployment.metadata?.generation;
  const observedGeneration = deployment.status?.observedGeneration;
  const specReplicas = deployment.spec?.replicas;
  const readyReplicas = deployment.status?.readyReplicas;
  const updatedReplicas = deployment.status?.updatedReplicas;
  const mainContainerName =
    deployment.spec?.template?.spec?.containers?.[0]?.name;
  if (typeof deploymentUid !== 'string' || deploymentUid.length === 0) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} uid missing after rollout`,
    );
  }
  if (
    typeof mainContainerName !== 'string' ||
    mainContainerName.length === 0
  ) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} main container name missing`,
    );
  }
  if (
    typeof generation !== 'number' ||
    typeof observedGeneration !== 'number' ||
    observedGeneration < generation
  ) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} generation has not been observed`,
    );
  }
  if (
    typeof specReplicas !== 'number' ||
    typeof readyReplicas !== 'number' ||
    typeof updatedReplicas !== 'number' ||
    readyReplicas !== specReplicas ||
    updatedReplicas !== specReplicas
  ) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} replica status is incomplete`,
    );
  }

  const replicaSetList = run('kubectl', [
    '--context',
    contextName,
    '-n',
    namespace,
    'get',
    'replicasets',
    '-l',
    `app=${deploymentName}`,
    '-o',
    'json',
  ]);
  if (!replicaSetList.ok) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} ReplicaSet list unreadable`,
    );
  }
  /** @type {{ items?: object[] }} */
  let replicaSetBody;
  try {
    replicaSetBody = JSON.parse(replicaSetList.stdout);
  } catch {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} ReplicaSet list malformed`,
    );
  }
  const ownedReplicaSets = replicaSetsOwnedByDeployment(
    replicaSetBody.items ?? [],
    deploymentUid,
  );

  const pods = run('kubectl', [
    '--context',
    contextName,
    '-n',
    namespace,
    'get',
    'pods',
    '-l',
    `app=${deploymentName}`,
    '-o',
    'json',
  ]);
  if (!pods.ok) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} pod list unreadable`,
    );
  }
  /** @type {{ items?: object[] }} */
  let podBody;
  try {
    podBody = JSON.parse(pods.stdout);
  } catch {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} pod list malformed`,
    );
  }

  /** @type {object[]} */
  const nonTerminatingPods = (podBody.items ?? []).filter(
    (pod) => !isPodTerminating(pod),
  );

  if (nonTerminatingPods.length !== specReplicas) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} has unexpected nonterminating replicas`,
    );
  }

  for (const replicaSet of ownedReplicaSets.values()) {
    if (replicaSetMatchesRolloutDigest(replicaSet, expectedDigest)) {
      continue;
    }
    const stalePods = nonTerminatingPods.filter(
      (pod) => resolvePodReplicaSet(pod, ownedReplicaSets) === replicaSet,
    );
    if (stalePods.length > 0) {
      throw rolloutRefusal(
        `deployment ${namespace}/${deploymentName} has nonterminating pods from an old ReplicaSet`,
      );
    }
  }

  let verifiedReplicas = 0;
  for (const pod of nonTerminatingPods) {
    const replicaSet = resolvePodReplicaSet(pod, ownedReplicaSets);
    if (!replicaSet) {
      throw rolloutRefusal(
        `deployment ${namespace}/${deploymentName} has a foreign pod for app=${deploymentName}`,
      );
    }
    const container = mainContainerStatus(pod, mainContainerName);
    if (!container || !container.ready) {
      throw rolloutRefusal(
        `deployment ${namespace}/${deploymentName} main container ${mainContainerName} is not ready`,
      );
    }
    const podDigest = digestFromPodImageId(container.imageID);
    if (!matchesRuntimeImageDigest({
      profileId: PROFILE_ID, node: pod?.spec?.nodeName, observedDigest: podDigest,
      expectedDigest, acceptedIds,
      run: (command, args) => {
        const result = run(command, args);
        return { ...result, status: result.ok ? 0 : 1 };
      },
    })) {
      throw rolloutRefusal(
        `deployment ${namespace}/${deploymentName} pod image identity is unknown`,
      );
    }
    verifiedReplicas += 1;
  }

  if (verifiedReplicas !== specReplicas) {
    throw rolloutRefusal(
      `deployment ${namespace}/${deploymentName} verified replica count mismatch`,
    );
  }
}

export const collectAcceptedReleaseImageIds = collectAcceptedMigrationImageIds;

/**
 * @param {{
 *   selected: string,
 *   loaderReceiptsJsonPath: string,
 *   run?: typeof runPlatformCommand,
 *   collectAcceptedIds?: typeof collectAcceptedReleaseImageIds,
 * }} input
 */
export function verifySelectedReleaseRollouts(input) {
  const run = input.run ?? runPlatformCommand;
  const collectAcceptedIds =
    input.collectAcceptedIds ?? collectAcceptedReleaseImageIds;
  const profile = readPlatformProfile(PROFILE_ID);
  const selectedFamilies = parseReleaseImageSelection(input.selected);
  const loaderReceipts = parseLoaderReceiptMap(
    JSON.parse(readFileSync(input.loaderReceiptsJsonPath, 'utf8')),
  );

  for (const family of selectedFamilies) {
    const receipt = loaderReceipts[family];
    if (!receipt) {
      throw rolloutRefusal(
        `loader receipt is missing for selected family ${family}`,
      );
    }
    const acceptedIds = collectAcceptedIds(receipt.runtimeRef ?? receipt.ref, run);
    if (!acceptedIds.includes(receipt.digest)) {
      throw rolloutRefusal(
        `loader receipt digest is not among accepted CRI image identities for ${family}`,
      );
    }
    const deploymentNames = FAMILY_DEPLOYMENTS[family] ?? [];
    const namespace =
      family === 'game-authority'
        ? 'lab-authority'
        : family === 'worker'
          ? 'lab-workers'
          : 'lab-edge';
    for (const deploymentName of deploymentNames) {
      console.error('[rollout] Waiting for ' + namespace + '/' + deploymentName);
      waitDeploymentRollout(
        run,
        profile.contextName,
        namespace,
        deploymentName,
      );
      verifyDeploymentRolloutExecution(
        run,
        profile.contextName,
        namespace,
        deploymentName,
        receipt.digest,
        acceptedIds,
      );
    }
  }
  return { ok: true, families: [...selectedFamilies] };
}

function main() {
  const command = process.argv[2];
  if (command === 'prepare') {
    const section = process.argv[3];
    const infile = process.argv[4];
    const outfile = process.argv[5];
    if (!section || !infile || !outfile) {
      process.stderr.write(
        'usage: node rollout.mjs prepare <section> <rendered.yaml> <apply.yaml>\n',
      );
      process.exitCode = 1;
      return;
    }
    const selected =
      process.env.OFFSCREEN_RELEASE_IMAGES ?? 'web,api,game-authority,worker';
    const loaderReceiptsJsonPath =
      process.env.OFFSCREEN_RELEASE_LOADER_RECEIPTS_FILE;
    if (!loaderReceiptsJsonPath) {
      process.stderr.write(
        'Refusing install: release loader receipts file is missing.\n',
      );
      process.exitCode = 1;
      return;
    }
    try {
      const receipt = prepareReleaseApplyManifest({
        section,
        renderedYamlPath: infile,
        outputYamlPath: outfile,
        selected,
        loaderReceiptsJsonPath,
      });
      if (receipt.applyCount === 0) {
        process.stderr.write(
          `Release ${section} overlay prepared selected (${receipt.applyCount} Deployment updates).\n`,
        );
      } else {
        process.stderr.write(
          `Release ${section} overlay prepared selected (${receipt.applyCount} Deployment update(s)).\n`,
        );
      }
      process.exitCode = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Refusing install: ${message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'verify') {
    const selected =
      process.env.OFFSCREEN_RELEASE_IMAGES ?? 'web,api,game-authority,worker';
    const loaderReceiptsJsonPath =
      process.env.OFFSCREEN_RELEASE_LOADER_RECEIPTS_FILE;
    if (!loaderReceiptsJsonPath) {
      process.stderr.write(
        'Refusing install: release loader receipts file is missing.\n',
      );
      process.exitCode = 1;
      return;
    }
    try {
      verifySelectedReleaseRollouts({
        selected,
        loaderReceiptsJsonPath,
      });
      process.exitCode = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Refusing install: ${message}\n`);
      process.exitCode = 1;
    }
    return;
  }

  process.stderr.write(
    'usage: node rollout.mjs prepare <section> <rendered.yaml> <apply.yaml> | verify\n',
  );
  process.exitCode = 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

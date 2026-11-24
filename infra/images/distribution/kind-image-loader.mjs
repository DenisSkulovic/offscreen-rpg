#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readKindProfile } from '../../clusters/kind/manager/config.mjs';

/** @typedef {{ status: number | null, stdout: string, stderr: string, signal?: string | null }} RunResult */
/** @typedef {(command: string, args: string[], options?: { timeout?: number }) => RunResult} CommandRunner */

const DEFAULT_TIMEOUT_MS = 120_000;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;

const MANIFEST_MEDIA_TYPES = new Set([
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
]);
const INDEX_MEDIA_TYPES = new Set([
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
]);

const DEV_CANONICAL_RE = /^offscreen-dev-workspace:union-[0-9a-f]{16}$/;
const DEV_SLOT_RE =
  /^offscreen-dev-workspace:dev-[1-9][0-9]*-(web|api|authority|worker)$/;
const RELEASE_PINNED = new Set([
  'offscreen-lab-game-web:turn02',
  'offscreen-lab-app-release-api:turn02',
  'offscreen-lab-app-release-ga:turn02',
  'offscreen-lab-app-release-worker:turn02',
]);

const RELEASE_REPO_RES = [
  /^offscreen-lab-game-web:[A-Za-z0-9._-]+$/,
  /^offscreen-lab-app-release-api:[A-Za-z0-9._-]+$/,
  /^offscreen-lab-app-release-ga:[A-Za-z0-9._-]+$/,
  /^offscreen-lab-app-release-worker:[A-Za-z0-9._-]+$/,
];

/**
 * @param {string} digest
 */
export function isValidSha256Digest(digest) {
  return SHA256_RE.test(digest);
}

/**
 * @param {string} ref
 */
export function normalizeCtrRef(ref) {
  if (ref.includes('/')) {
    return ref;
  }
  return `docker.io/library/${ref}`;
}

/**
 * @param {string} profileId
 */
function assertProfileId(profileId) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error(`unknown kind profile ${profileId}`);
  }
}

/**
 * @param {string} profileId
 * @param {string} ref
 */
export function validateRefForProfile(profileId, ref) {
  assertProfileId(profileId);
  if (
    typeof ref !== 'string' ||
    ref.length === 0 ||
    /[\s$`'";\\|&<>]/.test(ref)
  ) {
    throw new Error('refusing ref: malformed or unsafe ref');
  }
  const isDevFamily = DEV_CANONICAL_RE.test(ref) || DEV_SLOT_RE.test(ref);
  const isReleaseFamily =
    RELEASE_PINNED.has(ref) || RELEASE_REPO_RES.some((re) => re.test(ref));

  if (profileId === 'dev') {
    if (isDevFamily) {
      return ref;
    }
    if (isReleaseFamily) {
      throw new Error('refusing ref: cross-profile ref family');
    }
    throw new Error(`refusing ref: ${ref} is not accepted for dev profile`);
  }

  if (isDevFamily) {
    throw new Error('refusing ref: cross-profile ref family');
  }
  if (isReleaseFamily) {
    return ref;
  }
  throw new Error(`refusing ref: ${ref} is not accepted for release profile`);
}

/**
 * @param {string} ref
 * @param {CommandRunner} run
 */
function inspectHostDigest(ref, run) {
  const result = run('docker', [
    'image',
    'inspect',
    '--format',
    '{{.Id}}',
    ref,
  ]);
  if (result.status !== 0) {
    throw new Error(`host image inspect failed for ${ref}`);
  }
  const digest = result.stdout.trim();
  if (!isValidSha256Digest(digest)) {
    throw new Error(`malformed host digest for ${ref}`);
  }
  return digest;
}

/**
 * @param {string} arch
 */
export function normalizeNodeArchitecture(arch) {
  if (arch === 'x86_64') {
    return 'amd64';
  }
  if (arch === 'aarch64') {
    return 'arm64';
  }
  return arch;
}

/**
 * @param {unknown} descriptor
 */
function isAttestationOrUnknownDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') {
    return true;
  }
  const entry = /** @type {{ mediaType?: unknown, artifactType?: unknown }} */ (
    descriptor
  );
  if (typeof entry.artifactType === 'string' && entry.artifactType.length > 0) {
    return true;
  }
  if (typeof entry.mediaType !== 'string') {
    return true;
  }
  return !MANIFEST_MEDIA_TYPES.has(entry.mediaType);
}

/**
 * @param {unknown} platform
 * @param {string} os
 * @param {string} architecture
 */
function platformMatches(platform, os, architecture) {
  if (!platform || typeof platform !== 'object') {
    return false;
  }
  const value = /** @type {{ os?: unknown, architecture?: unknown }} */ (
    platform
  );
  if (typeof value.os !== 'string' || typeof value.architecture !== 'string') {
    return false;
  }
  return (
    value.os === os &&
    normalizeNodeArchitecture(value.architecture) ===
      normalizeNodeArchitecture(architecture)
  );
}

/**
 * @param {unknown} parsed
 */
export function manifestConfigDigestFromObject(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('unreadable image manifest content');
  }
  const mediaType = /** @type {{ mediaType?: unknown }} */ (parsed).mediaType;
  if (typeof mediaType !== 'string' || !MANIFEST_MEDIA_TYPES.has(mediaType)) {
    throw new Error('refusing image manifest: unsupported media type');
  }
  const config = /** @type {{ config?: { digest?: unknown } }} */ (parsed)
    .config;
  const digest = config?.digest;
  if (typeof digest !== 'string' || !isValidSha256Digest(digest)) {
    throw new Error('malformed image config digest');
  }
  return digest;
}

/**
 * @param {string} stdout
 * @param {string} os
 * @param {string} architecture
 */
export function resolveManifestDigestFromIndex(stdout, os, architecture) {
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error('unreadable image index content');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('unreadable image index content');
  }
  const mediaType = /** @type {{ mediaType?: unknown }} */ (parsed).mediaType;
  if (typeof mediaType !== 'string' || !INDEX_MEDIA_TYPES.has(mediaType)) {
    throw new Error('refusing image index: unsupported media type');
  }
  const manifests = /** @type {{ manifests?: unknown }} */ (parsed).manifests;
  if (!Array.isArray(manifests)) {
    throw new Error('unreadable image index content');
  }
  /** @type {string[]} */
  const matches = [];
  for (const descriptor of manifests) {
    if (isAttestationOrUnknownDescriptor(descriptor)) {
      continue;
    }
    const entry = /** @type {{ digest?: unknown, platform?: unknown }} */ (
      descriptor
    );
    if (
      typeof entry.digest !== 'string' ||
      !isValidSha256Digest(entry.digest)
    ) {
      continue;
    }
    if (!platformMatches(entry.platform, os, architecture)) {
      continue;
    }
    matches.push(entry.digest);
  }
  if (matches.length === 0) {
    throw new Error('image index has no manifest for node platform');
  }
  if (matches.length > 1) {
    throw new Error('ambiguous image index manifests for node platform');
  }
  return matches[0];
}

/**
 * @param {string} node
 * @param {CommandRunner} run
 */
function inspectNodePlatform(node, run) {
  const osResult = run('docker', ['inspect', '--format', '{{.Os}}', node]);
  const archResult = run('docker', [
    'inspect',
    '--format',
    '{{.Architecture}}',
    node,
  ]);
  if (osResult.status !== 0 || archResult.status !== 0) {
    throw new Error(`node platform inspect failed for ${node}`);
  }
  const os = osResult.stdout.trim();
  const architecture = archResult.stdout.trim();
  if (!os || !architecture) {
    throw new Error(`node platform inspect failed for ${node}`);
  }
  return { os, architecture };
}

/**
 * @param {string} node
 * @param {string} digest
 * @param {CommandRunner} run
 */
function readCtrContent(node, digest, run) {
  const result = run('docker', [
    'exec',
    node,
    'ctr',
    '-n',
    'k8s.io',
    'content',
    'get',
    digest,
  ]);
  if (result.status !== 0) {
    throw new Error(`node image content unreadable for ${node}`);
  }
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`node image content unreadable for ${node}`);
  }
  return stdout;
}

/**
 * @param {string} node
 * @param {string} normalizedRef
 * @param {string} targetDigest
 * @param {CommandRunner} run
 * @returns {{ configId: string, manifestDigest: string, targetDigest: string }}
 */
function identityFromNodeTarget(node, targetDigest, run) {
  const targetContent = readCtrContent(node, targetDigest, run);
  /** @type {unknown} */
  let targetParsed;
  try {
    targetParsed = JSON.parse(targetContent);
  } catch {
    throw new Error('unreadable image target content');
  }
  if (!targetParsed || typeof targetParsed !== 'object') {
    throw new Error('unreadable image target content');
  }
  const mediaType = /** @type {{ mediaType?: unknown }} */ (targetParsed)
    .mediaType;
  if (typeof mediaType !== 'string') {
    throw new Error('refusing image target: missing media type');
  }

  let manifestDigest = targetDigest;

  if (INDEX_MEDIA_TYPES.has(mediaType)) {
    const { os, architecture } = inspectNodePlatform(node, run);
    manifestDigest = resolveManifestDigestFromIndex(
      targetContent,
      os,
      architecture,
    );
    const manifestContent = readCtrContent(node, manifestDigest, run);
    targetParsed = JSON.parse(manifestContent);
  } else if (!MANIFEST_MEDIA_TYPES.has(mediaType)) {
    throw new Error('refusing image target: unsupported media type');
  }

  const configId = manifestConfigDigestFromObject(targetParsed);
  return { configId, manifestDigest, targetDigest };
}

/**
 * @param {{
 *   node: string;
 *   ref: string;
 *   run?: CommandRunner;
 * }} opts
 * @returns {{ configId: string, manifestDigest: string, targetDigest: string } | null}
 */
export function readKindImageIdentity(opts) {
  const { node, ref, run = defaultRun } = opts;
  if (typeof node !== 'string' || node.length === 0) {
    throw new Error('refusing node image identity: malformed node');
  }
  if (typeof ref !== 'string' || ref.length === 0) {
    throw new Error('refusing node image identity: malformed ref');
  }
  const normalizedRef = normalizeCtrRef(ref);
  const listResult = run('docker', [
    'exec',
    node,
    'ctr',
    '-n',
    'k8s.io',
    'images',
    'ls',
  ]);
  if (listResult.status !== 0) {
    throw new Error(`node image inspect failed for ${node}`);
  }
  const targetDigest = parseCtrDigest(listResult.stdout, normalizedRef);
  if (targetDigest === null) {
    return null;
  }
  return identityFromNodeTarget(node, targetDigest, run);
}

export function parseCtrDigest(stdout, normalizedRef) {
  /** @type {string[]} */
  const matches = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === normalizedRef && parts[2]) {
      matches.push(parts[2]);
    }
  }
  if (matches.length > 1) {
    throw new Error(`ambiguous duplicate rows for ${normalizedRef}`);
  }
  if (matches.length === 0) {
    return null;
  }
  const digest = matches[0];
  if (!isValidSha256Digest(digest)) {
    throw new Error(`malformed node digest for ${normalizedRef}`);
  }
  return digest;
}

/**
 * @param {string} node
 * @param {string} result
 */
function logKindLoad(node, result) {
  console.error(`phase=kind-load node=${node} result=${result}`);
}

/**
 * @param {string[]} names
 * @param {string} clusterName
 */
export function sortKindNodes(names, clusterName) {
  return [...names].sort((a, b) => {
    const aSuffix = a.slice(clusterName.length + 1);
    const bSuffix = b.slice(clusterName.length + 1);
    const aPri = aSuffix === 'control-plane' ? 0 : 1;
    const bPri = bSuffix === 'control-plane' ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    return a.localeCompare(b);
  });
}

/**
 * @param {ReturnType<typeof readKindProfile>} profile
 * @param {CommandRunner} run
 */
export function discoverKindNodes(profile, run) {
  const result = run('kind', [
    'get',
    'nodes',
    '--name',
    profile.clusterName,
    '-o',
    'name',
  ]);
  if (result.status !== 0) {
    throw new Error(`kind get nodes failed for ${profile.clusterName}`);
  }
  const names = result.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.replace(/^node\//, ''));
  if (names.length === 0) {
    throw new Error('kind node inventory is empty');
  }
  if (names.length !== profile.nodeCount) {
    throw new Error(
      `kind node count ${names.length} does not match profile ${profile.nodeCount}`,
    );
  }
  const unique = new Set(names);
  if (unique.size !== names.length) {
    throw new Error('duplicate kind node names in inventory');
  }

  const expected = profile.roles.map(
    (role) => `${profile.clusterName}-${role}`,
  );
  const expectedSet = new Set(expected);
  for (const expectedName of expected) {
    if (!unique.has(expectedName)) {
      throw new Error(`missing expected kind node ${expectedName}`);
    }
  }
  for (const name of names) {
    if (!expectedSet.has(name)) {
      throw new Error(`foreign kind node ${name}`);
    }
    if (!name.startsWith(`${profile.clusterName}-`)) {
      throw new Error(
        `kind node ${name} does not belong to ${profile.clusterName}`,
      );
    }
    const label = run('docker', [
      'inspect',
      '--format',
      '{{index .Config.Labels "io.x-k8s.kind.cluster"}}',
      name,
    ]);
    if (label.status !== 0) {
      throw new Error(`docker inspect failed for node ${name}`);
    }
    if (label.stdout.trim() !== profile.clusterName) {
      throw new Error(`kind node ${name} has foreign cluster label`);
    }
  }

  return sortKindNodes(names, profile.clusterName);
}

/**
 * @param {string} clusterName
 * @param {string} ref
 * @param {string} node
 * @param {CommandRunner} run
 */
function loadImageToNode(clusterName, ref, node, run) {
  const result = run('kind', [
    'load',
    'docker-image',
    ref,
    '--name',
    clusterName,
    '--nodes',
    node,
  ]);
  if (result.status !== 0) {
    throw new Error(`kind load failed for ${node}`);
  }
}

/**
 * @param {{
 *   profileId: 'dev' | 'release';
 *   ref: string;
 *   expectedDigest?: string;
 *   run?: CommandRunner;
 * }} opts
 */
export function ensureKindImage(opts) {
  const { profileId, ref, expectedDigest, run = defaultRun } = opts;
  assertProfileId(profileId);
  const validatedRef = validateRefForProfile(profileId, ref);
  const profile = readKindProfile(profileId);

  let hostDigest = inspectHostDigest(validatedRef, run);
  if (expectedDigest !== undefined && expectedDigest !== '') {
    if (!isValidSha256Digest(expectedDigest)) {
      throw new Error('malformed expected digest');
    }
    if (hostDigest !== expectedDigest) {
      throw new Error('expected digest does not match host image');
    }
  }

  const nodes = discoverKindNodes(profile, run);

  /** @type {Map<string, { configId: string, manifestDigest: string, targetDigest: string } | null>} */
  const snapshot = new Map();
  for (const node of nodes) {
    snapshot.set(node, readKindImageIdentity({ node, ref: validatedRef, run }));
  }

  /** @type {string[]} */
  const loadedNodes = [];
  /** @type {string[]} */
  const reusedNodes = [];

  for (const node of nodes) {
    const identity = snapshot.get(node) ?? null;
    const nodeConfigId = identity?.configId ?? null;
    if (nodeConfigId === hostDigest) {
      logKindLoad(node, 'reused');
      reusedNodes.push(node);
      continue;
    }
    logKindLoad(node, 'miss');

    const freshHost = inspectHostDigest(validatedRef, run);
    if (freshHost !== hostDigest) {
      throw new Error('host image digest changed before load');
    }

    loadImageToNode(profile.clusterName, validatedRef, node, run);
    loadedNodes.push(node);
    logKindLoad(node, 'loaded');

    const afterLoad = readKindImageIdentity({ node, ref: validatedRef, run });
    if (!afterLoad || afterLoad.configId !== hostDigest) {
      throw new Error(`post-load-mismatch node=${node}`);
    }
    snapshot.set(node, afterLoad);
  }

  const receiptHost = inspectHostDigest(validatedRef, run);
  if (receiptHost !== hostDigest) {
    throw new Error('host image digest changed before receipt');
  }
  hostDigest = receiptHost;

  /** @type {Record<string, { configId: string, manifestDigest: string, targetDigest: string }>} */
  const receiptNodes = {};
  for (const node of nodes) {
    const identity = readKindImageIdentity({ node, ref: validatedRef, run });
    if (!identity || identity.configId !== hostDigest) {
      throw new Error(`final-verify-mismatch node=${node}`);
    }
    receiptNodes[node] = identity;
  }

  return {
    ref: validatedRef,
    digest: hostDigest,
    loadedNodes,
    reusedNodes,
    nodes: receiptNodes,
  };
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ timeout?: number }} [options]
 */
export function defaultRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    signal: result.signal,
  };
}

/**
 * @param {string} profileId
 * @param {string} ref
 * @param {string} node
 * @param {CommandRunner} run
 */
export function inspectKindImageOnNode(profileId, ref, node, run = defaultRun) {
  assertProfileId(profileId);
  const validatedRef = validateRefForProfile(profileId, ref);
  const profile = readKindProfile(profileId);
  const nodes = discoverKindNodes(profile, run);
  if (!nodes.includes(node)) {
    throw new Error(`refusing node image identity: foreign kind node ${node}`);
  }
  return readKindImageIdentity({ node, ref: validatedRef, run });
}

function isCli() {
  return Boolean(process.argv[1]?.endsWith('kind-image-loader.mjs'));
}

if (isCli()) {
  const command = process.argv[2];
  if (command === 'inspect') {
    const profileId = process.argv[3];
    const ref = process.argv[4];
    const node = process.argv[5];
    try {
      const identity = inspectKindImageOnNode(profileId, ref, node);
      process.stdout.write(`${JSON.stringify(identity)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  } else {
    const profileId = command;
    const ref = process.argv[3];
    const expectedDigest = process.argv[4];
    try {
      const receipt = ensureKindImage({
        profileId,
        ref,
        expectedDigest,
      });
      process.stdout.write(`${JSON.stringify(receipt)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  }
}

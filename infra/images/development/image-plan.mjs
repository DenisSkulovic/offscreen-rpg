/**
 * Cross-slot identity for the dev role images.
 * The key is the Docker build context after Dockerfile.dockerignore,
 * plus the Dockerfile recipe and the role build argument.
 * Slot ids, worktree paths and Git HEAD are not inputs.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

export const UNION_ROLE_FILTER =
  '@offscreen/web^... @offscreen/api^... @offscreen/game-authority^... @offscreen/worker^...';
export const SLOT_ALIAS_ROLES = Object.freeze([
  'web',
  'api',
  'authority',
  'worker',
]);
export const DEV_DOCKERFILE = 'infra/images/development/Dockerfile';
export const DEV_DOCKERIGNORE =
  'infra/images/development/Dockerfile.dockerignore';
export const TOOLCHAIN_PIN = 'infra/images/common/toolchain.pin';
const REQUIRED_NODES = ['control-plane', 'worker'];

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parseDockerignore(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });
}

function patternToRegExp(pattern) {
  let source = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === '*' && next === '*') {
      source += '.*';
      i += 1;
      if (pattern[i + 1] === '/') i += 1;
    } else if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

/**
 * Last matching Dockerfile.dockerignore rule wins, including negation.
 * A pattern with no slash matches a name in any directory.
 * @param {string} relativePath posix path
 * @param {string[]} rules
 */
export function isDockerignored(relativePath, rules) {
  const path = relativePath.split(posix.sep).join('/');
  let ignored = false;
  for (const raw of rules) {
    const negate = raw.startsWith('!');
    let pattern = negate ? raw.slice(1) : raw;
    const dirOnly = pattern.endsWith('/');
    if (dirOnly) pattern = pattern.slice(0, -1);
    const expression = patternToRegExp(
      pattern.includes('/') ? pattern : `**/${pattern}`,
    );
    const matched = expression.test(path) || path.split('/').includes(pattern);
    if (matched) ignored = !negate;
  }
  return ignored;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {string} text full toolchain.pin bytes
 * @returns {{ ok: true, pinBytes: string, resolvedImage: string, pnpmVersion: string } | { ok: false, reason: string }}
 */
export function parseToolchainPin(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, reason: 'malformed-toolchain-pin' };
  }
  /** @type {Record<string, string>} */
  const values = {};
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/\r$/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) return { ok: false, reason: 'malformed-toolchain-pin' };
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  const { NODE_IMAGE, NODE_DIGEST, PNPM_VERSION } = values;
  if (!NODE_IMAGE || !NODE_DIGEST || !PNPM_VERSION) {
    return { ok: false, reason: 'malformed-toolchain-pin' };
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(NODE_DIGEST)) {
    return { ok: false, reason: 'malformed-toolchain-pin' };
  }
  return {
    ok: true,
    pinBytes: text,
    resolvedImage: `${NODE_IMAGE}@${NODE_DIGEST}`,
    pnpmVersion: PNPM_VERSION,
  };
}

/**
 * @param {string} root
 * @param {{ roleFilter: string, readText?: (path: string) => string, listFiles?: (root: string, rules: string[]) => { path: string, bytes: Buffer }[] }} input
 * @returns {{ ok: true, fingerprint: string, roleFilter: string, baseImage: string, fileCount: number } | { ok: false, reason: string }}
 */
export function fingerprintDevImageContext(root, input) {
  if (!input?.roleFilter) return { ok: false, reason: 'missing-role-filter' };
  const readText = input.readText ?? ((path) => readFileSync(path, 'utf8'));
  let dockerfile;
  let ignoreText;
  let toolchainText;
  try {
    dockerfile = readText(join(root, DEV_DOCKERFILE));
    ignoreText = readText(join(root, DEV_DOCKERIGNORE));
    toolchainText = readText(join(root, TOOLCHAIN_PIN));
  } catch {
    return { ok: false, reason: 'unreadable-recipe' };
  }
  const toolchain = parseToolchainPin(toolchainText);
  if (!toolchain.ok) return toolchain;
  const baseImage = toolchain.resolvedImage;
  const rules = parseDockerignore(ignoreText);
  let files;
  try {
    files = input.listFiles
      ? input.listFiles(root, rules)
      : listContextFiles(root, rules);
  } catch {
    return { ok: false, reason: 'unreadable-context' };
  }
  const hash = createHash('sha256');
  hash.update(`dockerfile ${sha256(dockerfile)}\n`);
  hash.update(`dockerignore ${sha256(ignoreText)}\n`);
  hash.update(`toolchain ${sha256(toolchain.pinBytes)}\n`);
  hash.update(`base ${baseImage}\n`);
  hash.update(`turbo-filter ${input.roleFilter}\n`);
  const ordered = [...files].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  for (const file of ordered) {
    hash.update(`file ${file.path} ${sha256(file.bytes)}\n`);
  }
  return {
    ok: true,
    fingerprint: hash.digest('hex'),
    roleFilter: input.roleFilter,
    baseImage,
    fileCount: ordered.length,
  };
}

/**
 * Image identity is the content hash from this call.
 * A caller may pass `verifiedFingerprint` only after it hashed in the same
 * startup. A cache file of sizes and mtimes is not identity: those fields
 * can stay unchanged while bytes change, including across invocations.
 * @param {string} root
 * @param {{ roleFilter?: string, verifiedFingerprint?: string, cachePath?: string }} input
 */
export function fingerprintDevImageContextCached(root, input) {
  const verified = input?.verifiedFingerprint;
  if (typeof verified === 'string' && /^[a-f0-9]{64}$/.test(verified)) {
    return {
      ok: true,
      fingerprint: verified,
      roleFilter: input.roleFilter,
      cache: 'invocation',
    };
  }
  const fresh = fingerprintDevImageContext(root, input);
  return { ...fresh, cache: fresh.ok ? 'miss' : undefined };
}

function listContextFiles(root, rules) {
  /** @type {{ path: string, bytes: Buffer }[]} */
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name);
      const rel = relative(root, absolute).split('\\').join('/');
      if (isDockerignored(rel, rules)) continue;
      const info = statSync(absolute);
      if (info.isSymbolicLink()) throw new Error('symlink');
      if (info.isDirectory()) visit(absolute);
      else if (info.isFile())
        files.push({ path: rel, bytes: readFileSync(absolute) });
    }
  };
  visit(root);
  return files;
}

/**
 * Decide whether a slot may reuse an immutable role artifact.
 * A local tag is not readiness. Both Kind nodes must have the same digest.
 * @param {{
 *   slotId: string,
 *   role: string,
 *   filter: string,
 *   fingerprint: string | null,
 *   artifacts: { digest?: string, fingerprint?: string, role?: string, filter?: string, declaredFingerprint?: string }[],
 *   nodes: { controlPlane?: string[], worker?: string[] },
 * }} input
 */
export function planSlotImageArtifact(input) {
  const base = {
    slotId: input.slotId,
    role: input.role,
    fingerprint: input.fingerprint,
    digest: null,
    decision: 'miss',
    reason: 'unproven-context',
    build: true,
    loadNodes: [...REQUIRED_NODES],
  };
  if (!input.fingerprint) return base;
  const mismatched = input.artifacts.find(
    (artifact) =>
      artifact.declaredFingerprint &&
      artifact.declaredFingerprint !== artifact.fingerprint,
  );
  if (mismatched) {
    return {
      ...base,
      reason: 'mismatched-metadata',
      digest: mismatched.digest ?? null,
    };
  }
  const compatible = input.artifacts.filter(
    (artifact) =>
      artifact.fingerprint === input.fingerprint &&
      artifact.role === input.role &&
      artifact.filter === input.filter &&
      typeof artifact.digest === 'string' &&
      artifact.digest.startsWith('sha256:'),
  );
  if (compatible.length === 0)
    return { ...base, reason: 'no-compatible-artifact' };
  const digest = compatible[0].digest;
  if (compatible.some((artifact) => artifact.digest !== digest)) {
    return { ...base, reason: 'conflicting-digests', digest };
  }
  const present = {
    'control-plane': input.nodes?.controlPlane ?? [],
    worker: input.nodes?.worker ?? [],
  };
  const loadNodes = REQUIRED_NODES.filter(
    (node) => !present[node].includes(digest),
  );
  const ready = loadNodes.length === 0;
  return {
    ...base,
    digest,
    decision: ready ? 'hit' : 'miss',
    reason: ready ? 'loaded-on-required-nodes' : 'missing-kind-node',
    build: false,
    loadNodes,
  };
}

/**
 * One union artifact for every slot alias. A hit still loads a node that
 * has the digest but not this slot's tag.
 * @param {{
 *   slotId: string,
 *   fingerprint: string | null,
 *   artifact?: { digest?: string, fingerprint?: string } | null,
 *   nodes?: Record<string, { digests?: string[], tags?: string[] }>,
 * }} input
 */
/**
 * Kind alias decision for one slot tag.
 * `expectedConfigId` and each node's `configId` are image config digests
 * (Docker image ID / CRI image id). A containerd manifest digest is a
 * different value and must not be passed here. A missing or different
 * config id reloads that node only. Other tags are not part of the plan.
 * @param {{
 *   ref: string,
 *   expectedConfigId: string | null,
 *   nodes?: Record<string, { configId?: string | null }>,
 * }} input
 */
export function planAliasIdentityLoad(input) {
  const expected = input.expectedConfigId;
  const comparable =
    typeof expected === 'string' && /^sha256:[a-f0-9]{64}$/.test(expected);
  const loadNodes = REQUIRED_NODES.filter((node) => {
    if (!comparable) return true;
    return input.nodes?.[node]?.configId !== expected;
  });
  return {
    ref: input.ref,
    expectedConfigId: comparable ? expected : null,
    loadNodes,
    ready: comparable && loadNodes.length === 0,
    reason: !comparable
      ? 'unproven-config-id'
      : loadNodes.length === 0
        ? 'alias-identity-matches'
        : 'alias-identity-stale-or-absent',
  };
}

/**
 * Post-load check. Ready only when every required node alias resolves to
 * the expected config id. A failed load leaves the previous id in place.
 * @param {{
 *   expectedConfigId: string | null,
 *   nodes?: Record<string, { configId?: string | null }>,
 * }} input
 */
const GENERATION_ID = /^sha256:[a-f0-9]{64}$/;

/**
 * Whether a Deployment must roll because its recorded image generation
 * differs from the verified loaded identity. The same generation is a no-op.
 * This token is the host image id already compared at Kind load time.
 * It is not a CRI config id and must not be compared with one.
 * @param {{ currentGeneration?: string | null, expectedGeneration?: string | null }} input
 */
/** Content tag Tilt selects. The slot alias is not Deployment authority. */
export function contentDerivedImageRef(fingerprint) {
  if (typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint))
    return null;
  return `offscreen-dev-workspace:union-${fingerprint.slice(0, 16)}`;
}

/**
 * Selected Deployment image. A new fingerprint changes the ref and rolls.
 * The same ref is a no-op. The ref is selected only when both Kind nodes have it.
 * @param {{ fingerprint?: string | null, currentRef?: string | null, nodes?: Record<string, { tags?: string[] }> }} input
 */
export function planContentImageSelection(input) {
  const ref = contentDerivedImageRef(input.fingerprint ?? '');
  if (!ref)
    return {
      ref: null,
      roll: false,
      reason: 'unproven-context',
      missing: ['control-plane', 'worker'],
    };
  const missing = ['control-plane', 'worker'].filter(
    (node) => !(input.nodes?.[node]?.tags ?? []).includes(ref),
  );
  if (missing.length > 0)
    return { ref, roll: false, reason: 'missing-kind-node', missing };
  const roll = input.currentRef !== ref;
  return {
    ref,
    roll,
    reason: roll ? 'generation-changed' : 'generation-unchanged',
    missing: [],
  };
}

export function planImageGenerationRollout(input) {
  const expected = input.expectedGeneration ?? null;
  if (!GENERATION_ID.test(expected ?? '')) {
    return { roll: false, generation: null, reason: 'unproven-generation' };
  }
  if (input.currentGeneration === expected) {
    return {
      roll: false,
      generation: expected,
      reason: 'generation-unchanged',
    };
  }
  return { roll: true, generation: expected, reason: 'generation-changed' };
}

export function confirmLoadedAliasIdentity(input) {
  const plan = planAliasIdentityLoad({
    ref: input.ref ?? '',
    expectedConfigId: input.expectedConfigId,
    nodes: input.nodes,
  });
  if (!plan.ready) {
    return { ok: false, reason: 'post-load-mismatch', nodes: plan.loadNodes };
  }
  return { ok: true, reason: 'alias-identity-matches', nodes: [] };
}

export function planUnionImageUse(input) {
  const aliases = SLOT_ALIAS_ROLES.map(
    (role) => `offscreen-dev-workspace:${input.slotId}-${role}`,
  );
  const base = {
    fingerprint: input.fingerprint,
    digest: input.artifact?.digest ?? null,
    aliases,
    build: true,
    loadNodes: [...REQUIRED_NODES],
    ready: false,
    reason: 'no-compatible-artifact',
  };
  if (!input.fingerprint) return { ...base, reason: 'unproven-context' };
  const artifact = input.artifact;
  if (
    !artifact?.digest?.startsWith('sha256:') ||
    artifact.fingerprint !== input.fingerprint
  ) {
    return base;
  }
  const loadNodes = REQUIRED_NODES.filter((node) => {
    const present = input.nodes?.[node] ?? {};
    const hasDigest = (present.digests ?? []).includes(artifact.digest);
    const hasAliases = aliases.every((tag) =>
      (present.tags ?? []).includes(tag),
    );
    return !hasDigest || !hasAliases;
  });
  const ready = loadNodes.length === 0;
  return {
    ...base,
    digest: artifact.digest,
    build: false,
    loadNodes,
    ready,
    reason: ready ? 'loaded-on-required-nodes' : 'missing-kind-node',
  };
}

/**
 * Restart identity for one Tilt expected ref.
 * A matching canonical fingerprint reuses the digest. A new tag may still
 * be an alias, and a missing node may still need a load. Neither is a Docker
 * build. Application readiness waits until the pod is running that digest.
 *
 * @param {{
 *   expectedRef: string,
 *   fingerprint: string | null,
 *   canonical?: { fingerprint?: string, digest?: string, ref?: string } | null,
 *   nodeHasRef?: boolean,
 *   podImage?: string | null,
 *   podReady?: boolean,
 * }} input
 */
export function planRestartImageReuse(input) {
  const canonical = input.canonical ?? null;
  const fingerprintMatches = Boolean(
    input.fingerprint &&
    canonical?.fingerprint === input.fingerprint &&
    canonical.digest?.startsWith('sha256:'),
  );
  const dockerBuild = !fingerprintMatches;
  const alias = fingerprintMatches && input.expectedRef !== canonical.ref;
  const nodeIdentityMatches = input.nodeConfigId
    ? input.nodeConfigId === canonical?.digest
    : input.nodeHasRef === true;
  const kindLoad = fingerprintMatches && !nodeIdentityMatches;
  const deploymentSelected =
    fingerprintMatches &&
    (input.podImage === input.expectedRef ||
      input.podImage === canonical.digest);
  const podConfigMatches =
    !input.podConfigId || input.podConfigId === canonical?.digest;
  const applicationReady =
    deploymentSelected &&
    podConfigMatches &&
    input.podReady === true &&
    !kindLoad &&
    !dockerBuild;
  return {
    dockerBuild,
    canonicalDigest: fingerprintMatches ? canonical.digest : null,
    alias,
    kindLoad,
    deploymentSelected,
    applicationReady,
    reason: applicationReady
      ? 'generation-ready'
      : dockerBuild
        ? 'canonical-miss'
        : kindLoad
          ? 'image-loading'
          : 'pod-not-on-generation',
  };
}

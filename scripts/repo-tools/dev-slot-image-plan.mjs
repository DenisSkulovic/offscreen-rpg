/**
 * Cross-slot identity for the dev role images.
 * The key is the Docker build context after Dockerfile.dockerignore,
 * plus the Dockerfile recipe and the role build argument.
 * Slot ids, worktree paths and Git HEAD are not inputs.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

export const UNION_ROLE_FILTER = '@offscreen/web^... @offscreen/api^... @offscreen/game-authority^... @offscreen/worker^...';
export const SLOT_ALIAS_ROLES = Object.freeze(['web', 'api', 'authority', 'worker']);
export const DEV_DOCKERFILE = 'infra/kubernetes/lab/dev/Dockerfile';
export const DEV_DOCKERIGNORE = 'infra/kubernetes/lab/dev/Dockerfile.dockerignore';
const REQUIRED_NODES = ['control-plane', 'worker'];

/**
 * @param {string} text
 * @returns {string[]}
 */
export function parseDockerignore(text) {
  return text.split('\n').map((line) => line.replace(/\r$/, '')).filter((line) => {
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
    const expression = patternToRegExp(pattern.includes('/') ? pattern : `**/${pattern}`);
    const matched = expression.test(path) || path.split('/').includes(pattern);
    if (matched) ignored = !negate;
  }
  return ignored;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {string} dockerfile
 */
export function readPinnedBaseImage(dockerfile) {
  const from = dockerfile.match(/^FROM\s+(\S+)/m);
  return from?.[1] ?? null;
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
  try {
    dockerfile = readText(join(root, DEV_DOCKERFILE));
    ignoreText = readText(join(root, DEV_DOCKERIGNORE));
  } catch {
    return { ok: false, reason: 'unreadable-recipe' };
  }
  const baseImage = readPinnedBaseImage(dockerfile);
  if (!baseImage || !baseImage.includes('@sha256:')) {
    return { ok: false, reason: 'unpinned-base-image' };
  }
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
  hash.update(`base ${baseImage}\n`);
  hash.update(`turbo-filter ${input.roleFilter}\n`);
  const ordered = [...files].sort((left, right) => left.path.localeCompare(right.path));
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
      else if (info.isFile()) files.push({ path: rel, bytes: readFileSync(absolute) });
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
  const mismatched = input.artifacts.find((artifact) => artifact.declaredFingerprint && artifact.declaredFingerprint !== artifact.fingerprint);
  if (mismatched) {
    return { ...base, reason: 'mismatched-metadata', digest: mismatched.digest ?? null };
  }
  const compatible = input.artifacts.filter((artifact) => (
    artifact.fingerprint === input.fingerprint
    && artifact.role === input.role
    && artifact.filter === input.filter
    && typeof artifact.digest === 'string'
    && artifact.digest.startsWith('sha256:')
  ));
  if (compatible.length === 0) return { ...base, reason: 'no-compatible-artifact' };
  const digest = compatible[0].digest;
  if (compatible.some((artifact) => artifact.digest !== digest)) {
    return { ...base, reason: 'conflicting-digests', digest };
  }
  const present = {
    'control-plane': input.nodes?.controlPlane ?? [],
    worker: input.nodes?.worker ?? [],
  };
  const loadNodes = REQUIRED_NODES.filter((node) => !present[node].includes(digest));
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
export function planUnionImageUse(input) {
  const aliases = SLOT_ALIAS_ROLES.map((role) => `offscreen-dev-workspace:${input.slotId}-${role}`);
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
  if (!artifact?.digest?.startsWith('sha256:') || artifact.fingerprint !== input.fingerprint) {
    return base;
  }
  const loadNodes = REQUIRED_NODES.filter((node) => {
    const present = input.nodes?.[node] ?? {};
    const hasDigest = (present.digests ?? []).includes(artifact.digest);
    const hasAliases = aliases.every((tag) => (present.tags ?? []).includes(tag));
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

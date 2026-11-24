#!/usr/bin/env node
// Classifies repo paths for the dev Dockerfile root build context.
// Mirrors infra/images/development/Dockerfile.dockerignore (BuildKit's Dockerfile-specific ignore).

import { lstatSync, readdirSync, readFileSync, readlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_DOCKER_IGNORE_RELATIVE = 'infra/images/development/Dockerfile.dockerignore';

const EXCLUDED_TOP_LEVEL = new Set([
  '.git',
  'work',
  'docs',
  'evidence',
  '.cursor',
  '.github',
  'state',
]);

const ROOT_MANIFESTS = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
]);

const REQUIRED_NPMRC = 'infra/images/release/docker.npmrc';

/**
 * @param {string} filePath
 */
export function normalizeDevContextPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

/**
 * @param {string} filePath
 */
function isSecretDevContextPath(filePath) {
  const base = path.posix.basename(filePath);
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base === 'credentials.json') return true;
  if (base.endsWith('.pem') || base.endsWith('.key')) return true;
  return false;
}

/**
 * @param {string} filePath
 */
function hasExcludedWorkspaceArtifactSegment(filePath) {
  return /(^|\/)(node_modules|dist|\.next|\.turbo|coverage|\.cache)(\/|$)/.test(
    filePath,
  );
}

/**
 * @param {string} filePath
 * @param {{ isSymlink?: boolean, symlinkTarget?: string }} [options]
 * @returns {{ include: boolean, reason?: string }}
 */
export function classifyDevDockerContextPath(filePath, options = {}) {
  const file = normalizeDevContextPath(filePath);
  if (file.length === 0) {
    return { include: true };
  }

  const { isSymlink = false, symlinkTarget = '' } = options;
  const target = normalizeDevContextPath(symlinkTarget);

  if (isSymlink) {
    if (
      file.includes('node_modules') ||
      target.includes('node_modules') ||
      /(^|\/)(dist|\.next|\.turbo)(\/|$)/.test(target)
    ) {
      return { include: false, reason: 'symlink-artifact' };
    }
  }

  const top = file.split('/')[0] ?? '';
  if (EXCLUDED_TOP_LEVEL.has(top)) {
    return { include: false, reason: 'top-level-excluded' };
  }

  if (isSecretDevContextPath(file)) {
    return { include: false, reason: 'secret' };
  }

  if (hasExcludedWorkspaceArtifactSegment(file)) {
    return { include: false, reason: 'artifact' };
  }

  if (file.endsWith('.log')) {
    return { include: false, reason: 'log' };
  }

  return { include: true };
}

/**
 * @param {string} repoRoot
 */
export function devDockerIgnoreAbsolute(repoRoot) {
  return path.join(repoRoot, DEV_DOCKER_IGNORE_RELATIVE);
}

/**
 * @param {string} repoRoot
 */
export function readDevDockerIgnore(repoRoot) {
  return readFileSync(devDockerIgnoreAbsolute(repoRoot), 'utf8');
}

/**
 * Manifests and source the dev Dockerfile must still receive in context.
 * @param {string} filePath
 */
export function isRequiredDevDockerContextPath(filePath) {
  const file = normalizeDevContextPath(filePath);
  if (ROOT_MANIFESTS.has(file)) return true;
  if (file === REQUIRED_NPMRC) return true;
  if (/^(apps|packages|tools)\/.+/.test(file) && !hasExcludedWorkspaceArtifactSegment(file)) {
    return true;
  }
  return false;
}

/**
 * @param {string} dir
 * @param {string} relativePrefix
 * @param {{ bytes: number, files: number, excluded: string[] }} acc
 */
function walkIncludedBytes(dir, relativePrefix, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const rel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    const lstat = lstatSync(full, { throwIfNoEntry: false });
    if (!lstat) continue;

    const isSymlink = lstat.isSymbolicLink();
    let symlinkTarget = '';
    if (isSymlink) {
      try {
        symlinkTarget = readlinkSync(full);
      } catch {
        symlinkTarget = '';
      }
    }

    const decision = classifyDevDockerContextPath(rel, {
      isSymlink,
      symlinkTarget,
    });
    if (!decision.include) {
      if (acc.excluded.length < 12) {
        acc.excluded.push(rel);
      }
      continue;
    }
    if (lstat.isDirectory() && !isSymlink) {
      walkIncludedBytes(full, rel, acc);
      continue;
    }
    if (lstat.isFile() || (isSymlink && statSync(full).isFile())) {
      const size = isSymlink ? statSync(full).size : lstat.size;
      acc.bytes += size;
      acc.files += 1;
    }
  }
}

/**
 * @param {string} repoRoot
 * @returns {{ bytes: number, files: number, excluded: string[] }}
 */
export function estimateDevDockerContextBytes(repoRoot) {
  const acc = { bytes: 0, files: 0, excluded: [] };
  walkIncludedBytes(repoRoot, '', acc);
  return acc;
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : defaultRepoRoot();
  const estimate = estimateDevDockerContextBytes(root);
  process.stdout.write(`${JSON.stringify(estimate)}\n`);
}
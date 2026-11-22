#!/usr/bin/env node
// Maps a changed repo path to dev Tilt workloads using the release image selector.
// Do not maintain a second package graph.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUNTIME_IMAGES,
  isNonRuntimePath,
  selectImagesFromPaths,
  workspaceGraph,
} from '../app-release/select-affected-images.mjs';

export const IMAGE_TO_DEV_WORKLOADS = Object.freeze({
  web: ['game-web'],
  api: ['game-api'],
  'game-authority': ['game-authority'],
  worker: ['game-control', 'game-executor', 'game-relay'],
});

const ROOT_REBUILD_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'infra/kubernetes/lab/app-release/docker.npmrc',
  'infra/kubernetes/lab/app-release/images.pin',
  'infra/kubernetes/lab/app-release/prepare-runtime-tree.sh',
  'infra/kubernetes/lab/app-release/production-workspace-closure.mjs',
  'infra/kubernetes/lab/app-release/release-process-env-shim.mjs',
  'infra/kubernetes/lab/app-release/lib-build.sh',
  'infra/kubernetes/lab/dev/tilt/build-release-images.sh',
]);

const RELEASE_DOCKERFILE_PREFIX = 'infra/kubernetes/lab/app-release/Dockerfile.';
const RELEASE_BUILD_INPUTS = new Set([
  'infra/kubernetes/lab/app-release/build-web.sh',
  'infra/kubernetes/lab/app-release/build.sh',
  'infra/kubernetes/lab/app-release/build-worker.sh',
  'infra/kubernetes/lab/app-release/lab-nest-service-origin.mjs',
  'infra/kubernetes/lab/app-release/verify-production-rewrite.mjs',
]);

/**
 * @param {string} filePath
 */
export function normalizeChangedPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

/**
 * Unsafe edits must use the warm release path, not live sync.
 * Reuses full-rebuild inputs from the release selector where possible.
 * @param {string} filePath
 */
export function isUnsafeDevSyncPath(filePath) {
  const file = normalizeChangedPath(filePath);
  if (file.length === 0) return false;
  if (ROOT_REBUILD_FILES.has(file)) return true;
  if (RELEASE_BUILD_INPUTS.has(file)) return true;
  if (file.startsWith(RELEASE_DOCKERFILE_PREFIX)) return true;
  if (file === 'infra/kubernetes/lab/dev/Dockerfile') return true;
  if (/^(apps|packages|tools)\/[^/]+\/package\.json$/.test(file)) return true;
  if (
    file.startsWith('packages/db/migrations/') ||
    file === 'packages/db/drizzle.config.ts'
  ) {
    return true;
  }
  if (file.startsWith('packages/contracts/') && file.includes('/generated/')) {
    return true;
  }
  return false;
}

/**
 * @param {string[]} images
 * @returns {string[]}
 */
export function imagesToDevWorkloads(images) {
  const workloads = new Set();
  for (const image of images) {
    for (const workload of IMAGE_TO_DEV_WORKLOADS[image] ?? []) {
      workloads.add(workload);
    }
  }
  return [...workloads].sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} changedPath
 * @param {string} root
 * @returns {{ mode: 'none' | 'sync' | 'warm', images: string[], workloads: string[] }}
 */
export function resolveDevSync(changedPath, root) {
  const file = normalizeChangedPath(changedPath);
  const graph = workspaceGraph(root);
  if (isUnsafeDevSyncPath(file)) {
    const images = selectImagesFromPaths([file], graph);
    return {
      mode: 'warm',
      images,
      workloads: imagesToDevWorkloads(images),
    };
  }
  if (file.length === 0 || isNonRuntimePath(file)) {
    return { mode: 'none', images: [], workloads: [] };
  }
  const images = selectImagesFromPaths([file], graph);
  if (images.length === 0) {
    return { mode: 'none', images: [], workloads: [] };
  }
  return {
    mode: 'sync',
    images,
    workloads: imagesToDevWorkloads(images),
  };
}

/**
 * @param {string} image
 * @param {string} root
 * @returns {string[]}
 */
export function syncSubpathsForImage(image, root) {
  const graph = workspaceGraph(root);
  const dirs = graph[image] ?? [];
  return dirs.map((dir) => `/${dir}`).sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function workspacePackageManifestPaths(root) {
  const paths = [];
  for (const top of ['apps', 'packages', 'tools']) {
    const parent = path.join(root, top);
    let entries = [];
    try {
      entries = readdirSync(parent);
    } catch (error) {
      if (error && error.code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries) {
      const dir = path.join(parent, entry);
      if (!statSync(dir).isDirectory()) continue;
      paths.push(`${top}/${entry}/package.json`);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

/**
 * Repo-relative paths watched for warm release fallback (not live sync).
 * @param {string} root
 * @returns {string[]}
 */
export function unsafeWarmWatchPaths(root) {
  const paths = new Set([
    'pnpm-lock.yaml',
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    'infra/kubernetes/lab/dev/Dockerfile',
    'infra/kubernetes/lab/dev/tilt/build-release-images.sh',
    'packages/db/drizzle.config.ts',
    'infra/kubernetes/lab/app-release/docker.npmrc',
    'infra/kubernetes/lab/app-release/images.pin',
    'infra/kubernetes/lab/app-release/prepare-runtime-tree.sh',
    'infra/kubernetes/lab/app-release/lib-build.sh',
    'infra/kubernetes/lab/app-release/build-web.sh',
    'infra/kubernetes/lab/app-release/build.sh',
    'infra/kubernetes/lab/app-release/build-worker.sh',
  ]);
  for (const name of RUNTIME_IMAGES) {
    paths.add(`infra/kubernetes/lab/app-release/Dockerfile.${name}`);
  }
  for (const manifest of workspacePackageManifestPaths(root)) {
    paths.add(manifest);
  }
  paths.add('packages/db/migrations');
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function unsafeFallBackPaths(root) {
  const paths = new Set(unsafeWarmWatchPaths(root));
  paths.add('packages/db/migrations/');
  return [...paths].sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} root
 * @returns {Record<string, string[]>}
 */
export function syncDirsByImage(root) {
  /** @type {Record<string, string[]>} */
  const byImage = {};
  for (const image of RUNTIME_IMAGES) {
    byImage[image] = syncSubpathsForImage(image, root);
  }
  return byImage;
}

/**
 * @param {string} root
 */
export function tiltDevSyncConfig(root) {
  return {
    unsafe_fall_back: unsafeFallBackPaths(root),
    unsafe_watch_paths: unsafeWarmWatchPaths(root),
    sync_dirs_by_image: syncDirsByImage(root),
    warm_release_cmd:
      'OFFSCREEN_AFFECTED_BASE=HEAD bash infra/kubernetes/lab/dev/tilt/build-release-images.sh',
  };
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--tilt') {
    const root = defaultRepoRoot();
    process.stdout.write(`${JSON.stringify(tiltDevSyncConfig(root))}\n`);
    process.exit(0);
  }
  console.error('usage: dev-sync-paths.mjs --tilt');
  process.exit(2);
}
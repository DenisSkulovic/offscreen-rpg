#!/usr/bin/env node
// Dev Tilt sync vs image rebuild classification using the shared workspace graph.
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IMAGE_APP,
  RUNTIME_IMAGES,
  isNonRuntimePath,
  selectWorkspaceImages,
  workspaceGraph,
} from '../common/workspace-graph.mjs';

export const IMAGE_TO_DEV_WORKLOADS = Object.freeze({
  web: ['game-web'],
  api: ['game-api'],
  'game-authority': ['game-authority'],
  worker: ['game-control', 'game-executor', 'game-relay'],
});

const APP_DIRS = new Set(Object.values(IMAGE_APP));

export const BUILD_CRITICAL_ROOT_FILES = Object.freeze([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'infra/images/common/docker.npmrc',
  'infra/images/common/toolchain.pin',
  'infra/images/development/Dockerfile',
  'infra/images/development/Dockerfile.dockerignore',
  'tools/dev-environments/runtime/check-packaging.mjs',
  'tools/dev-environments/runtime/compile-watch.mjs',
  'tools/dev-environments/runtime/generation.mjs',
  'tools/dev-environments/runtime/launch-loaded.mjs',
  'tools/dev-environments/runtime/status.mjs',
]);

const BUILD_CRITICAL_ROOT_FILE_SET = new Set(BUILD_CRITICAL_ROOT_FILES);

const RELEASE_ONLY_PREFIXES = [
  'infra/images/release/',
  'infra/environments/release/',
];

/**
 * @param {string} filePath
 */
export function normalizeChangedPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

/**
 * @param {string} file
 */
function isReleaseOnlyPath(file) {
  return RELEASE_ONLY_PREFIXES.some(
    (prefix) => file === prefix || file.startsWith(prefix),
  );
}

/**
 * @param {string} file
 */
function workspaceDirForPath(file) {
  const match = /^(apps|packages|tools)\/[^/]+/.exec(file);
  return match ? match[0] : null;
}

/**
 * @param {string} file
 */
function isWorkspaceDependencySourcePath(file) {
  const dir = workspaceDirForPath(file);
  if (!dir) return false;
  if (APP_DIRS.has(dir)) return false;
  return true;
}

/**
 * @param {string} file
 */
function isAppManifestOrTsconfig(file) {
  if (/^(apps|packages|tools)\/[^/]+\/package\.json$/.test(file)) return true;
  if (/^(apps|packages|tools)\/[^/]+\/tsconfig[^/]*\.json$/.test(file))
    return true;
  return false;
}

/**
 * @param {string} filePath
 */
export function isUnsafeDevSyncPath(filePath) {
  const file = normalizeChangedPath(filePath);
  if (file.length === 0) return false;
  if (isNonRuntimePath(file)) return false;
  if (isReleaseOnlyPath(file)) return false;
  if (BUILD_CRITICAL_ROOT_FILE_SET.has(file)) return true;
  if (
    file === 'packages/db/migrations' ||
    file.startsWith('packages/db/migrations/') ||
    file === 'tools/db-migrations/drizzle.config.ts'
  ) {
    return true;
  }
  if (isAppManifestOrTsconfig(file)) return true;
  if (isWorkspaceDependencySourcePath(file)) return true;
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
 * @returns {{ mode: 'none' | 'sync' | 'rebuild', images: string[], workloads: string[] }}
 */
export function resolveDevSync(changedPath, root) {
  const file = normalizeChangedPath(changedPath);
  const buildGraph = workspaceGraph(root, 'build');

  if (file.length === 0 || isNonRuntimePath(file) || isReleaseOnlyPath(file)) {
    return { mode: 'none', images: [], workloads: [] };
  }

  if (isUnsafeDevSyncPath(file)) {
    const images = BUILD_CRITICAL_ROOT_FILE_SET.has(file)
      ? [...RUNTIME_IMAGES]
      : selectWorkspaceImages([file], buildGraph);
    return {
      mode: 'rebuild',
      images,
      workloads: imagesToDevWorkloads(images),
    };
  }

  const images = selectWorkspaceImages([file], buildGraph);
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
  void root;
  const appDir = IMAGE_APP[image];
  if (!appDir) return [];
  return [`/${appDir}`];
}

/**
 * @param {string} appDir
 * @param {string} root
 * @returns {string[]}
 */
function appTsconfigPaths(appDir, root) {
  const absolute = path.join(root, appDir);
  let entries = [];
  try {
    entries = readdirSync(absolute);
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((name) => /^tsconfig.*\.json$/.test(name))
    .map((name) => `${appDir}/${name}`)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} image
 * @param {string} root
 * @returns {string[]}
 */
export function rebuildPathsForImage(image, root) {
  const graph = workspaceGraph(root, 'build');
  const closure = graph[image] ?? [];
  const appDir = IMAGE_APP[image];
  /** @type {Set<string>} */
  const paths = new Set(BUILD_CRITICAL_ROOT_FILES);

  for (const dir of closure) {
    if (dir === appDir) {
      const manifest = path.join(root, dir, 'package.json');
      if (existsSync(manifest)) paths.add(`${dir}/package.json`);
      for (const tsconfig of appTsconfigPaths(dir, root)) {
        paths.add(tsconfig);
      }
    } else {
      paths.add(dir);
    }
  }

  const migrationDir = path.join(root, 'packages/db/migrations');
  if (existsSync(migrationDir) && statSync(migrationDir).isDirectory()) {
    paths.add('packages/db/migrations');
  }
  const drizzleConfig = path.join(
    root,
    'tools/db-migrations/drizzle.config.ts',
  );
  if (existsSync(drizzleConfig)) {
    paths.add('tools/db-migrations/drizzle.config.ts');
  }

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
 * @returns {Record<string, string[]>}
 */
export function rebuildPathsByImage(root) {
  /** @type {Record<string, string[]>} */
  const byImage = {};
  for (const image of RUNTIME_IMAGES) {
    byImage[image] = rebuildPathsForImage(image, root);
  }
  return byImage;
}

/**
 * @param {string} root
 */
export function tiltDevSyncConfig(root) {
  return {
    sync_dirs_by_image: syncDirsByImage(root),
    rebuild_paths_by_image: rebuildPathsByImage(root),
  };
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--tilt') {
    const root = defaultRepoRoot();
    process.stdout.write(`${JSON.stringify(tiltDevSyncConfig(root))}\n`);
    process.exit(0);
  }
  console.error('usage: sync-plan.mjs --tilt');
  process.exit(2);
}

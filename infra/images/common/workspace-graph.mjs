// Workspace manifest scan, closure traversal, and path-based image selection.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const RUNTIME_IMAGES = Object.freeze([
  'web',
  'api',
  'game-authority',
  'worker',
]);

export const IMAGE_APP = Object.freeze({
  web: 'apps/web',
  api: 'apps/api',
  'game-authority': 'apps/game-authority',
  worker: 'apps/worker',
});

const WORKSPACE_ROOTS = ['apps', 'packages', 'tools'];

const RUNTIME_FIELDS = ['dependencies', 'optionalDependencies'];
const BUILD_EXTRA_FIELDS = ['devDependencies', 'peerDependencies'];

/**
 * @param {string} appPath
 */
export function normalizeRelative(appPath) {
  const normalized = appPath
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+$/, '');
  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`invalid workspace path ${appPath}`);
  }
  return normalized;
}

/**
 * @param {string} file
 */
export function isNonRuntimePath(file) {
  const normalized = file.replaceAll('\\', '/');
  if (
    normalized.startsWith('docs/') ||
    normalized.startsWith('work/') ||
    normalized.startsWith('evidence/') ||
    normalized.startsWith('research/')
  ) {
    return true;
  }
  if (normalized.endsWith('.md')) return true;
  return /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(normalized);
}

function dependencyFields(mode) {
  if (mode === 'runtime') return RUNTIME_FIELDS;
  if (mode === 'build') return [...RUNTIME_FIELDS, ...BUILD_EXTRA_FIELDS];
  throw new Error(`invalid workspace closure mode ${mode}`);
}

/**
 * @param {object} manifest
 * @param {'runtime' | 'build'} mode
 */
function workspaceDependencyNames(manifest, mode) {
  const names = [];
  for (const field of dependencyFields(mode)) {
    const block = manifest[field];
    if (!block || typeof block !== 'object') continue;
    for (const [name, spec] of Object.entries(block)) {
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        names.push(name);
      }
    }
  }
  return names;
}

function loadWorkspaceIndex(root) {
  const byName = new Map();
  const byDir = new Map();
  for (const top of WORKSPACE_ROOTS) {
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
      const manifestPath = path.join(dir, 'package.json');
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        if (error && error.code === 'ENOENT') continue;
        throw error;
      }
      if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
        continue;
      }
      const relative = `${top}/${entry}`;
      const record = { name: manifest.name, relative, manifest };
      if (byName.has(manifest.name)) {
        throw new Error(
          `duplicate workspace name ${manifest.name}: ${byName.get(manifest.name).relative} and ${relative}`,
        );
      }
      byName.set(manifest.name, record);
      byDir.set(relative, record);
    }
  }
  return { byName, byDir };
}

/**
 * @param {string} root
 * @param {string} appPath
 * @param {{ mode: 'runtime' | 'build' }} options
 */
export function workspaceClosure(root, appPath, { mode }) {
  if (mode !== 'runtime' && mode !== 'build') {
    throw new Error(`workspace closure mode is required (runtime or build)`);
  }
  const normalizedApp = normalizeRelative(appPath);
  const { byName, byDir } = loadWorkspaceIndex(root);

  const start = byDir.get(normalizedApp);
  if (!start) {
    throw new Error(`unknown workspace path ${normalizedApp}`);
  }

  const included = new Map();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop();
    if (included.has(current.relative)) continue;
    included.set(current.relative, current);
    for (const dependencyName of workspaceDependencyNames(
      current.manifest,
      mode,
    )) {
      const dependency = byName.get(dependencyName);
      if (!dependency) {
        throw new Error(
          `unknown workspace dependency ${dependencyName} required by ${current.name}`,
        );
      }
      pending.push(dependency);
    }
  }

  return [...included.keys()].sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} root
 * @param {'runtime' | 'build'} mode
 */
export function workspaceGraph(root, mode) {
  /** @type {Record<string, string[]>} */
  const graph = {};
  for (const image of RUNTIME_IMAGES) {
    graph[image] = workspaceClosure(root, IMAGE_APP[image], { mode });
  }
  return graph;
}

/**
 * Workspace directory prefix selection only (no Dockerfile or root-input rules).
 * @param {string[]} paths
 * @param {Record<string, string[]>} graph
 */
export function selectWorkspaceImages(paths, graph) {
  const selected = new Set();
  for (const raw of paths) {
    const file = raw.replaceAll('\\', '/').replace(/^\.\//, '');
    if (file.length === 0 || isNonRuntimePath(file)) continue;
    for (const image of RUNTIME_IMAGES) {
      const dirs = graph[image] ?? [];
      for (const dir of dirs) {
        if (file === dir || file.startsWith(`${dir}/`)) selected.add(image);
      }
    }
  }
  return RUNTIME_IMAGES.filter((image) => selected.has(image));
}
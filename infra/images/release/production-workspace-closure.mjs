#!/usr/bin/env node
// Reachable production workspaces from one app manifest.
// Runtime dependencies and optionalDependencies only; devDependencies are ignored.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOTS = ['apps', 'packages', 'tools'];

export function productionWorkspaceClosure(root, appPath) {
  const normalizedApp = normalizeRelative(appPath);
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
    for (const dependencyName of runtimeDependencyNames(current.manifest)) {
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

function runtimeDependencyNames(manifest) {
  const names = [];
  for (const field of ['dependencies', 'optionalDependencies']) {
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

function normalizeRelative(appPath) {
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

function isCli() {
  const invoked = process.argv[1];
  if (!invoked) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
}

if (isCli()) {
  const appPath = process.argv[2];
  if (!appPath || process.argv.length !== 3) {
    console.error('usage: production-workspace-closure.mjs <app-path>');
    process.exit(2);
  }
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  );
  try {
    const closure = productionWorkspaceClosure(root, appPath);
    process.stdout.write(`${closure.join('\n')}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

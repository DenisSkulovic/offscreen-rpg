#!/usr/bin/env node
// Maps changed paths to lab runtime images using the production workspace closure.
// Docs, Markdown, and test files do not select an image.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionWorkspaceClosure } from './production-workspace-closure.mjs';

export const RUNTIME_IMAGES = ['web', 'api', 'game-authority', 'worker'];

const IMAGE_APP = {
  web: 'apps/web',
  api: 'apps/api',
  'game-authority': 'apps/game-authority',
  worker: 'apps/worker',
};

const FILE_IMAGES = {
  'infra/kubernetes/lab/app-release/Dockerfile.web': ['web'],
  'infra/kubernetes/lab/app-release/Dockerfile.api': ['api'],
  'infra/kubernetes/lab/app-release/Dockerfile.game-authority': [
    'game-authority',
  ],
  'infra/kubernetes/lab/app-release/Dockerfile.worker': ['worker'],
  'infra/kubernetes/lab/app-release/build-web.sh': ['web'],
  'infra/kubernetes/lab/app-release/build.sh': ['api', 'game-authority'],
  'infra/kubernetes/lab/app-release/build-worker.sh': ['worker'],
  'infra/kubernetes/lab/app-release/lab-nest-service-origin.mjs': ['web'],
  'infra/kubernetes/lab/app-release/verify-production-rewrite.mjs': ['web'],
};

const ALL_IMAGE_FILES = new Set([
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

export function selectImagesFromPaths(paths, workspacesByImage) {
  const selected = new Set();
  for (const raw of paths) {
    const file = raw.replaceAll('\\', '/').replace(/^\.\//, '');
    if (file.length === 0 || isNonRuntimePath(file)) continue;
    if (ALL_IMAGE_FILES.has(file)) {
      for (const image of RUNTIME_IMAGES) selected.add(image);
      continue;
    }
    const direct = FILE_IMAGES[file];
    if (direct) {
      for (const image of direct) selected.add(image);
      continue;
    }
    for (const image of RUNTIME_IMAGES) {
      const dirs = workspacesByImage[image] ?? [];
      for (const dir of dirs) {
        if (file === dir || file.startsWith(`${dir}/`)) selected.add(image);
      }
    }
  }
  return RUNTIME_IMAGES.filter((image) => selected.has(image));
}

export function workspaceGraph(root) {
  const graph = {};
  for (const image of RUNTIME_IMAGES) {
    graph[image] = productionWorkspaceClosure(root, IMAGE_APP[image]);
  }
  return graph;
}

function repoRoot() {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..',
  );
}

function gitPaths(root, base) {
  const result = spawnSync(
    'git',
    ['diff', '--name-only', '--relative', base],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || `git diff ${base} failed`);
  }
  const unstaged = spawnSync('git', ['diff', '--name-only', '--relative'], {
    cwd: root,
    encoding: 'utf8',
  });
  const staged = spawnSync(
    'git',
    ['diff', '--name-only', '--relative', '--cached'],
    { cwd: root, encoding: 'utf8' },
  );
  const names = `${result.stdout}\n${unstaged.stdout ?? ''}\n${staged.stdout ?? ''}`;
  return [...new Set(names.split('\n').filter((line) => line.length > 0))];
}

function printUsage() {
  console.error(
    'usage: select-affected-images.mjs --all | --images web,api,game-authority,worker | --base <git-ref>',
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let images;
  if (args.length === 1 && args[0] === '--all') {
    images = [...RUNTIME_IMAGES];
  } else if (args.length === 2 && args[0] === '--images') {
    images = args[1].split(',').filter((name) => name.length > 0);
    const unknown = images.filter((name) => !RUNTIME_IMAGES.includes(name));
    if (images.length === 0 || unknown.length > 0) {
      console.error(`unknown image: ${unknown.join(',') || '(empty)'}`);
      process.exit(2);
    }
  } else if (args.length === 2 && args[0] === '--base') {
    const root = repoRoot();
    images = selectImagesFromPaths(gitPaths(root, args[1]), workspaceGraph(root));
  } else {
    printUsage();
    process.exit(2);
  }
  if (images.length === 0) {
    console.log('none');
  } else {
    console.log(images.join(','));
  }
}

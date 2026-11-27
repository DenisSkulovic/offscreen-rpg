#!/usr/bin/env node
// Maps changed paths to lab runtime images using the workspace build closure.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IMAGE_APP,
  RUNTIME_IMAGES,
  isNonRuntimePath,
  selectWorkspaceImages,
  workspaceGraph as buildWorkspaceGraph,
} from '../common/workspace-graph.mjs';

export { RUNTIME_IMAGES, isNonRuntimePath } from '../common/workspace-graph.mjs';

const FILE_IMAGES = {
  'infra/images/release/Dockerfile.web': ['web'],
  'infra/images/release/Dockerfile.services': [
    'api',
    'game-authority',
    'worker',
  ],
  'infra/images/release/build-web.sh': ['web'],
  'infra/images/release/build.sh': ['api', 'game-authority'],
  'infra/images/release/build-worker.sh': ['worker'],
  'infra/images/release/release-service-origin.mjs': ['web'],
  'infra/images/release/verify-production-rewrite.mjs': ['web'],
};

const ALL_IMAGE_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'infra/images/common/docker.npmrc',
  'infra/images/common/toolchain.pin',
  'infra/images/common/workspace-graph.mjs',
  'infra/images/release/images.pin',
  'infra/images/release/prepare-runtime-tree.sh',
  'infra/images/release/production-workspace-closure.mjs',
  'infra/images/release/release-process-env-shim.mjs',
  'infra/images/release/lib-build.sh',
  'infra/images/release/build-release-images.sh',
  'infra/images/development/tilt/build-release-images.sh',
]);

const WORKSPACE_MANIFEST_RE =
  /^(?:(?:apps|packages|tools)\/[^/]+\/package\.json|packages\/(?:domain|ai|commerce|platform|foundation)\/[^/]+\/package\.json)$/;

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
  }
  for (const image of selectWorkspaceImages(paths, workspacesByImage)) {
    selected.add(image);
  }
  return RUNTIME_IMAGES.filter((image) => selected.has(image));
}

export function workspaceGraph(root) {
  return buildWorkspaceGraph(root, 'build');
}

export function requiresFullImageRebuild(paths) {
  for (const raw of paths) {
    const file = raw.replaceAll('\\', '/').replace(/^\.\//, '');
    if (file.length === 0) continue;
    if (
      file === 'package.json' ||
      file === 'pnpm-workspace.yaml' ||
      WORKSPACE_MANIFEST_RE.test(file)
    ) {
      return true;
    }
  }
  return false;
}

function repoRoot() {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  );
}

function gitPaths(root, base) {
  const relative = spawnSync(
    'git',
    ['diff', '--name-only', '--relative', base],
    { cwd: root, encoding: 'utf8' },
  );
  if (relative.status !== 0) {
    throw new Error(relative.stderr || `git diff ${base} failed`);
  }
  const unstaged = spawnSync('git', ['diff', '--name-only', '--relative'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (unstaged.status !== 0) {
    throw new Error(unstaged.stderr || 'git diff failed');
  }
  const staged = spawnSync(
    'git',
    ['diff', '--name-only', '--relative', '--cached'],
    { cwd: root, encoding: 'utf8' },
  );
  if (staged.status !== 0) {
    throw new Error(staged.stderr || 'git diff --cached failed');
  }
  const untracked = spawnSync(
    'git',
    ['ls-files', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8' },
  );
  if (untracked.status !== 0) {
    throw new Error(untracked.stderr || 'git ls-files failed');
  }
  const names = `${relative.stdout}\n${unstaged.stdout ?? ''}\n${staged.stdout ?? ''}\n${untracked.stdout ?? ''}`;
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
    try {
      const paths = gitPaths(root, args[1]);
      if (requiresFullImageRebuild(paths)) {
        images = [...RUNTIME_IMAGES];
      } else {
        images = selectImagesFromPaths(paths, workspaceGraph(root));
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
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

export { IMAGE_APP };
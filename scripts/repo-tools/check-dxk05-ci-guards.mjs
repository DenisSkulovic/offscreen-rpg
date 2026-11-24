#!/usr/bin/env node
/**
 * Static CI/lab guards for DXK05 (no cluster, no compose).
 *
 * Usage:
 *   node scripts/repo-tools/check-dxk05-ci-guards.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const STALE_COMPOSE = /docker(?:\s+|-)compose\b/;
const NODE_DIGEST_LINE =
  /^NODE_DIGEST=sha256:[a-f0-9]{64}$/m;
const NODE_FROM =
  /^FROM\s+docker\.io\/library\/node\b/im;

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/**
 * @param {string} label
 * @param {string} text
 */
export function assertNoStaleComposeCommand(label, text) {
  if (STALE_COMPOSE.test(text)) {
    throw new Error(
      `${label}: stale docker compose reference (use kind/Tilt lab paths instead)`,
    );
  }
}

/**
 * @param {string} pinText
 * @param {string[]} [dockerfileTexts]
 */
export function assertImagePin(pinText, dockerfileTexts = []) {
  if (!NODE_DIGEST_LINE.test(pinText)) {
    throw new Error(
      'images.pin must contain NODE_DIGEST=sha256:<64 lowercase hex>',
    );
  }
  const digestMatch = pinText.match(/^NODE_DIGEST=(sha256:[a-f0-9]{64})$/m);
  const expectedDigest = digestMatch?.[1];
  if (!expectedDigest) {
    throw new Error(
      'images.pin must contain NODE_DIGEST=sha256:<64 lowercase hex>',
    );
  }

  for (const [index, dockerText] of dockerfileTexts.entries()) {
    const lines = dockerText.split(/\r?\n/);
    for (const line of lines) {
      if (!NODE_FROM.test(line)) continue;
      const digestInFrom = line.match(/@sha256:[a-f0-9]{64}/i);
      if (!digestInFrom) {
        throw new Error(
          `Dockerfile #${index + 1}: docker.io/library/node FROM line missing @sha256 digest`,
        );
      }
      const digest = digestInFrom[0].slice(1).toLowerCase();
      if (digest !== expectedDigest) {
        throw new Error(
          `Dockerfile #${index + 1}: node digest ${digest} does not match images.pin ${expectedDigest}`,
        );
      }
    }
  }
}

/**
 * @param {string} contextName
 */
export function assertLabContext(contextName) {
  if (contextName !== 'kind-offscreen-lab') {
    throw new Error(
      `lab context must be kind-offscreen-lab, got: ${contextName}`,
    );
  }
}

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function collectShellFiles(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test') continue;
      collectShellFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.sh')) {
      acc.push(full);
    }
  }
}

/**
 * @param {string} [root]
 */
export function checkDxk05CiGuards(root = repoRoot) {
  const resolved = path.resolve(root);
  let composeScanCount = 0;

  const workflowPath = path.join(resolved, '.github/workflows/code.yml');
  const workflowText = readFileSync(workflowPath, 'utf8');
  assertNoStaleComposeCommand(workflowPath, workflowText);
  composeScanCount += 1;

  const labDir = path.join(resolved, 'infra/kubernetes/lab');
  const shellFiles = [];
  collectShellFiles(labDir, shellFiles);
  shellFiles.sort();
  for (const file of shellFiles) {
    const text = readFileSync(file, 'utf8');
    assertNoStaleComposeCommand(file, text);
    composeScanCount += 1;
  }

  const releaseDir = path.join(labDir, 'app-release');
  const pinPath = path.join(releaseDir, 'images.pin');
  const pinText = readFileSync(pinPath, 'utf8');
  const dockerNames = [
    'Dockerfile.api',
    'Dockerfile.web',
    'Dockerfile.worker',
    'Dockerfile.game-authority',
  ];
  const dockerfileTexts = dockerNames.map((name) =>
    readFileSync(path.join(releaseDir, name), 'utf8'),
  );
  assertImagePin(pinText, dockerfileTexts);

  const libPath = path.join(resolved, 'infra/clusters/kind/release/lib.sh');
  const libText = readFileSync(libPath, 'utf8');
  const contextMatch = libText.match(/^CONTEXT_NAME="([^"]+)"/m);
  if (!contextMatch) {
    throw new Error(`${libPath}: missing CONTEXT_NAME assignment`);
  }
  assertLabContext(contextMatch[1]);

  return {
    composeScanCount,
    shellCount: shellFiles.length,
    dockerfileCount: dockerNames.length,
  };
}

function main() {
  const result = checkDxk05CiGuards();
  console.log(
    `DXK05 CI guards OK: ${result.composeScanCount} compose scan target(s), ${result.shellCount} lab shell script(s), ${result.dockerfileCount} app-release Dockerfile(s) pinned`,
  );
}

const thisFile = fileURLToPath(import.meta.url);
const invoked =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href ===
    pathToFileURL(thisFile).href;

if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
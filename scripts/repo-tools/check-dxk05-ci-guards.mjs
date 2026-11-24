#!/usr/bin/env node
/**
 * Static CI/lab guards for DXK05 (no cluster, no compose).
 *
 * Usage:
 *   node scripts/repo-tools/check-dxk05-ci-guards.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const STALE_COMPOSE = /docker(?:\s+|-)compose\b/;
const NODE_DIGEST_LINE =
  /^NODE_DIGEST=sha256:[a-f0-9]{64}$/m;
const LITERAL_NODE_FROM =
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
 */
export function assertToolchainPin(pinText) {
  if (!NODE_DIGEST_LINE.test(pinText)) {
    throw new Error(
      'toolchain.pin must contain NODE_DIGEST=sha256:<64 lowercase hex>',
    );
  }
  const digestMatch = pinText.match(/^NODE_DIGEST=(sha256:[a-f0-9]{64})$/m);
  if (!digestMatch) {
    throw new Error(
      'toolchain.pin must contain NODE_DIGEST=sha256:<64 lowercase hex>',
    );
  }
  if (!/^NODE_IMAGE=/m.test(pinText)) {
    throw new Error('toolchain.pin must contain NODE_IMAGE=');
  }
  if (!/^PNPM_VERSION=/m.test(pinText)) {
    throw new Error('toolchain.pin must contain PNPM_VERSION=');
  }
}

/**
 * @param {string} dockerText
 * @param {string} label
 */
export function assertRecipeUsesToolchainArgs(dockerText, label) {
  if (LITERAL_NODE_FROM.test(dockerText)) {
    throw new Error(
      `${label}: literal node FROM line must not appear (use ARG NODE_IMAGE)`,
    );
  }
  if (!/^ARG NODE_IMAGE$/m.test(dockerText)) {
    throw new Error(`${label}: missing ARG NODE_IMAGE`);
  }
  if (!/^ARG PNPM_VERSION$/m.test(dockerText)) {
    throw new Error(`${label}: missing ARG PNPM_VERSION`);
  }
  if (!/^FROM \$\{NODE_IMAGE\}/m.test(dockerText)) {
    throw new Error(`${label}: missing FROM \${NODE_IMAGE}`);
  }
  if (!/corepack prepare pnpm@\$\{PNPM_VERSION\}/.test(dockerText)) {
    throw new Error(`${label}: missing pnpm@\${PNPM_VERSION} corepack prepare`);
  }
}

/**
 * @param {string} pinText toolchain.pin bytes
 * @param {string[]} [dockerfileTexts]
 */
export function assertImagePin(pinText, dockerfileTexts = []) {
  assertToolchainPin(pinText);
  for (const [index, dockerText] of dockerfileTexts.entries()) {
    assertRecipeUsesToolchainArgs(dockerText, `Dockerfile #${index + 1}`);
  }
}

/**
 * @param {string} artifactPinText release/images.pin bytes
 */
export function assertArtifactPin(artifactPinText) {
  if (NODE_DIGEST_LINE.test(artifactPinText)) {
    throw new Error(
      'release/images.pin must not contain NODE_DIGEST (use common/toolchain.pin)',
    );
  }
  if (!/^WEB_IMAGE=/m.test(artifactPinText)) {
    throw new Error('release/images.pin must contain WEB_IMAGE=');
  }
}

/**
 * @param {string} servicesText
 */
export function assertServicesTargets(servicesText) {
  for (const target of ['api', 'game-authority', 'worker']) {
    if (!new RegExp(`FROM runtime-base AS ${target}`).test(servicesText)) {
      throw new Error(`Dockerfile.services missing target ${target}`);
    }
  }
}

/**
 * @param {string} contextName
 */
export function assertLabContext(contextName) {
  if (contextName !== 'kind-offscreen-release') {
    throw new Error(
      `lab context must be kind-offscreen-release, got: ${contextName}`,
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

  const shellRoots = [
    path.join(resolved, 'infra/platform'),
    path.join(resolved, 'infra/verification'),
    path.join(resolved, 'infra/clusters/kind/release'),
    path.join(resolved, 'infra/environments/release'),
  ];
  const shellFiles = [];
  for (const dir of shellRoots) {
    collectShellFiles(dir, shellFiles);
  }
  shellFiles.sort();
  for (const file of shellFiles) {
    const text = readFileSync(file, 'utf8');
    assertNoStaleComposeCommand(file, text);
    composeScanCount += 1;
  }

  const commonDir = path.join(resolved, 'infra/images/common');
  const releaseDir = path.join(resolved, 'infra/images/release');
  const toolchainPath = path.join(commonDir, 'toolchain.pin');
  const npmrcPath = path.join(commonDir, 'docker.npmrc');
  const buildReleasePath = path.join(releaseDir, 'build-release-images.sh');
  for (const required of [toolchainPath, npmrcPath, buildReleasePath]) {
    if (!existsSync(required)) {
      throw new Error(`missing required lab image input: ${required}`);
    }
  }

  const toolchainText = readFileSync(toolchainPath, 'utf8');
  const artifactPinText = readFileSync(path.join(releaseDir, 'images.pin'), 'utf8');
  assertArtifactPin(artifactPinText);

  const recipePaths = [
    path.join(releaseDir, 'Dockerfile.services'),
    path.join(releaseDir, 'Dockerfile.web'),
    path.join(resolved, 'infra/images/development/Dockerfile'),
  ];
  const dockerfileTexts = recipePaths.map((filePath) =>
    readFileSync(filePath, 'utf8'),
  );
  assertImagePin(toolchainText, dockerfileTexts);
  assertServicesTargets(dockerfileTexts[0]);

  const libBuildText = readFileSync(path.join(releaseDir, 'lib-build.sh'), 'utf8');
  if (!/--build-arg "NODE_IMAGE=\$\{TOOLCHAIN_NODE_IMAGE\}"/.test(libBuildText)) {
    throw new Error('lib-build.sh must pass NODE_IMAGE from toolchain.pin before docker build');
  }

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
    dockerfileCount: recipePaths.length,
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
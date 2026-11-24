#!/usr/bin/env node
/**
 * Active-tree zero-Compose-orchestrator remnant scan (DXK06).
 *
 * Deliberate allowlist (detectors and negative fixtures only — not boot paths):
 * - scripts/repo-tools/check-dxk05-ci-guards.mjs
 * - scripts/repo-tools/check-dxk05-ci-guards.test.mjs
 * - scripts/repo-tools/check-dxk06-compose-remnants.mjs
 * - scripts/repo-tools/check-dxk06-compose-remnants.test.mjs
 * - apps/api/src/modules/stories/game-authority-client.ts (rejects compose mode)
 * - apps/api/test/game-authority-seam.test.mjs (expects throw)
 * - scripts/repo-tools/ci-change-scope.test.mjs (compose.yaml not integration)
 * - scripts/repo-tools/root-command-surface.test.mjs (banned infra script names)
 * - infra/verification/source/tilt/tiltfile.test.mjs (Tiltfile has no compose)
 *
 * Usage:
 *   node scripts/repo-tools/check-dxk06-compose-remnants.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DOCKER_COMPOSE_INVOCATION = /docker(?:\s+|-)compose\b/;
const DOCKER_COMPOSE_NEGATION =
  /(?:refuses?|reject(?:ed|s)?|stale|no longer|does not|do not|not boot|not start|without starting|never|must not|instead of|did not)/i;
const PNPM_INFRA_UP_DOWN = /\bpnpm\s+infra:(?:up|down)\b/;
const GAME_AUTHORITY_COMPOSE =
  /GAME_AUTHORITY_MODE\s*[=:]\s*['"]?compose['"]?/i;
const LEGACY_VOLUME_NAME =
  /offscreen-rpg_(?:postgres|temporal)-data/;
const BANNED_ROOT_SCRIPT = new Set(['infra', 'infra:up', 'infra:down']);

const EXCLUDE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  'archive',
  'open',
  'evidence',
  'research',
]);

/** @type {ReadonlySet<string>} */
const ALLOWLIST = new Set([
  'scripts/repo-tools/check-dxk05-ci-guards.mjs',
  'scripts/repo-tools/check-dxk05-ci-guards.test.mjs',
  'scripts/repo-tools/check-dxk06-compose-remnants.mjs',
  'scripts/repo-tools/check-dxk06-compose-remnants.test.mjs',
  'apps/api/src/modules/stories/game-authority-client.ts',
  'apps/api/test/game-authority-seam.test.mjs',
  'scripts/repo-tools/ci-change-scope.test.mjs',
  'scripts/repo-tools/root-command-surface.test.mjs',
  'infra/verification/source/tilt/tiltfile.test.mjs',
]);

const repoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function normalizeRel(relativePath) {
  return relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

function isAllowlisted(relativePath) {
  return ALLOWLIST.has(normalizeRel(relativePath));
}

const INFRA_PNPM_NEGATION =
  /(?:no longer|does not|do not|not require|without|removed|deleted|forbid|forbidden|banned|stays with|not a|not the|instead of|neither|nor\b)/i;

const GAME_AUTHORITY_COMPOSE_NEGATION =
  /(?:reject|rejected|retired|refuse|refuses|invalid|fail|fails|does not|is not|no longer|instead|unsupported|removed)/i;

const LEGACY_VOLUME_NEGATION =
  /(?:no longer require|does not require|do not require|without requiring|succeed when historical|when historical|when absent|absent;|valid\.|valid;|must remain after|were still present|doesNotMatch|still inspects a legacy|legacy Compose volume|not require legacy|refuses if some other)/i;

/**
 * @param {string} label
 * @param {string} text
 */
export function assertNoDockerComposeInvocation(label, text) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!DOCKER_COMPOSE_INVOCATION.test(line)) continue;
    if (DOCKER_COMPOSE_NEGATION.test(line)) continue;
    throw new Error(
      `${label}:${i + 1}: stale docker compose invocation (use kind/Tilt lab paths)`,
    );
  }
}

/**
 * @param {string} label
 * @param {string} line
 */
export function assertNoPnpmInfraUpDownInstruction(label, line) {
  if (!PNPM_INFRA_UP_DOWN.test(line)) return;
  if (INFRA_PNPM_NEGATION.test(line)) return;
  throw new Error(
    `${label}: instructs pnpm infra:up or pnpm infra:down (use stack:* / pnpm dev)`,
  );
}

/**
 * @param {string} label
 * @param {string} line
 */
export function assertNoGameAuthorityComposeInstruction(label, line) {
  if (!GAME_AUTHORITY_COMPOSE.test(line)) return;
  if (GAME_AUTHORITY_COMPOSE_NEGATION.test(line)) return;
  throw new Error(
    `${label}: instructs GAME_AUTHORITY_MODE=compose (mode is rejected; use embedded or distributed)`,
  );
}

/**
 * @param {string} label
 * @param {string} line
 */
export function assertNoLegacyVolumePrerequisite(label, line) {
  if (!LEGACY_VOLUME_NAME.test(line)) return;
  if (LEGACY_VOLUME_NEGATION.test(line)) return;
  if (
    /(?:were still present|was still present|still present|Compose volumes)/i.test(
      line,
    )
  ) {
    return;
  }
  if (
    /\.test\.mjs:/.test(label) &&
    /\/docker volume inspect offscreen-rpg_/.test(line)
  ) {
    return;
  }
  const requiresVolume =
    /docker\s+volume\s+inspect/i.test(line) ||
    /\b(?:must exist|is required|are required|prerequisite|before (?:start|up))\b/i.test(
      line,
    );
  if (!requiresVolume) return;
  throw new Error(
    `${label}: requires legacy Compose-named Docker volumes before start`,
  );
}

/**
 * @param {Record<string, string>} scripts
 */
export function assertNoBannedRootInfraScripts(scripts) {
  for (const name of BANNED_ROOT_SCRIPT) {
    if (Object.prototype.hasOwnProperty.call(scripts, name)) {
      throw new Error(
        `package.json: root script "${name}" is retired (use stack:*)`,
      );
    }
  }
}

/**
 * @param {string} relativePath
 * @param {string} text
 */
export function scanTextForComposeRemnants(relativePath, text) {
  const label = relativePath;
  if (relativePath === 'package.json') {
    try {
      const pkg = JSON.parse(text);
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        assertNoBannedRootInfraScripts(pkg.scripts);
      }
    } catch {
      throw new Error(`${label}: invalid package.json`);
    }
  }

  assertNoDockerComposeInvocation(label, text);

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineLabel = `${label}:${i + 1}`;
    assertNoPnpmInfraUpDownInstruction(lineLabel, lines[i]);
    assertNoGameAuthorityComposeInstruction(lineLabel, lines[i]);
    assertNoLegacyVolumePrerequisite(lineLabel, lines[i]);
  }
}

/**
 * @param {string} dir
 * @param {string} relativePrefix
 * @param {string[]} files
 */
function collectFiles(dir, relativePrefix, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = relativePrefix
      ? `${relativePrefix}/${entry.name}`
      : entry.name;
    if (entry.isDirectory()) {
      collectFiles(full, rel, files);
    } else if (entry.isFile()) {
      files.push({ abs: full, rel: normalizeRel(rel) });
    }
  }
}

/**
 * @param {string} [root]
 */
export function checkDxk06ComposeRemnants(root = repoRoot) {
  const resolved = path.resolve(root);
  const files = [];

  const rootFiles = [
    'package.json',
    '.env.example',
    'Tiltfile',
    'AGENTS.md',
    'STATUS.md',
    'README.md',
  ];
  for (const rel of rootFiles) {
    const abs = path.join(resolved, rel);
    if (existsSync(abs) && statSync(abs).isFile()) {
      files.push({ abs, rel: normalizeRel(rel) });
    }
  }

  const dirRoots = [
    '.github',
    'docs',
    'infra',
    'scripts',
    'apps',
    'tools',
    'packages',
    '.cursor/rules',
  ];
  for (const relDir of dirRoots) {
    const absDir = path.join(resolved, relDir);
    if (!existsSync(absDir)) continue;
    collectFiles(absDir, relDir, files);
  }

  for (const relDir of ['apps', 'tools', 'packages']) {
    const parent = path.join(resolved, relDir);
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const readme = path.join(parent, entry.name, 'README.md');
      if (existsSync(readme)) {
        files.push({
          abs: readme,
          rel: normalizeRel(`${relDir}/${entry.name}/README.md`),
        });
      }
    }
  }

  const composeYamlHits = [];
  const seen = new Set();
  for (const { abs, rel } of files) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const base = path.basename(rel);
    if (base === 'compose.yaml' || base === 'compose.yml') {
      composeYamlHits.push(rel);
    }
  }

  let scanned = 0;
  const violations = [];

  if (composeYamlHits.length > 0) {
    for (const rel of composeYamlHits) {
      if (!isAllowlisted(rel)) {
        violations.push(`${rel}: compose orchestrator file must not exist`);
      }
    }
  }

  for (const { abs, rel } of files) {
    if (isAllowlisted(rel)) continue;
    const base = path.basename(rel);
    if (base === 'compose.yaml' || base === 'compose.yml') continue;
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    scanned += 1;
    try {
      scanTextForComposeRemnants(rel, text);
    } catch (error) {
      violations.push(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `DXK06 compose remnant scan failed (${violations.length}):\n${violations.join('\n')}`,
    );
  }

  return { scannedFiles: scanned, scanRoots: dirRoots.length + rootFiles.length };
}

function main() {
  const result = checkDxk06ComposeRemnants();
  console.log(
    `DXK06 compose remnant scan OK: ${result.scannedFiles} active file(s) checked`,
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
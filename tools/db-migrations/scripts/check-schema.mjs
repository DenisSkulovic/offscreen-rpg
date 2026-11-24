#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FROZEN_DIGEST =
  '1958c5f5dd8d31ff703fe3a8cce383e829900f9abc4a60d5c8d29eed0de34bad';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(toolRoot, '../..');
const fixtureRoot = path.join(toolRoot, 'test', 'fixtures');
const baselinePath = path.join(fixtureRoot, 'schema-baseline.json');
const trackedMigrations = path.join(repoRoot, 'packages', 'db', 'migrations');

const GENERATE_TIMEOUT_MS = 30_000;

/** @param {string} dir */
function listFiles(dir) {
  /** @type {string[]} */
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(dir, full);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full).map((child) => path.join(rel, child)));
    } else {
      files.push(rel);
    }
  }
  return files.sort();
}

/** @param {string} dir */
function hashTree(dir) {
  /** @type {Record<string, string>} */
  const hashes = {};
  for (const rel of listFiles(dir)) {
    const full = path.join(dir, rel);
    hashes[rel] = createHash('sha256')
      .update(readFileSync(full))
      .digest('hex');
  }
  return hashes;
}

/**
 * @param {Record<string, string>} before
 * @param {Record<string, string>} after
 * @param {string} label
 */
function assertTreeUnchanged(before, after, label) {
  const beforeKeys = Object.keys(before).sort();
  const afterKeys = Object.keys(after).sort();
  if (beforeKeys.join('\0') !== afterKeys.join('\0')) {
    const added = afterKeys.filter((key) => !(key in before));
    const removed = beforeKeys.filter((key) => !(key in after));
    throw new Error(
      `${label}: file set changed (added: ${added.join(', ') || 'none'}; removed: ${removed.join(', ') || 'none'})`,
    );
  }
  for (const key of beforeKeys) {
    if (before[key] !== after[key]) {
      throw new Error(`${label}: modified file ${key}`);
    }
  }
}

/**
 * @param {string} configPath
 * @param {string[]} extraArgs
 */
function runDrizzleKit(configPath, extraArgs = []) {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  const result = spawnSync(
    'pnpm',
    ['exec', 'drizzle-kit', 'generate', `--config=${configPath}`, ...extraArgs],
    {
      cwd: toolRoot,
      env,
      encoding: 'utf8',
      timeout: GENERATE_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (result.error) {
    throw result.error;
  }
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.signal === 'SIGTERM' && GENERATE_TIMEOUT_MS > 0) {
    throw new Error(`drizzle-kit generate timed out after ${GENERATE_TIMEOUT_MS}ms`);
  }
  if (result.status !== 0) {
    throw new Error(
      `drizzle-kit generate failed (status ${result.status}): ${combined}`,
    );
  }
  return combined;
}

/** @type {string[]} */
const tempConfigPaths = [];

/**
 * @param {string} outDir
 */
function writeTempConfig(outDir) {
  const configBody = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: ${JSON.stringify(path.join(toolRoot, 'src/registry/index.ts'))},
  out: ${JSON.stringify(outDir)},
});
`;
  const configPath = path.join(
    mkdtempSync(path.join(os.tmpdir(), 'offscreen-drizzle-config-')),
    'drizzle.check.config.ts',
  );
  writeFileSync(configPath, configBody);
  tempConfigPaths.push(path.dirname(configPath));
  return configPath;
}

/**
 * @param {string} outDir
 */
function seedSyntheticHistory(outDir, baseline) {
  const metaDir = path.join(outDir, 'meta');
  mkdirSync(metaDir, { recursive: true });
  writeFileSync(path.join(metaDir, '0000_snapshot.json'), baseline);
  writeFileSync(
    path.join(metaDir, '_journal.json'),
    `${JSON.stringify(
      {
        version: '7',
        dialect: 'postgresql',
        entries: [
          {
            idx: 0,
            version: '7',
            when: 1,
            tag: '0000_db01_identity',
            breakpoints: true,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(path.join(outDir, '0000_db01_identity.sql'), '');
}

function assertTrackedMigrationsClean() {
  const result = spawnSync(
    'git',
    ['diff', '--exit-code', '--', 'packages/db/migrations'],
  { cwd: repoRoot, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `tracked migrations changed on disk: ${result.stdout ?? ''}${result.stderr ?? ''}`,
    );
  }
}

async function main() {
  if (!existsSync(baselinePath)) {
    throw new Error(`missing frozen baseline at ${baselinePath}`);
  }
  const baseline = readFileSync(baselinePath, 'utf8');

  const { canonicalSnapshotDigest } = await import(
    path.join(toolRoot, 'dist/src/canonical-snapshot.js')
  );

  const noDdlRoot = mkdtempSync(
    path.join(toolRoot, '.check-schema-no-ddl-'),
  );
  const digestRoot = mkdtempSync(path.join(toolRoot, '.check-schema-digest-'));

  try {
    seedSyntheticHistory(noDdlRoot, baseline);
    const beforeNoDdl = hashTree(noDdlRoot);
    const noDdlConfig = writeTempConfig(noDdlRoot);
    runDrizzleKit(noDdlConfig);
    const afterNoDdl = hashTree(noDdlRoot);
    assertTreeUnchanged(beforeNoDdl, afterNoDdl, 'synthetic no-DDL fixture');

    mkdirSync(digestRoot, { recursive: true });
    const digestConfig = writeTempConfig(digestRoot);
    runDrizzleKit(digestConfig, ['--name=db01_identity']);
    const generatedSnapshot = path.join(digestRoot, 'meta', '0000_snapshot.json');
    if (!existsSync(generatedSnapshot)) {
      throw new Error(
        `fresh generate did not create ${path.relative(toolRoot, generatedSnapshot)}`,
      );
    }
    const snapshot = JSON.parse(readFileSync(generatedSnapshot, 'utf8'));
    const digest = canonicalSnapshotDigest(snapshot);
    if (digest !== FROZEN_DIGEST) {
      console.error(`expected digest: ${FROZEN_DIGEST}`);
      console.error(`actual digest:   ${digest}`);
      process.exit(1);
    }

    assertTrackedMigrationsClean();
    console.log('check:schema ok (synthetic no-DDL and frozen digest match)');
  } finally {
    for (const temp of [noDdlRoot, digestRoot, ...tempConfigPaths]) {
      if (existsSync(temp)) rmSync(temp, { recursive: true, force: true });
    }
    for (const entry of readdirSync(toolRoot)) {
      if (entry.startsWith('.check-schema-')) {
        rmSync(path.join(toolRoot, entry), { recursive: true, force: true });
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
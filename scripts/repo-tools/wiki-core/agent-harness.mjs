import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const EXCLUDED_PREFIXES = [
  'scripts/repo-tools/wiki-benchmarks/',
  'scripts/repo-tools/wiki-core/agent-fixtures/',
  'work/designs/open/wiki-health/',
  'work/changes/open/2026-11-16--wiki01-markdown-graph-health/',
  'work/changes/open/2026-11-16--wiki02-static-retrieval-and-hopper/',
  'work/changes/open/2026-11-16--wiki03-isolated-agent-evaluation/',
  'work/changes/archive/2026-11/other/2026-11-16--wiki01-markdown-graph-health/',
  'work/changes/archive/2026-11/other/2026-11-16--wiki02-static-retrieval-and-hopper/',
  'out/',
  'scripts/repo-tools/retrieval-funnel-oracle.mjs',
  'scripts/repo-tools/semantic-pilot-cases.mjs',
];

export function buildSnapshotManifest(paths) {
  const included = [];
  const excluded = [];
  for (const rel of [...paths].sort()) {
    if (EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix))) excluded.push(rel);
    else included.push(rel);
  }
  const fingerprint = createHash('sha256').update(included.join('\n')).digest('hex');
  return { included, excluded, fingerprint };
}

export function materializeSnapshot(targetDir, files) {
  const manifest = buildSnapshotManifest(Object.keys(files));
  for (const rel of manifest.included) {
    const abs = path.join(targetDir, ...rel.split('/'));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, files[rel], 'utf8');
  }
  const stub = path.join(targetDir, 'work', 'designs', 'open', 'wiki-health', 'README.md');
  mkdirSync(path.dirname(stub), { recursive: true });
  writeFileSync(
    stub,
    '# Wiki Health\n\nWithheld from this agent snapshot. This stub is not a product or technical authority.\n',
    'utf8',
  );
  return manifest;
}

export function readSnapshotFile(snapshotDir, rel) {
  const root = path.resolve(snapshotDir);
  const abs = path.resolve(root, ...String(rel).split('/'));
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error('path escapes the agent snapshot');
  }
  return readFileSync(abs, 'utf8');
}

export function dryRunReport() {
  return {
    schema: 'wiki.agent-dry-run.v1',
    model: null,
    adapterInvoked: false,
    cliProbed: false,
    cases: 0,
    repetitions: 0,
    cap: null,
    sandboxProved: false,
    freshProcess: false,
    realLaunch: 'refused',
    reason:
      'No approved model, attempt cap, sandbox canary, or fresh-process guarantee. CLI help was not run.',
    evidenceClass: 'fake-harness-only',
  };
}

export function assertRealLaunchAllowed(options) {
  const missing = [];
  if (!options.approveModelUsage) missing.push('approve-model-usage');
  if (!options.model) missing.push('model');
  if (!options.cap) missing.push('cap');
  if (!options.maxAttempts) missing.push('max-attempts');
  if (!options.sandboxProved) missing.push('sandbox');
  if (!options.freshProcess) missing.push('fresh-process');
  if (missing.length > 0) {
    const error = new Error(`real model launch refused: ${missing.join(', ')}`);
    error.code = 'refused';
    throw error;
  }
}

#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(toolRoot, '../..');
const migrationsDir = path.join(repoRoot, 'packages', 'db', 'migrations');
const metaDir = path.join(migrationsDir, 'meta');
const journalPath = path.join(metaDir, '_journal.json');

function newestSnapshotIndex() {
  let newest = -1;
  for (const entry of readdirSync(metaDir)) {
    const match = /^(\d{4})_snapshot\.json$/.exec(entry);
    if (!match) continue;
    const idx = Number.parseInt(match[1], 10);
    if (idx > newest) newest = idx;
  }
  return newest;
}

function tableCount(snapshotPath) {
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const tables = snapshot.tables;
  if (!tables || typeof tables !== 'object') return 0;
  return Object.keys(tables).length;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(journalPath)) {
  fail(`missing migration journal at ${journalPath}`);
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const entries = journal.entries;
if (!Array.isArray(entries) || entries.length === 0) {
  fail('migration journal has no entries');
}

const finalEntry = entries[entries.length - 1];
const finalIdx = finalEntry.idx;
const expectedSnapshot = path.join(
  metaDir,
  `${String(finalIdx).padStart(4, '0')}_snapshot.json`,
);

const newestIdx = newestSnapshotIndex();
const newestSnapshotPath =
  newestIdx >= 0
    ? path.join(metaDir, `${String(newestIdx).padStart(4, '0')}_snapshot.json`)
    : null;
const newestTables =
  newestSnapshotPath && existsSync(newestSnapshotPath)
    ? tableCount(newestSnapshotPath)
    : 0;

console.error(
  `stale migration metadata: journal final idx ${finalIdx}; newest checked-in snapshot idx ${newestIdx} (${newestTables} tables)`,
);

if (!existsSync(expectedSnapshot)) {
  console.error(
    `refusing tracked generation: missing ${path.relative(repoRoot, expectedSnapshot)} for journal idx ${finalIdx} (metadata reconciliation is DBOPS01; not repaired here)`,
  );
  process.exit(1);
}

console.error('migration journal and terminal snapshot index align');
process.exit(0);
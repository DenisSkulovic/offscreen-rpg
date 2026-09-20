import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fail, root, runPnpm } from './process.mjs';

const migrations = path.join(root, 'packages', 'db', 'migrations');
const meta = path.join(migrations, 'meta');

function generatedEntries() {
  return readdirSync(migrations).filter(
    (entry) => entry === 'meta' || /^\d{4}_.+\.sql$/.test(entry),
  );
}

try {
  const sqlFiles = generatedEntries().filter((entry) => entry.endsWith('.sql'));
  if (sqlFiles.length > 1) {
    throw new Error(
      `Refusing to replace ${sqlFiles.length} migrations; the pre-POC contract permits one baseline.`,
    );
  }
  const backupRoot = mkdtempSync(path.join(os.tmpdir(), 'offscreen-baseline-'));
  const backup = path.join(backupRoot, 'migrations');
  cpSync(migrations, backup, { recursive: true });
  try {
    for (const entry of generatedEntries()) {
      rmSync(path.join(migrations, entry), { recursive: true, force: true });
    }
    mkdirSync(meta, { recursive: true });
    writeFileSync(
      path.join(meta, '_journal.json'),
      '{\n  "version": "7",\n  "dialect": "postgresql",\n  "entries": []\n}\n',
    );
    const nodeOptions = [
      process.env.NODE_OPTIONS,
      `--require=${path.join(root, 'scripts', 'repo-tools', 'node-user-info-shim.cjs')}`,
    ]
      .filter(Boolean)
      .join(' ');
    runPnpm(['--filter', '@offscreen/db', 'generate'], {
      env: { ...process.env, NODE_OPTIONS: nodeOptions },
    });
    const generatedSql = generatedEntries().filter((entry) =>
      entry.endsWith('.sql'),
    );
    if (generatedSql.length !== 1) {
      throw new Error(
        'Drizzle did not produce exactly one baseline migration.',
      );
    }
    console.log(`Baseline ready: packages/db/migrations/${generatedSql[0]}`);
  } catch (error) {
    rmSync(migrations, { recursive: true, force: true });
    cpSync(backup, migrations, { recursive: true });
    throw error;
  } finally {
    if (existsSync(backupRoot))
      rmSync(backupRoot, { recursive: true, force: true });
  }
} catch (error) {
  fail(error);
}

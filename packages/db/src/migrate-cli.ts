import { resolve } from 'node:path';
import { readDatabaseConfig } from './config';
import { applyMigrations } from './migrate';
import { formatMigrationFailure } from './migrations/diagnostics';

async function main(): Promise<void> {
  try {
    const config = readDatabaseConfig(process.env);
    await applyMigrations(config, resolve(__dirname, '../../migrations'));
    console.log('Database migrations applied.');
  } catch (error) {
    console.error(formatMigrationFailure(error));
    process.exitCode = 1;
  }
}

void main();

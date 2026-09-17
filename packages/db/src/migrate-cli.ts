import { resolve } from 'node:path';
import { readDatabaseConfig } from './config';
import { applyMigrations } from './migrate';

void applyMigrations(
  readDatabaseConfig(process.env),
  resolve(__dirname, '../../migrations'),
)
  .then(() => console.log('Database migrations applied.'))
  .catch(() => {
    console.error(
      'Migration failed. Check database connectivity, schema and migration lock.',
    );
    process.exitCode = 1;
  });

import { betterAuth } from 'better-auth';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { authOptions } from './src/auth/auth.js';

// Schema generation is offline. These are placeholders, never runtime credentials.
const database = createDatabase(
  readDatabaseConfig({
    DATABASE_URL: 'postgresql://localhost/schema_generation',
  }),
  () => {},
);
export const auth = betterAuth(
  authOptions(database, {
    origin: 'http://localhost:3000',
    secret: 'offline-schema-generation-placeholder-only',
    githubClientId: 'offline',
    githubClientSecret: 'offline',
  }),
);

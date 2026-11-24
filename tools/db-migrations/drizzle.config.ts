import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/registry/index.ts',
  out: '../../packages/db/migrations',
});
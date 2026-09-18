import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        { patterns: ['**/apps/**', '**/packages/**'] },
      ],
    },
  },
  {
    files: ['packages/game/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@offscreen/*',
            'node:*',
            'drizzle-orm',
            '@nestjs/*',
            '@temporalio/*',
            'better-auth',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@offscreen/db',
            '@offscreen/db/*',
            '@offscreen/server',
            '@offscreen/server/*',
            '@offscreen/storyteller',
            '@offscreen/storyteller/*',
            '@offscreen/workflows',
            '@offscreen/workflows/*',
            '@offscreen/worker',
            '@offscreen/worker/*',
            '**/apps/**',
            '**/packages/**',
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@offscreen/db',
            '@offscreen/db/*',
            '@offscreen/server',
            '@offscreen/server/*',
            '@offscreen/storyteller',
            '@offscreen/storyteller/*',
            '@offscreen/workflows',
            '@offscreen/workflows/*',
            '@offscreen/worker',
            '@offscreen/worker/*',
            '**/apps/**',
            '**/packages/**',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/workflows/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@offscreen/db',
            '@offscreen/db/*',
            '@offscreen/server',
            '@offscreen/server/*',
            '@offscreen/storyteller',
            '@offscreen/storyteller/*',
            '@offscreen/worker',
            '@offscreen/worker/*',
            '**/apps/**',
            '**/packages/**',
          ],
        },
      ],
    },
  },
  {
    files: ['packages/storyteller/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@offscreen/db',
            '@offscreen/db/*',
            '@offscreen/server',
            '@offscreen/server/*',
            '@nestjs/*',
            '@temporalio/*',
            '**/apps/**',
            '**/packages/**',
          ],
        },
      ],
    },
  },
);

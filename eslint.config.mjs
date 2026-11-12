import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import queryPlugin from '@tanstack/eslint-plugin-query';

function banGroups(entries) {
  return entries.map(([group, message]) => ({
    group: Array.isArray(group) ? group : [group],
    message,
  }));
}

const webBackendPatterns = banGroups([
  [
    ['@offscreen/db', '@offscreen/db/*'],
    'Web must not import the database package.',
  ],
  [
    ['@offscreen/application', '@offscreen/application/*'],
    'Web must not import application services.',
  ],
  [
    ['@offscreen/storyteller', '@offscreen/storyteller/*'],
    'Web must not import Storyteller.',
  ],
  [
    ['@offscreen/workflows', '@offscreen/workflows/*'],
    'Web must not import Temporal workflows.',
  ],
  [
    ['@offscreen/worker', '@offscreen/worker/*'],
    'Web must not import workers.',
  ],
  [['**/apps/**', '**/packages/**'], 'Use package names, not deep relative monorepo paths.'],
]);

const webClientServerPatterns = [
  ...webBackendPatterns,
  ...banGroups([
    [
      ['@/src/server/*', '@/src/server/**'],
      'Browser/feature code must not import server-only Nest readers or request cookie helpers. Use shared pure helpers or same-origin /api adapters.',
    ],
  ]),
];

export default ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/next-env.d.ts',
      'apps/web/src/test/lint-fixtures/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: banGroups([
            [
              ['**/apps/**', '**/packages/**'],
              'Use package names, not deep relative monorepo paths.',
            ],
          ]),
        },
      ],
    },
  },
  {
    files: ['packages/game/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: banGroups([
            [
              [
                '@offscreen/*',
                'node:*',
                'drizzle-orm',
                '@nestjs/*',
                '@temporalio/*',
                'better-auth',
              ],
              'Game package stays free of backend and Node imports.',
            ],
          ]),
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
          patterns: banGroups([
            [
              [
                '@offscreen/db',
                '@offscreen/db/*',
                '@offscreen/application',
                '@offscreen/application/*',
                '@offscreen/storyteller',
                '@offscreen/storyteller/*',
                '@offscreen/workflows',
                '@offscreen/workflows/*',
                '@offscreen/worker',
                '@offscreen/worker/*',
                '**/apps/**',
                '**/packages/**',
              ],
              'Contracts must stay free of backend packages.',
            ],
          ]),
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
      '@tanstack/query': queryPlugin,
    },
    settings: {
      next: {
        rootDir: 'apps/web',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...queryPlugin.configs['flat/recommended'][0].rules,
      '@tanstack/query/no-rest-destructuring': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: webBackendPatterns,
        },
      ],
    },
  },
  {
    files: [
      'apps/web/src/features/**/*.{ts,tsx}',
      'apps/web/src/shared/**/*.{ts,tsx}',
      'apps/web/src/lib/**/*.{ts,tsx}',
      'apps/web/src/test/**/*.{ts,tsx}',
      'apps/web/src/stories/**/*.{ts,tsx}',
    ],
    ignores: ['apps/web/src/test/lint-fixtures/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: webClientServerPatterns,
          paths: [
            {
              name: 'server-only',
              message: 'Do not import server-only into the browser graph.',
            },
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
          patterns: banGroups([
            [
              [
                '@offscreen/db',
                '@offscreen/db/*',
                '@offscreen/application',
                '@offscreen/application/*',
                '@offscreen/storyteller',
                '@offscreen/storyteller/*',
                '@offscreen/worker',
                '@offscreen/worker/*',
                '**/apps/**',
                '**/packages/**',
              ],
              'Workflows must not import these packages.',
            ],
          ]),
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
          patterns: banGroups([
            [
              [
                '@offscreen/db',
                '@offscreen/db/*',
                '@offscreen/application',
                '@offscreen/application/*',
                '@nestjs/*',
                '@temporalio/*',
                '**/apps/**',
                '**/packages/**',
              ],
              'Storyteller must not import these packages.',
            ],
          ]),
        },
      ],
    },
  },
);

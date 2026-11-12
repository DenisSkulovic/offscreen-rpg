import base from './eslint.config.mjs';

/** Lint only deliberate W13 failure fixtures (not part of normal lint:web). */
export default [
  ...base.map((block) => {
    if (!block || typeof block !== 'object' || !('ignores' in block)) {
      return block;
    }
    return {
      ...block,
      ignores: (block.ignores ?? []).filter(
        (entry) => entry !== 'apps/web/src/test/lint-fixtures/**',
      ),
    };
  }),
  {
    files: ['apps/web/src/test/lint-fixtures/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/src/server/*', '@/src/server/**'],
              message:
                'Browser/feature code must not import server-only Nest readers or request cookie helpers.',
            },
          ],
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
];

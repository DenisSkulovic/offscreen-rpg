import base from './eslint.config.mjs';

// Opt-in audit: existing debt is visible without silently refactoring the repo.
export default [
  ...base,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      curly: ['error', 'all'],
      'no-nested-ternary': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
];

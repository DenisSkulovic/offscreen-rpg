import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyChangeScope, isDocsPath, isIntegrationPath } from './ci-change-scope.mjs';

test('docs-only markdown and agent maps skip code and integration on push', () => {
  const scope = classifyChangeScope(
    [
      'docs/minutes/2026-11-12.md',
      'docs/changes/README.md',
      'AGENTS.md',
      'apps/web/README.md',
      '.agents/rules/verification.md',
    ],
    { eventName: 'push' },
  );
  assert.equal(scope.docsOnly, true);
  assert.equal(scope.runCode, false);
  assert.equal(scope.runIntegration, false);
});

test('web-only source push runs code but not integration', () => {
  const scope = classifyChangeScope(
    ['apps/web/src/features/play/view.tsx', 'apps/web/package.json'],
    { eventName: 'push' },
  );
  assert.equal(scope.docsOnly, false);
  assert.equal(scope.runCode, true);
  assert.equal(scope.runIntegration, false);
  assert.equal(scope.touchesWeb, true);
});

test('contracts or lockfile changes are never docs-only and force integration', () => {
  for (const path of [
    'packages/contracts/src/stories.ts',
    'pnpm-lock.yaml',
    'compose.yaml',
    'apps/api/src/main.ts',
  ]) {
    assert.equal(isDocsPath(path), false);
    assert.equal(isIntegrationPath(path), true);
    const scope = classifyChangeScope([path], { eventName: 'push' });
    assert.equal(scope.docsOnly, false);
    assert.equal(scope.runCode, true);
    assert.equal(scope.runIntegration, true, path);
  }
});

test('pull_request and workflow_dispatch always run code and integration', () => {
  for (const eventName of ['pull_request', 'workflow_dispatch']) {
    const scope = classifyChangeScope(['docs/README.md'], { eventName });
    assert.equal(scope.runCode, true);
    assert.equal(scope.runIntegration, true);
    assert.equal(scope.docsOnly, false);
  }
});

test('mixed docs and web source is not docs-only', () => {
  const scope = classifyChangeScope(
    ['docs/changes/README.md', 'apps/web/vitest.config.ts'],
    { eventName: 'push' },
  );
  assert.equal(scope.docsOnly, false);
  assert.equal(scope.runCode, true);
  assert.equal(scope.runIntegration, false);
});

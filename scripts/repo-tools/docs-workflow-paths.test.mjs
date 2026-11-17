/**
 * Reproducible match of the documentation workflow path filter.
 * This does not call GitHub. It reads .github/workflows/docs.yml and applies
 * the same * / ** rules Actions uses for on.push.paths and on.pull_request.paths.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = path.join(root, '.github', 'workflows', 'docs.yml');

function globToRegExp(pattern) {
  let source = '';
  let index = 0;
  while (index < pattern.length) {
    if (pattern.startsWith('**/', index)) {
      source += '(?:.*/)?';
      index += 3;
      continue;
    }
    if (pattern.startsWith('**', index)) {
      source += '.*';
      index += 2;
      continue;
    }
    const char = pattern[index];
    if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if ('\\^$+?.()|{}[]'.includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
    index += 1;
  }
  return new RegExp(`^${source}$`);
}

function eventPaths(yaml, eventName) {
  const marker = `  ${eventName}:`;
  const start = yaml.indexOf(marker);
  if (start < 0) throw new Error(`missing ${eventName} trigger`);
  const rest = yaml.slice(start + marker.length);
  const next = rest.search(/\n {2}[A-Za-z]/);
  const block = next < 0 ? rest : rest.slice(0, next);
  return [...block.matchAll(/- '([^']+)'/g)].map((match) => match[1]);
}

function matches(patterns, file) {
  return patterns.some((pattern) => globToRegExp(pattern).test(file));
}

const REQUIRED = [
  'work/changes/**',
  'work/designs/**',
  'research/**',
  'evidence/**',
];

test('push and pull_request docs filters cover Change packets and reject app source', () => {
  const yaml = readFileSync(workflowPath, 'utf8');
  const push = eventPaths(yaml, 'push');
  const pullRequest = eventPaths(yaml, 'pull_request');
  assert.deepEqual(push, pullRequest);
  for (const pattern of REQUIRED) {
    assert.equal(push.includes(pattern), true, pattern);
  }

  const changeOnly = 'work/changes/open/example/CHANGE.md';
  assert.equal(matches(push, changeOnly), true);
  assert.equal(matches(push, 'research/README.md'), true);
  assert.equal(matches(push, 'evidence/README.md'), true);
  assert.equal(matches(push, 'apps/web/src/features/play/view.tsx'), false);
  assert.equal(matches(push, 'packages/application/src/storyteller/context-capture.ts'), false);
});

test('maintenance workflow covers a Change packet and a cited source file', () => {
  const yaml = readFileSync(path.join(root, '.github', 'workflows', 'maintenance.yml'), 'utf8');
  const push = eventPaths(yaml, 'push');
  const pullRequest = eventPaths(yaml, 'pull_request');
  assert.deepEqual(push, pullRequest);
  assert.equal(matches(push, 'work/changes/open/example/CHANGE.md'), true);
  assert.equal(matches(push, 'packages/engine/src/time.ts'), true);
  assert.equal(yaml.includes('schedule:'), true);
  assert.equal(yaml.includes('workflow_dispatch:'), true);
  assert.equal(yaml.includes('pnpm install'), false);
});

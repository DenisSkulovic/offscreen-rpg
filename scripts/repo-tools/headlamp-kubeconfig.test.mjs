import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertOutputPath,
  selectContext,
  writeKubeconfigFile,
} from './headlamp-kubeconfig.mjs';
import { CONTEXT_NAME } from './stack-preflight.mjs';

const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const FIXTURE = `apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ZmFrZS1jYQ==
    server: https://127.0.0.1:6443
  name: kind-offscreen-lab
- cluster:
    server: https://foreign.example:6443
  name: kind-foreign
contexts:
- context:
    cluster: kind-offscreen-lab
    user: kind-offscreen-lab
  name: kind-offscreen-lab
- context:
    cluster: kind-foreign
    user: kind-foreign-user
  name: kind-foreign
current-context: kind-foreign
users:
- name: kind-offscreen-lab
  user:
    token: fake-lab-token-do-not-log
- name: kind-foreign-user
  user:
    token: foreign-secret-token
`;

test('selectContext keeps only the lab context, cluster, and user', () => {
  const result = selectContext(FIXTURE, 'kind-offscreen-lab');
  assert.match(result, /name: kind-offscreen-lab/);
  assert.match(result, /current-context: kind-offscreen-lab/);
  assert.match(result, /user: kind-offscreen-lab/);
  assert.doesNotMatch(result, /kind-foreign/);
  assert.doesNotMatch(result, /kind-foreign-user/);
  assert.doesNotMatch(result, /foreign-secret-token/);
  assert.doesNotMatch(result, /foreign\.example/);
  assert.doesNotMatch(result, /\[object Object\]/);
  assert.match(result, /token: fake-lab-token-do-not-log/);
});

test('selectContext keeps nested user credentials under user', () => {
  const fixture = `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: kind-offscreen-lab
contexts:
- context:
    cluster: kind-offscreen-lab
    user: kind-offscreen-lab
  name: kind-offscreen-lab
current-context: kind-offscreen-lab
users:
- name: kind-offscreen-lab
  user:
    client-certificate-data: Y2VydA==
    client-key-data: a2V5
`;
  const result = selectContext(fixture, 'kind-offscreen-lab');
  assert.match(result, /client-certificate-data: Y2VydA==/);
  assert.match(result, /client-key-data: a2V5/);
  assert.match(result, /- cluster:\n {4}server: /);
  assert.match(result, /- context:\n {4}cluster: kind-offscreen-lab/);
  assert.doesNotMatch(result, /\[object Object\]/);
});

test('selectContext throws when context is missing', () => {
  assert.throws(() => selectContext(FIXTURE, 'missing-context'), /not found/);
});

test('assertOutputPath refuses empty and in-repo paths', () => {
  assert.throws(() => assertOutputPath('', REPO_ROOT), /empty/);
  assert.throws(() => assertOutputPath('   ', REPO_ROOT), /empty/);
  assert.throws(
    () => assertOutputPath(join(REPO_ROOT, 'tmp', 'leak.config'), REPO_ROOT),
    /inside the repository/,
  );
});

test('writeKubeconfigFile does not create a file under the repo root', () => {
  const inside = join(REPO_ROOT, 'evidence', 'headlamp-should-not-exist.config');
  assert.throws(
    () => writeKubeconfigFile(inside, 'apiVersion: v1\n', REPO_ROOT),
    /inside the repository/,
  );
  assert.equal(existsSync(inside), false);
  if (existsSync(inside)) {
    rmSync(inside, { force: true });
  }
});
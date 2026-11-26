import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBaselineKubeconfig } from '../bootstrap/observation.mjs';

const profile = { contextName: 'kind-offscreen-dev' };
const config = () => ({
  contexts: [{ name: profile.contextName, context: { user: 'user', cluster: 'cluster' } }],
  users: [{ name: 'user', user: {} }],
  clusters: [{ name: 'cluster', cluster: { server: 'https://127.0.0.1:12345' } }],
});
const run = body => () => ({ ok: true, stdout: JSON.stringify(body) });

test('single bound local credential configuration is accepted', () => {
  assert.doesNotThrow(() => assertBaselineKubeconfig(profile, run(config())));
});

test('exec and auth-provider credential plugins are refused', () => {
  for (const key of ['exec', 'auth-provider']) {
    const body = config();
    body.users[0].user[key] = {};
    assert.throws(() => assertBaselineKubeconfig(profile, run(body)), /Unsafe/);
  }
});

test('proxy, insecure TLS, and inconsistent references are refused', () => {
  for (const key of ['proxy-url', 'insecure-skip-tls-verify']) {
    const body = config();
    body.clusters[0].cluster[key] = true;
    assert.throws(() => assertBaselineKubeconfig(profile, run(body)), /Unsafe/);
  }
  const body = config();
  body.contexts[0].context.user = 'another';
  assert.throws(() => assertBaselineKubeconfig(profile, run(body)), /Unsafe/);
});

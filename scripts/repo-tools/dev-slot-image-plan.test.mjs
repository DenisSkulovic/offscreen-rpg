import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintDevImageContext, planRestartImageReuse, planSlotImageArtifact, planUnionImageUse, UNION_ROLE_FILTER } from './dev-slot-image-plan.mjs';

const RECIPE = `FROM docker.io/library/node:24.19.0-bookworm-slim@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AS base
ARG TURBO_FILTER=@offscreen/api^...
`;
const IGNORE = `
.git
**/node_modules
**/dist
.env
**/*.pem
docs
work
**/.cache
**/*.log
`;

function checkout(name) {
  const root = mkdtempSync(join(tmpdir(), name));
  mkdirSync(join(root, 'infra/kubernetes/lab/dev'), { recursive: true });
  mkdirSync(join(root, 'packages/db'), { recursive: true });
  writeFileSync(join(root, 'infra/kubernetes/lab/dev/Dockerfile'), RECIPE);
  writeFileSync(join(root, 'infra/kubernetes/lab/dev/Dockerfile.dockerignore'), IGNORE);
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock: v1\n');
  writeFileSync(join(root, 'packages/db/index.ts'), 'export const value = 1;\n');
  return root;
}

function fingerprint(root, roleFilter = '@offscreen/api^...') {
  const result = fingerprintDevImageContext(root, { roleFilter });
  assert.equal(result.ok, true, result.reason);
  return result;
}

test('identical contexts in different directories share one fingerprint', () => {
  const left = fingerprint(checkout('ctx-a-'));
  const right = fingerprint(checkout('ctx-b-'));
  assert.equal(left.fingerprint, right.fingerprint);
  assert.equal(left.fingerprint.includes(checkout.name), false);
});

test('two slots can reuse one artifact only when both Kind nodes have its digest', () => {
  const identity = fingerprint(checkout('ctx-slot-'));
  const artifact = {
    digest: 'sha256:abc',
    fingerprint: identity.fingerprint,
    role: 'api',
    filter: identity.roleFilter,
  };
  const shared = {
    role: 'api',
    filter: identity.roleFilter,
    fingerprint: identity.fingerprint,
    artifacts: [artifact],
  };
  const dev2 = planSlotImageArtifact({ ...shared, slotId: 'dev-2', nodes: { controlPlane: ['sha256:abc'], worker: ['sha256:abc'] } });
  const dev5 = planSlotImageArtifact({ ...shared, slotId: 'dev-5', nodes: { controlPlane: ['sha256:abc'], worker: ['sha256:abc'] } });
  assert.equal(dev2.decision, 'hit');
  assert.equal(dev5.decision, 'hit');
  assert.equal(dev2.digest, dev5.digest);
  assert.equal(dev2.build, false);
  const localTagOnly = planSlotImageArtifact({ ...shared, slotId: 'dev-4', nodes: { controlPlane: ['sha256:abc'], worker: [] } });
  assert.equal(localTagOnly.decision, 'miss');
  assert.equal(localTagOnly.reason, 'missing-kind-node');
  assert.deepEqual(localTagOnly.loadNodes, ['worker']);
  assert.equal(localTagOnly.build, false);
});

test('included source, lockfile, Dockerfile and role argument change the fingerprint', () => {
  const root = checkout('ctx-edit-');
  const original = fingerprint(root).fingerprint;
  writeFileSync(join(root, 'packages/db/index.ts'), 'export const value = 2;\n');
  assert.notEqual(fingerprint(root).fingerprint, original);
  writeFileSync(join(root, 'packages/db/index.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock: v2\n');
  assert.notEqual(fingerprint(root).fingerprint, original);
  writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock: v1\n');
  writeFileSync(join(root, 'infra/kubernetes/lab/dev/Dockerfile'), RECIPE.replace('node:24', 'node:25'));
  assert.notEqual(fingerprint(root).fingerprint, original);
  assert.notEqual(fingerprint(checkout('ctx-role-'), '@offscreen/web^...').fingerprint, original);
});

test('a dirty untracked included file changes the fingerprint and ignored files do not', () => {
  const root = checkout('ctx-dirty-');
  const original = fingerprint(root).fingerprint;
  writeFileSync(join(root, 'packages/db/untracked.ts'), 'export const extra = true;\n');
  const dirty = fingerprint(root).fingerprint;
  assert.notEqual(dirty, original);
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, 'packages/db/node_modules'), { recursive: true });
  mkdirSync(join(root, 'packages/db/dist'), { recursive: true });
  mkdirSync(join(root, 'packages/db/.cache'), { recursive: true });
  writeFileSync(join(root, 'docs/notes.md'), 'ignore me\n');
  writeFileSync(join(root, '.env'), 'SECRET=should-not-affect\n');
  writeFileSync(join(root, 'packages/db/token.pem'), '-----BEGIN\n');
  writeFileSync(join(root, 'packages/db/node_modules/pkg.js'), 'x\n');
  writeFileSync(join(root, 'packages/db/dist/index.js'), 'x\n');
  writeFileSync(join(root, 'packages/db/.cache/turbo.log'), 'x\n');
  const afterIgnored = fingerprint(root).fingerprint;
  assert.equal(afterIgnored, dirty);
  assert.equal(afterIgnored.includes('should-not-affect'), false);
});

test('corrupt or conflicting artifact metadata fails closed', () => {
  const plan = planSlotImageArtifact({
    slotId: 'dev-3',
    role: 'authority',
    filter: '@offscreen/game-authority^...',
    fingerprint: 'abc',
    artifacts: [{
      digest: 'sha256:bad',
      fingerprint: 'recorded',
      declaredFingerprint: 'different',
      role: 'authority',
      filter: '@offscreen/game-authority^...',
    }],
    nodes: { controlPlane: ['sha256:bad'], worker: ['sha256:bad'] },
  });
  assert.equal(plan.decision, 'miss');
  assert.equal(plan.reason, 'mismatched-metadata');
  assert.equal(plan.build, true);
  const conflict = planSlotImageArtifact({
    slotId: 'dev-3',
    role: 'authority',
    filter: '@offscreen/game-authority^...',
    fingerprint: 'abc',
    artifacts: [
      { digest: 'sha256:one', fingerprint: 'abc', role: 'authority', filter: '@offscreen/game-authority^...' },
      { digest: 'sha256:two', fingerprint: 'abc', role: 'authority', filter: '@offscreen/game-authority^...' },
    ],
    nodes: { controlPlane: ['sha256:one'], worker: ['sha256:one'] },
  });
  assert.equal(conflict.reason, 'conflicting-digests');
  assert.equal(conflict.build, true);
  const missing = planSlotImageArtifact({
    slotId: 'dev-3',
    role: 'api',
    filter: '@offscreen/api^...',
    fingerprint: null,
    artifacts: [],
    nodes: {},
  });
  assert.equal(missing.reason, 'unproven-context');
});

test('one union snapshot is reused by a second slot and a source change misses', () => {
  assert.match(UNION_ROLE_FILTER, /@offscreen\/web/);
  assert.match(UNION_ROLE_FILTER, /@offscreen\/worker/);
  const first = planUnionImageUse({ slotId: 'dev-3', fingerprint: 'fp-1', artifact: null, nodes: {} });
  assert.equal(first.build, true);
  assert.equal(first.aliases.length, 4);
  const secondPlan = planUnionImageUse({
    slotId: 'dev-4',
    fingerprint: 'fp-1',
    artifact: { digest: 'sha256:union', fingerprint: 'fp-1' },
    nodes: {},
  });
  const loaded = { digests: ['sha256:union'], tags: secondPlan.aliases };
  const second = planUnionImageUse({
    slotId: 'dev-4',
    fingerprint: 'fp-1',
    artifact: { digest: 'sha256:union', fingerprint: 'fp-1' },
    nodes: { 'control-plane': loaded, worker: { digests: ['sha256:union'], tags: [] } },
  });
  assert.equal(second.build, false);
  assert.deepEqual(second.loadNodes, ['worker']);
  assert.equal(second.ready, false);
  const changed = planUnionImageUse({
    slotId: 'dev-4',
    fingerprint: 'fp-2',
    artifact: { digest: 'sha256:union', fingerprint: 'fp-1' },
    nodes: { 'control-plane': loaded, worker: loaded },
  });
  assert.equal(changed.build, true);
  assert.equal(changed.ready, false);
});

test('unchanged fingerprint reuses the canonical digest and stays unready while loading', () => {
  const canonical = { fingerprint: 'fp-1', digest: 'sha256:union', ref: 'offscreen-dev-workspace:union-fp' };
  const loading = planRestartImageReuse({
    expectedRef: 'offscreen-dev-workspace:tilt-build-1795404939',
    fingerprint: 'fp-1',
    canonical,
    nodeHasRef: false,
    podImage: 'offscreen-dev-workspace:tilt-build-1795404939',
    podReady: true,
  });
  assert.equal(loading.dockerBuild, false);
  assert.equal(loading.alias, true);
  assert.equal(loading.kindLoad, true);
  assert.equal(loading.applicationReady, false);
  assert.equal(loading.reason, 'image-loading');
  const ready = planRestartImageReuse({
    expectedRef: 'offscreen-dev-workspace:tilt-build-1795404939',
    fingerprint: 'fp-1',
    canonical,
    nodeHasRef: true,
    podImage: 'sha256:union',
    podReady: true,
  });
  assert.equal(ready.dockerBuild, false);
  assert.equal(ready.applicationReady, true);
  const changed = planRestartImageReuse({
    expectedRef: 'offscreen-dev-workspace:tilt-build-new',
    fingerprint: 'fp-2',
    canonical,
    nodeHasRef: true,
    podReady: true,
  });
  assert.equal(changed.dockerBuild, true);
  assert.equal(changed.applicationReady, false);
});

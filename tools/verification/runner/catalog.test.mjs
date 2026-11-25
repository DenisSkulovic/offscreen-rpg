import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DB_PROFILE_SECTIONS,
  REPO_ROOT,
  buildVerificationCatalog,
  buildVerificationPlan,
  discoverWorkspacePackages,
  resolveSubject,
  resolveWorkspaceName,
} from './catalog.mjs';

test('discoverWorkspacePackages reads direct child manifest names', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-catalog-'));
  mkdirSync(join(repoRoot, 'packages', 'db'), { recursive: true });
  mkdirSync(join(repoRoot, 'packages', 'cache'), { recursive: true });
  writeFileSync(
    join(repoRoot, 'packages', 'db', 'package.json'),
    JSON.stringify({ name: '@offscreen/db' }),
  );
  writeFileSync(
    join(repoRoot, 'packages', 'cache', 'package.json'),
    JSON.stringify({ name: '@offscreen/cache' }),
  );

  const packages = discoverWorkspacePackages(repoRoot, 'packages');
  assert.deepEqual(
    packages.map((row) => row.manifestName),
    ['@offscreen/cache', '@offscreen/db'],
  );
});

test('buildVerificationCatalog registers infra adapter and db placeholder', () => {
  const catalog = buildVerificationCatalog(REPO_ROOT);
  assert.equal(catalog.infra.implementationStatus, 'registered');
  assert.equal(catalog.infra.adapter, 'suites/infra');

  const dbRow = catalog.packages.find(
    (row) => row.manifestName === '@offscreen/db',
  );
  assert.ok(dbRow);
  assert.equal(dbRow.implementationStatus, 'placeholder');
  assert.ok(catalog.unimplemented.packages.includes('@offscreen/cache'));
  assert.ok(catalog.unimplemented.apps.length > 0);
});

test('resolveWorkspaceName rejects ambiguity when two manifests collide', () => {
  const discovered = [
    { dirName: 'db', manifestName: '@offscreen/db' },
    { dirName: 'db2', manifestName: 'db' },
  ];
  const resolved = resolveWorkspaceName(discovered, 'db');
  assert.equal(resolved.ok, false);
  assert.match(resolved.message, /ambiguous/);
});

test('buildVerificationPlan rejects invalid db profile', () => {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  assert.equal(subject.ok, true);
  const plan = buildVerificationPlan({
    subject: subject.subject,
    profile: 'not-a-profile',
  });
  assert.equal(plan.ok, false);
  assert.match(plan.message, /unknown profile/);
});

test('buildVerificationPlan marks live db sections NOT-RUN without --live', () => {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  assert.equal(subject.ok, true);
  const plan = buildVerificationPlan({
    subject: subject.subject,
    profile: 'standard',
    live: false,
  });
  assert.equal(plan.ok, true);
  const admission = plan.plan.sections.find((row) => row.id === 'admission');
  assert.equal(admission.plannedStatus, 'NOT-RUN');
  assert.equal(plan.plan.incomplete, true);
});

test('buildVerificationPlan honors frozen profile section order', () => {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  assert.equal(subject.ok, true);
  const plan = buildVerificationPlan({
    subject: subject.subject,
    profile: 'stress',
    live: false,
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(
    plan.plan.sections.map((row) => row.id),
    [...DB_PROFILE_SECTIONS.stress],
  );
});

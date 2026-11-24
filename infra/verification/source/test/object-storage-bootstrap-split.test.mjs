import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import {
  compareImporterSecretBytes,
  decideImporterSecret,
  decideReaderBootstrap,
} from '../../release-acceptance/content-bootstrap/credentials.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../..');
const OBJECT_SMOKE = join(
  REPO_ROOT,
  'infra/verification/smoke/object-storage/smoke.sh',
);
const BOOTSTRAP_SMOKE = join(
  REPO_ROOT,
  'infra/verification/release-acceptance/content-bootstrap/smoke.sh',
);
const DOCUMENT_ACCESS_SMOKE = join(
  REPO_ROOT,
  'infra/verification/fixtures/document-access/smoke.sh',
);
const RETIRED_STORE_MANIFEST = join(
  REPO_ROOT,
  'infra/platform/object-storage/store.yaml',
);
const INSTALL_SH = join(REPO_ROOT, 'infra/platform/object-storage/install.sh');
const OBJECT_RUNBOOK = join(
  REPO_ROOT,
  'docs/runbooks/kubernetes-object-storage.md',
);
const BOOTSTRAP_RUNBOOK = join(
  REPO_ROOT,
  'docs/runbooks/kubernetes-content-bootstrap.md',
);

const admin = {
  accessKeyId: 'admin-access',
  secretAccessKey: 'admin-secret',
};

describe('content-bootstrap credential decisions', () => {
  test('importer create when secret absent', () => {
    assert.deepEqual(decideImporterSecret(null, admin), {
      action: 'create',
      comparison: 'absent',
    });
  });

  test('importer reuse when bytes match', () => {
    assert.deepEqual(decideImporterSecret(admin, admin), {
      action: 'reuse',
      comparison: 'match',
    });
  });

  test('importer refuse on byte mismatch', () => {
    const decision = decideImporterSecret(
      { accessKeyId: 'other', secretAccessKey: 'value' },
      admin,
    );
    assert.equal(decision.action, 'refuse');
    assert.equal(decision.reason, 'importer-secret-mismatch');
    assert.equal(compareImporterSecretBytes(admin, admin), 'match');
  });

  test('reader reuse when secret exists', () => {
    assert.deepEqual(
      decideReaderBootstrap({
        readerSecret: { accessKeyId: 'r', secretAccessKey: 's' },
        identityState: 'present',
      }),
      { action: 'reuse' },
    );
  });

  test('reader refuse on unknown identity without secret', () => {
    assert.deepEqual(
      decideReaderBootstrap({ readerSecret: null, identityState: 'unknown' }),
      { action: 'refuse', reason: 'reader-identity-unknown' },
    );
  });

  test('reader refuse on identity without secret', () => {
    assert.deepEqual(
      decideReaderBootstrap({ readerSecret: null, identityState: 'present' }),
      { action: 'refuse', reason: 'reader-identity-without-secret' },
    );
  });

  test('reader configure when identity and secret absent', () => {
    assert.deepEqual(
      decideReaderBootstrap({ readerSecret: null, identityState: 'absent' }),
      { action: 'configure' },
    );
  });

  test('reader refuse partial repair without confirmation', () => {
    assert.deepEqual(
      decideReaderBootstrap({
        readerSecret: null,
        identityState: 'absent',
        partialRepairRequired: true,
      }),
      { action: 'refuse', reason: 'reader-partial-repair-required' },
    );
  });
});

describe('object-storage smoke contract', () => {
  const body = readFileSync(OBJECT_SMOKE, 'utf8');

  test('requires install and existing secret; does not provision store', () => {
    assert.match(body, /install\.sh first/);
    assert.match(body, /get secret object-store-s3/);
    assert.doesNotMatch(body, /platform\/object-storage\/store\.yaml/);
    assert.doesNotMatch(body, /create secret generic object-store-s3/);
  });

  test('uses random proof prefix and absent client guard', () => {
    assert.match(body, /PROOF_PREFIX=.*openssl rand/);
    assert.match(body, /get pod "\$CLIENT_NAME"/);
    assert.match(body, /delete-object.*LIFECYCLE_KEY/);
    assert.match(body, /OFFSCREEN_OBJECT_STORAGE_POD_DELETE_CONFIRM/);
    assert.match(body, /pvc_uid_after.*pvc_uid_before/);
  });
});

describe('document-access smoke contract', () => {
  const body = readFileSync(DOCUMENT_ACCESS_SMOKE, 'utf8');

  test('requires install and existing secret; does not provision store', () => {
    assert.match(body, /install\.sh first/);
    assert.match(body, /get secret object-store-s3/);
    assert.doesNotMatch(body, /platform\/object-storage\/store\.yaml/);
    assert.doesNotMatch(body, /apply -f.*store\.yaml/);
    assert.doesNotMatch(body, /create secret generic object-store-s3/);
  });

  test('create-only writer and guarded reader bootstrap', () => {
    assert.match(body, /decide-writer/);
    assert.match(body, /decide-reader/);
    assert.match(body, /create secret generic document-writer-s3/);
    assert.match(body, /Repair the partial reader state/);
    assert.match(body, /document-reader-s3/);
  });
});

test('retired duplicate platform store manifest is absent', () => {
  assert.equal(existsSync(RETIRED_STORE_MANIFEST), false);
});

describe('content-bootstrap smoke contract', () => {
  const body = readFileSync(BOOTSTRAP_SMOKE, 'utf8');

  test('does not install store or admin secret', () => {
    assert.match(body, /install\.sh first/);
    assert.doesNotMatch(body, /store\.yaml/);
    assert.doesNotMatch(body, /create secret generic object-store-s3/);
  });

  test('create-only importer and guarded reader bootstrap', () => {
    assert.match(body, /decide-importer/);
    assert.match(body, /decide-reader/);
    assert.match(body, /create secret generic content-importer-s3/);
    assert.match(body, /Repair the partial reader state/);
    assert.match(body, /OFFSCREEN_CONTENT_BOOTSTRAP_FAULT_INJECTION/);
  });
});

describe('platform install boundary', () => {
  test('install.sh does not run object or content bootstrap smokes', () => {
    const body = readFileSync(INSTALL_SH, 'utf8');
    assert.match(body, /Does not run object-storage smoke/);
    assert.doesNotMatch(body, /content-bootstrap/);
  });
});

describe('runbooks match split ownership', () => {
  test('object storage runbook names install then smoke', () => {
    const body = readFileSync(OBJECT_RUNBOOK, 'utf8');
    assert.match(body, /infra\/platform\/object-storage\/install\.sh/);
    assert.doesNotMatch(
      body,
      /applies `infra\/platform\/object-storage\/store\.yaml`/,
    );
    assert.match(body, /OFFSCREEN_OBJECT_STORAGE_POD_DELETE_CONFIRM/);
  });

  test('content bootstrap runbook requires existing store', () => {
    const body = readFileSync(BOOTSTRAP_RUNBOOK, 'utf8');
    assert.match(body, /infra\/platform\/object-storage\/install\.sh/);
    assert.doesNotMatch(body, /applies the existing SeaweedFS store manifest/);
    assert.match(body, /create-only/i);
    assert.match(body, /content-importer-s3/);
  });
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
const RELEASE_INSTALL = join(
  REPO_ROOT,
  'infra/platform/object-storage/release-install.mjs',
);
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

  test('refuses before any write', () => {
    assert.match(
      body,
      /refusing retired object-storage smoke: this script no longer reads admin credentials, deletes a Pod, or writes objects\. The native SDK proof is the replacement and is not this script\./,
    );
    assert.doesNotMatch(body, /weed shell/);
    assert.doesNotMatch(body, /s3\.configure/);
    assert.doesNotMatch(body, /from-literal=.*secret-access-key/);
  });
});

describe('document-access smoke contract', () => {
  const body = readFileSync(DOCUMENT_ACCESS_SMOKE, 'utf8');

  test('refuses before any write', () => {
    assert.match(
      body,
      /refusing retired document-access smoke: this script no longer configures SeaweedFS users or copies admin credentials\. Document access scenarios stay gated until a scoped replacement proof exists\./,
    );
    assert.doesNotMatch(body, /weed shell/);
    assert.doesNotMatch(body, /s3\.configure/);
    assert.doesNotMatch(body, /from-literal=.*secret-access-key/);
  });
});

test('retired duplicate platform store manifest is absent', () => {
  assert.equal(existsSync(RETIRED_STORE_MANIFEST), false);
});

describe('content-bootstrap smoke contract', () => {
  const body = readFileSync(BOOTSTRAP_SMOKE, 'utf8');

  test('refuses before any write', () => {
    assert.match(
      body,
      /refusing retired content-bootstrap smoke: this script no longer configures SeaweedFS users or copies admin credentials\. Content scenarios stay gated until a scoped replacement proof exists\./,
    );
    assert.doesNotMatch(body, /weed shell/);
    assert.doesNotMatch(body, /s3\.configure/);
    assert.doesNotMatch(body, /from-literal=.*secret-access-key/);
  });
});

describe('platform install boundary', () => {
  test('install.sh does not run object or content bootstrap smokes', () => {
    const body = readFileSync(INSTALL_SH, 'utf8');
    assert.match(body, /Does not run object-storage smoke/);
    assert.doesNotMatch(body, /content-bootstrap/);
    assert.match(body, /providers\/seaweedfs\/install\.mjs/);
    assert.doesNotMatch(body, /release-install\.mjs/);
  });

  test('release-install.mjs refuses direct execution as main', () => {
    const result = spawnSync('node', [RELEASE_INSTALL], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /sole writer/);
    assert.equal(result.stdout, '');
  });
});

describe('runbooks match split ownership', () => {
  test('object storage runbook names install and gates smoke', () => {
    const body = readFileSync(OBJECT_RUNBOOK, 'utf8');
    assert.match(body, /infra\/platform\/object-storage\/install\.sh/);
    assert.doesNotMatch(
      body,
      /applies `infra\/platform\/object-storage\/store\.yaml`/,
    );
    assert.match(
      body,
      /infra\/verification\/smoke\/object-storage\/smoke\.sh.*(refuses|is not the current proof)/is,
    );
    assert.doesNotMatch(body, /OFFSCREEN_OBJECT_STORAGE_POD_DELETE_CONFIRM/);
  });

  test('content bootstrap runbook requires existing store and gates smoke', () => {
    const body = readFileSync(BOOTSTRAP_RUNBOOK, 'utf8');
    assert.match(body, /infra\/platform\/object-storage\/install\.sh/);
    assert.doesNotMatch(body, /applies the existing SeaweedFS store manifest/);
    assert.match(
      body,
      /infra\/verification\/release-acceptance\/content-bootstrap\/smoke\.sh.*(refuses|is not the current proof)/is,
    );
    assert.doesNotMatch(body, /s3\.configure/);
  });
});

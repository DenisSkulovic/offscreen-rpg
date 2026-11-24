import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderWorkloadDocuments } from '../../../workloads/render.mjs';
import {
  acceptedIdsFromKindImageIdentities,
  annotateMigrationJobManifest,
  apiImageSelectedInReleaseInstall,
  collectAcceptedMigrationImageIds,
  deleteMigrationJobWithUidPrecondition,
  digestFromPodImageId,
  ensureReleaseMigration,
  migrationJobsMatchKnownIdentity,
  migrationPhaseFromJob,
  parseLoaderReceipt,
  verifyCompletedMigrationExecution,
} from '../migration.mjs';

const CONFIG_DIGEST =
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const MANIFEST_DIGEST =
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const FOREIGN_DIGEST =
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const templateJob = renderWorkloadDocuments({
  profile: 'release',
  section: 'migration',
})[0];
const installSh = join(
  fileURLToPath(new URL('..', import.meta.url)),
  'install.sh',
);

/**
 * @param {object} options
 */
function buildStubRun(options) {
  const {
    jobState = 'absent',
    jobObject = null,
    deleteOk = true,
    createOk = true,
    waitOk = true,
    podImageId = `docker.io/library/offscreen-lab-app-release-api@turn02@${MANIFEST_DIGEST}`,
    jobAfterDelete = 'absent',
    finalJobAnnotation = CONFIG_DIGEST,
    finalJobSucceeded = true,
  } = options;

  /** @type {Array<{ command: string, args: string[], input?: string }>} */
  const invocations = [];
  let deleted = false;
  let created = false;

  const defaultJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-1',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': finalJobAnnotation },
    },
    status: finalJobSucceeded ? { succeeded: 1 } : { failed: 1 },
    spec: templateJob.spec,
  };

  /**
   * @param {string} command
   * @param {string[]} args
   * @param {{ input?: string }} [opts]
   */
  function run(command, args, opts = {}) {
    invocations.push({ command, args, input: opts.input });
    if (command !== 'kubectl') {
      return {
        ok: false,
        status: 1,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    const joined = args.join(' ');

    if (
      joined.includes('get') &&
      joined.includes('job') &&
      joined.includes('game-migrate') &&
      !joined.includes('pods')
    ) {
      if (jobState === 'unreadable') {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: 'denied',
          timedOut: false,
          missing: false,
        };
      }
      if (created || (jobState !== 'absent' && !deleted)) {
        const payload = created
          ? {
              ...defaultJob,
              metadata: {
                ...defaultJob.metadata,
                annotations: {
                  'offscreen.rpg/migration-image-id': finalJobAnnotation,
                },
              },
              status: { succeeded: 1 },
            }
          : (jobObject ?? defaultJob);
        return {
          ok: true,
          status: 0,
          stdout: `${JSON.stringify(payload)}\n`,
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (deleted && jobAfterDelete === 'absent') {
        return {
          ok: true,
          status: 0,
          stdout: '',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (jobState === 'absent' && !created) {
        return {
          ok: true,
          status: 0,
          stdout: '',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      const payload = jobObject ?? defaultJob;
      return {
        ok: true,
        status: 0,
        stdout: `${JSON.stringify(payload)}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (
      joined.includes(' delete --raw ') &&
      joined.includes('/jobs/game-migrate')
    ) {
      if (!deleteOk) {
        return {
          ok: false,
          status: 409,
          stdout: '',
          stderr: 'conflict',
          timedOut: false,
          missing: false,
        };
      }
      deleted = true;
      return {
        ok: true,
        status: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (joined.includes(' create ') && joined.includes('-f -')) {
      if (!createOk) {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      created = true;
      return {
        ok: true,
        status: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (joined.includes(' wait --for=condition=complete')) {
      if (!waitOk) {
        return {
          ok: false,
          status: 1,
          stdout: '',
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      return {
        ok: true,
        status: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    if (
      joined.includes(' get pods ') &&
      joined.includes('job-name=game-migrate')
    ) {
      return {
        ok: true,
        status: 0,
        stdout: JSON.stringify({
          items: [
            {
              status: {
                containerStatuses: [{ imageID: podImageId }],
              },
            },
          ],
        }),
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }

    return {
      ok: false,
      status: 2,
      stdout: '',
      stderr: 'unexpected',
      timedOut: false,
      missing: false,
    };
  }

  return { run, invocations, state: () => ({ deleted, created }) };
}

function renderedPath() {
  const dir = mkdtempSync(join(tmpdir(), 'release-migration-'));
  const path = join(dir, 'migration.yaml');
  writeFileSync(path, `---\n${JSON.stringify(templateJob)}\n`, 'utf8');
  return path;
}

const TARGET_DIGEST =
  'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const loaderReceipt = JSON.stringify({
  ref: 'offscreen-lab-app-release-api:turn02',
  digest: CONFIG_DIGEST,
  loadedNodes: [],
  reusedNodes: ['offscreen-lab-control-plane'],
  nodes: {
    'offscreen-lab-control-plane': {
      configId: CONFIG_DIGEST,
      manifestDigest: MANIFEST_DIGEST,
      targetDigest: TARGET_DIGEST,
    },
  },
});

const acceptedIds = () => [CONFIG_DIGEST, MANIFEST_DIGEST];

test('parseLoaderReceipt and digest helpers', () => {
  const receipt = parseLoaderReceipt(loaderReceipt);
  assert.equal(receipt.digest, CONFIG_DIGEST);
  assert.equal(
    receipt.nodes?.['offscreen-lab-control-plane']?.targetDigest,
    TARGET_DIGEST,
  );
  assert.throws(() => parseLoaderReceipt(''), /missing/);
  assert.throws(
    () =>
      parseLoaderReceipt(
        JSON.stringify({
          ref: 'offscreen-lab-app-release-api:turn02',
          digest: CONFIG_DIGEST,
          nodes: { bad: { configId: 'not-a-digest' } },
        }),
      ),
    /malformed/,
  );
  assert.equal(
    digestFromPodImageId(`docker.io/library/app@sha256:aaa@${MANIFEST_DIGEST}`),
    MANIFEST_DIGEST,
  );
  assert.equal(digestFromPodImageId('unknown'), null);
});

test('acceptedIdsFromKindImageIdentities ignores null identities', () => {
  assert.deepEqual(
    acceptedIdsFromKindImageIdentities([
      {
        configId: CONFIG_DIGEST,
        manifestDigest: MANIFEST_DIGEST,
        targetDigest: TARGET_DIGEST,
      },
      null,
    ]).sort(),
    [CONFIG_DIGEST, MANIFEST_DIGEST, TARGET_DIGEST].sort(),
  );
});

test('collectAcceptedMigrationImageIds uses verified kind identities', () => {
  const ref = 'offscreen-lab-app-release-api:turn02';
  const run = (command, args) => {
    if (command === 'docker' && args[0] === 'image' && args[1] === 'inspect') {
      return {
        ok: true,
        status: 0,
        stdout: `${CONFIG_DIGEST}\n`,
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'kind' && args.includes('get')) {
      return {
        ok: true,
        status: 0,
        stdout: 'node/offscreen-lab-control-plane\nnode/offscreen-lab-worker\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'docker' && args[0] === 'inspect') {
      return {
        ok: true,
        status: 0,
        stdout: 'offscreen-lab\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    if (command === 'docker' && args[0] === 'exec') {
      const joined = args.join('\0');
      if (joined.includes('images\0ls')) {
        return {
          ok: true,
          status: 0,
          stdout: `docker.io/library/${ref} application/vnd.docker.distribution.manifest.v2+json ${TARGET_DIGEST}\n`,
          stderr: '',
          timedOut: false,
          missing: false,
        };
      }
      if (joined.includes('content\0get')) {
        const digest = args.at(-1);
        if (digest === TARGET_DIGEST) {
          return {
            ok: true,
            status: 0,
            stdout: JSON.stringify({
              mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
              config: { digest: CONFIG_DIGEST },
            }),
            stderr: '',
            timedOut: false,
            missing: false,
          };
        }
      }
    }
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: '',
      timedOut: false,
      missing: false,
    };
  };
  const accepted = collectAcceptedMigrationImageIds(ref, run);
  assert.ok(accepted.includes(CONFIG_DIGEST));
  assert.ok(accepted.includes(TARGET_DIGEST));
  assert.equal(accepted.filter((id) => id === TARGET_DIGEST).length, 1);
});

test('apiImageSelectedInReleaseInstall', () => {
  assert.equal(apiImageSelectedInReleaseInstall('web,worker'), false);
  assert.equal(apiImageSelectedInReleaseInstall('api'), true);
});

test('absent Job with api selected creates without apply or delete', () => {
  const { run, invocations } = buildStubRun({ jobState: 'absent' });
  const receipt = ensureReleaseMigration({
    renderedYamlPath: renderedPath(),
    loaderReceipt,
    apiSelected: true,
    run,
    collectAcceptedIds: () => acceptedIds(),
  });
  assert.equal(receipt.action, 'created');
  assert.equal(receipt.mutations, 1);
  assert.equal(
    invocations.some((item) => item.args.includes('apply')),
    false,
  );
  assert.equal(
    invocations.filter((item) => item.args.includes('create')).length,
    1,
  );
  assert.equal(
    invocations.some((item) => item.args.includes('delete')),
    false,
  );
});

test('complete Job with matching digest reuses', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-1',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': CONFIG_DIGEST },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  const { run, invocations } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
  });
  const receipt = ensureReleaseMigration({
    renderedYamlPath: renderedPath(),
    loaderReceipt,
    apiSelected: true,
    run,
    collectAcceptedIds: () => acceptedIds(),
  });
  assert.equal(receipt.action, 'reused');
  assert.equal(receipt.mutations, 0);
  assert.equal(
    invocations.some((item) => item.args.includes('delete')),
    false,
  );
});

test('complete Job with different digest replaces via uid delete', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-2',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': FOREIGN_DIGEST },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  const { run, invocations } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
    jobAfterDelete: 'absent',
  });
  const receipt = ensureReleaseMigration({
    renderedYamlPath: renderedPath(),
    loaderReceipt,
    apiSelected: true,
    run,
    collectAcceptedIds: () => acceptedIds(),
  });
  assert.equal(receipt.action, 'replaced-digest');
  assert.equal(receipt.mutations, 2);
  const deleteCall = invocations.find((item) => item.args.includes('delete'));
  assert.ok(deleteCall?.input?.includes('job-uid-2'));
  assert.equal(
    invocations.filter((item) => item.args.includes('create')).length,
    1,
  );
});

test('running Job refuses without delete', () => {
  const runningJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-3',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
    },
    status: { active: 1 },
    spec: templateJob.spec,
  };
  const { run, invocations } = buildStubRun({
    jobState: 'present',
    jobObject: runningJob,
  });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /still running/,
  );
  assert.equal(
    invocations.some((item) => item.args.includes('delete')),
    false,
  );
  assert.equal(migrationPhaseFromJob(runningJob), 'running');
});

test('failed Job refuses', () => {
  const failedJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
    },
    status: { failed: 1 },
    spec: templateJob.spec,
  };
  const { run } = buildStubRun({ jobState: 'present', jobObject: failedJob });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /failed/,
  );
});

test('foreign Job refuses', () => {
  const foreignJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      labels: { app: 'game-migrate' },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  const { run } = buildStubRun({ jobState: 'present', jobObject: foreignJob });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /foreign/,
  );
});

test('unreadable Job refuses', () => {
  const { run } = buildStubRun({ jobState: 'unreadable' });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /unreadable/,
  );
});

test('delete precondition failure refuses', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-race',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': FOREIGN_DIGEST },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  const { run } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
    deleteOk: false,
  });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /delete/,
  );
});

test('delete race leaves Job present and refuses create', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-race2',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': FOREIGN_DIGEST },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  const { run } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
    jobAfterDelete: 'present',
  });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /still present after delete/,
  );
});

test('legacy complete Job without annotation replaces when identity matches', () => {
  const legacyJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-legacy',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
    },
    status: { succeeded: 1 },
    spec: templateJob.spec,
  };
  assert.equal(migrationJobsMatchKnownIdentity(legacyJob, templateJob), true);
  const annotated = annotateMigrationJobManifest(templateJob, CONFIG_DIGEST);
  assert.equal(
    annotated.metadata.annotations['offscreen.rpg/migration-image-id'],
    CONFIG_DIGEST,
  );
  const { run } = buildStubRun({
    jobState: 'present',
    jobObject: legacyJob,
    jobAfterDelete: 'absent',
  });
  const receipt = ensureReleaseMigration({
    renderedYamlPath: renderedPath(),
    loaderReceipt,
    apiSelected: true,
    run,
    collectAcceptedIds: () => acceptedIds(),
  });
  assert.equal(receipt.action, 'replaced-legacy');
});

test('legacy complete Job with unknown identity refuses', () => {
  const unknownJob = structuredClone(templateJob);
  unknownJob.metadata = {
    name: 'game-migrate',
    namespace: 'lab-edge',
    uid: 'job-uid-unknown',
    labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
  };
  unknownJob.status = { succeeded: 1 };
  unknownJob.spec.template.spec.containers[0].image = 'foreign:tag';
  const { run } = buildStubRun({ jobState: 'present', jobObject: unknownJob });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        loaderReceipt,
        apiSelected: true,
        run,
        collectAcceptedIds: () => acceptedIds(),
      }),
    /unknown identity/,
  );
});

test('non-api warm install observes complete Job only', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
    },
    status: { succeeded: 1 },
  };
  const { run, invocations } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
  });
  const receipt = ensureReleaseMigration({
    renderedYamlPath: renderedPath(),
    apiSelected: false,
    run,
  });
  assert.equal(receipt.action, 'observed');
  assert.equal(
    invocations.some(
      (item) => item.args.includes('create') || item.args.includes('delete'),
    ),
    false,
  );
});

test('non-api install refuses absent Job', () => {
  const { run } = buildStubRun({ jobState: 'absent' });
  assert.throws(
    () =>
      ensureReleaseMigration({
        renderedYamlPath: renderedPath(),
        apiSelected: false,
        run,
      }),
    /absent/,
  );
});

test('verifyCompletedMigrationExecution rejects unknown pod image', () => {
  const completeJob = {
    metadata: {
      name: 'game-migrate',
      namespace: 'lab-edge',
      uid: 'job-uid-verify',
      labels: { app: 'game-migrate', 'offscreen.rpg/lab': 'disposable' },
      annotations: { 'offscreen.rpg/migration-image-id': CONFIG_DIGEST },
    },
    status: { succeeded: 1 },
  };
  const { run } = buildStubRun({
    jobState: 'present',
    jobObject: completeJob,
    podImageId:
      'docker.io/library/app@sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  });
  assert.throws(
    () => verifyCompletedMigrationExecution(run, CONFIG_DIGEST, acceptedIds()),
    /unknown/,
  );
});

test('deleteMigrationJobWithUidPrecondition uses raw delete body', () => {
  const invocations = [];
  const run = (command, args, opts = {}) => {
    invocations.push({ command, args, input: opts.input });
    return {
      ok: true,
      status: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
      missing: false,
    };
  };
  deleteMigrationJobWithUidPrecondition(run, 'kind-offscreen-lab', 'uid-xyz');
  const deleteCall = invocations[0];
  assert.match(deleteCall.args.join(' '), /delete --raw/);
  assert.match(deleteCall.input ?? '', /uid-xyz/);
});

test('install.sh passes bash -n', () => {
  const result = spawnSync('bash', ['-n', installSh], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

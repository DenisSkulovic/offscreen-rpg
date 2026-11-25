import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureKindImage,
  manifestConfigDigestFromObject,
  normalizeNodeArchitecture,
  parseCtrDigest,
  readKindImageIdentity,
  resolveManifestDigestFromIndex,
  sortKindNodes,
  validateRefForProfile,
} from './kind-image-loader.mjs';

const CONFIG_A =
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CONFIG_B =
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const MANIFEST_M =
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const MANIFEST_N =
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const TARGET_T =
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const TARGET_U =
  'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const INDEX_I =
  'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const RELEASE_REF = 'offscreen-lab-app-release-api:turn02';
const RELEASE_CTR = 'docker.io/library/offscreen-lab-app-release-api:turn02';
const NODE_CP = 'offscreen-release-control-plane';
const NODE_WORKER = 'offscreen-release-worker';

/**
 * @param {string} configDigest
 */
function ociManifestJson(configDigest) {
  return JSON.stringify({
    mediaType: 'application/vnd.oci.image.manifest.v1+json',
    config: { digest: configDigest },
  });
}

/**
 * @param {Array<{ digest: string, os?: string, architecture?: string, artifactType?: string, mediaType?: string }>} entries
 */
function ociIndexJson(entries) {
  return JSON.stringify({
    mediaType: 'application/vnd.oci.image.index.v1+json',
    manifests: entries.map((entry) => ({
      mediaType:
        entry.mediaType ?? 'application/vnd.oci.image.manifest.v1+json',
      digest: entry.digest,
      platform: entry.os
        ? { os: entry.os, architecture: entry.architecture ?? 'amd64' }
        : undefined,
      ...(entry.artifactType ? { artifactType: entry.artifactType } : {}),
    })),
  });
}

/**
 * @param {Record<string, Partial<Record<string, RunScript>>>} scripts
 */
function makeRunner(scripts) {
  /** @type {Array<{ command: string, args: string[] }>} */
  const calls = [];
  /**
   * @typedef {{ status?: number, stdout?: string, stderr?: string }} RunScript
   */

  const run = (command, args) => {
    calls.push({ command, args: [...args] });
    const key = scripts[command]?.[args.join('\0')];
    if (key) {
      return {
        status: key.status ?? 0,
        stdout: key.stdout ?? '',
        stderr: key.stderr ?? '',
        signal: null,
      };
    }
    const joined = args.join('\0');
    const prefixKey = Object.keys(scripts[command] ?? {}).find((candidate) => {
      if (candidate === 'load' && command === 'kind' && args[0] === 'load') {
        return true;
      }
      return joined.startsWith(candidate);
    });
    if (prefixKey) {
      const entry = scripts[command][prefixKey];
      return {
        status: entry?.status ?? 0,
        stdout: entry?.stdout ?? '',
        stderr: entry?.stderr ?? '',
        signal: null,
      };
    }
    return { status: 1, stdout: '', stderr: 'unmocked', signal: null };
  };

  return { run, calls };
}

/**
 * @param {{
 *   controlTarget?: string | null,
 *   workerTarget?: string | null,
 *   configId?: string,
 *   hostId?: string,
 *   indexTarget?: string,
 *   indexManifest?: string,
 * }} opts
 */
function releaseNodeScripts(opts = {}) {
  const configId = opts.configId ?? CONFIG_A;
  const controlTarget = Object.hasOwn(opts, 'controlTarget')
    ? opts.controlTarget
    : TARGET_T;
  const workerTarget = Object.hasOwn(opts, 'workerTarget')
    ? opts.workerTarget
    : TARGET_T;
  const hostId = opts.hostId ?? opts.indexTarget ?? TARGET_T;
  const ctrLine = (target) =>
    target ? `${RELEASE_CTR} ${RELEASE_CTR} ${target} \n` : '';

  /** @type {Record<string, RunScript>} */
  const docker = {
    [`image\0inspect\0--format\0{{.Id}}\0${RELEASE_REF}`]: {
      stdout: `${hostId}\n`,
    },
    [`inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0${NODE_CP}`]:
      {
        stdout: 'offscreen-release\n',
      },
    [`inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0${NODE_WORKER}`]:
      {
        stdout: 'offscreen-release\n',
      },
    [`inspect\0--format\0{{.ImageManifestDescriptor.platform.os}}\0${NODE_CP}`]: { stdout: 'linux\n' },
    [`inspect\0--format\0{{.ImageManifestDescriptor.platform.architecture}}\0${NODE_CP}`]: {
      stdout: 'x86_64\n',
    },
    [`inspect\0--format\0{{.ImageManifestDescriptor.platform.os}}\0${NODE_WORKER}`]: { stdout: 'linux\n' },
    [`inspect\0--format\0{{.ImageManifestDescriptor.platform.architecture}}\0${NODE_WORKER}`]: {
      stdout: 'x86_64\n',
    },
    [`exec\0${NODE_CP}\0ctr\0-n\0k8s.io\0images\0ls`]: {
      stdout: ctrLine(controlTarget),
    },
    [`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`]: {
      stdout: ctrLine(workerTarget),
    },
  };

  /**
   * @param {string} digest
   * @param {string} body
   * @param {string[]} nodes
   */
  const addContent = (digest, body, nodes) => {
    for (const node of nodes) {
      docker[`exec\0${node}\0ctr\0-n\0k8s.io\0content\0get\0${digest}`] = {
        stdout: body,
      };
    }
  };

  if (opts.indexTarget && opts.indexManifest) {
    addContent(
      opts.indexTarget,
      ociIndexJson([
        {
          digest: opts.indexManifest,
          os: 'linux',
          architecture: 'amd64',
        },
        {
          digest: MANIFEST_N,
          artifactType: 'application/vnd.oci.attestation.v1+json',
        },
      ]),
      [NODE_CP, NODE_WORKER],
    );
    addContent(opts.indexManifest, ociManifestJson(configId), [
      NODE_CP,
      NODE_WORKER,
    ]);
    docker[`exec\0${NODE_CP}\0ctr\0-n\0k8s.io\0images\0ls`].stdout = ctrLine(
      opts.indexTarget,
    );
    docker[`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`].stdout =
      ctrLine(opts.indexTarget);
  } else {
    const manifestBody = ociManifestJson(configId);
    if (controlTarget) {
      addContent(controlTarget, manifestBody, [NODE_CP]);
    }
    if (workerTarget) {
      addContent(workerTarget, manifestBody, [NODE_WORKER]);
    }
  }

  return {
    kind: {
      'get\0nodes\0--name\0offscreen-release': {
        stdout: `node/${NODE_CP}\nnode/${NODE_WORKER}\n`,
      },
      load: { status: 0, stdout: '', stderr: '' },
    },
    docker,
  };
}

test('sortKindNodes orders control-plane before worker then lexical', () => {
  assert.deepEqual(
    sortKindNodes(
      [
        'offscreen-release-worker',
        'offscreen-release-control-plane',
        'offscreen-release-worker-b',
      ],
      'offscreen-release',
    ),
    [
      'offscreen-release-control-plane',
      'offscreen-release-worker',
      'offscreen-release-worker-b',
    ],
  );
});

test('parseCtrDigest rejects duplicate rows and malformed digests', () => {
  const ref = RELEASE_CTR;
  assert.equal(parseCtrDigest(`${ref} x ${TARGET_T}\n`, ref), TARGET_T);
  assert.throws(
    () => parseCtrDigest(`${ref} x ${TARGET_T}\n${ref} y ${TARGET_U}\n`, ref),
    /ambiguous duplicate rows/,
  );
  assert.throws(
    () => parseCtrDigest(`${ref} x sha256:bad\n`, ref),
    /malformed node digest/,
  );
});

test('normalizeNodeArchitecture maps common aliases', () => {
  assert.equal(normalizeNodeArchitecture('x86_64'), 'amd64');
  assert.equal(normalizeNodeArchitecture('aarch64'), 'arm64');
  assert.equal(normalizeNodeArchitecture('arm64'), 'arm64');
});

test('manifestConfigDigestFromObject requires manifest media type and config digest', () => {
  assert.equal(
    manifestConfigDigestFromObject({
      mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: { digest: CONFIG_A },
    }),
    CONFIG_A,
  );
  assert.throws(
    () =>
      manifestConfigDigestFromObject({
        mediaType: 'application/vnd.oci.image.index.v1+json',
        manifests: [],
      }),
    /unsupported media type/,
  );
});

test('resolveManifestDigestFromIndex excludes attestations and requires one platform match', () => {
  const index = ociIndexJson([
    { digest: MANIFEST_M, os: 'linux', architecture: 'amd64' },
    {
      digest: MANIFEST_N,
      artifactType: 'application/vnd.oci.attestation.v1+json',
    },
    { digest: TARGET_U, os: 'linux', architecture: 'arm64' },
  ]);
  assert.equal(
    resolveManifestDigestFromIndex(index, 'linux', 'x86_64'),
    MANIFEST_M,
  );
  assert.throws(
    () =>
      resolveManifestDigestFromIndex(
        ociIndexJson([
          { digest: MANIFEST_M, os: 'linux', architecture: 'arm64' },
          { digest: TARGET_U, os: 'linux', architecture: 'arm64' },
        ]),
        'linux',
        'amd64',
      ),
    /no manifest for node platform/,
  );
  assert.throws(
    () =>
      resolveManifestDigestFromIndex(
        ociIndexJson([
          { digest: MANIFEST_M, os: 'linux', architecture: 'amd64' },
          { digest: MANIFEST_N, os: 'linux', architecture: 'amd64' },
        ]),
        'linux',
        'amd64',
      ),
    /ambiguous image index manifests/,
  );
});

test('readKindImageIdentity returns null when ref absent on node', () => {
  const { run } = makeRunner(
    releaseNodeScripts({ controlTarget: null, workerTarget: null }),
  );
  assert.equal(
    readKindImageIdentity({ node: NODE_CP, ref: RELEASE_REF, run }),
    null,
  );
});

test('readKindImageIdentity resolves index to config distinct from target digest', () => {
  const { run } = makeRunner(
    releaseNodeScripts({
      indexTarget: INDEX_I,
      indexManifest: MANIFEST_M,
      configId: CONFIG_A,
    }),
  );
  const identity = readKindImageIdentity({
    node: NODE_CP,
    ref: RELEASE_REF,
    run,
  });
  assert.deepEqual(identity, {
    configId: CONFIG_A,
    manifestDigest: MANIFEST_M,
    targetDigest: INDEX_I,
  });
  assert.notEqual(identity?.targetDigest, identity?.configId);
});

test('validateRefForProfile rejects cross-profile families', () => {
  assert.equal(validateRefForProfile('release', RELEASE_REF), RELEASE_REF);
  assert.throws(
    () =>
      validateRefForProfile(
        'release',
        'offscreen-dev-workspace:union-0123456789abcdef',
      ),
    /cross-profile/,
  );
  assert.throws(
    () => validateRefForProfile('dev', RELEASE_REF),
    /cross-profile/,
  );
});

test('validateRefForProfile rejects retired legacy dev workspace tags', () => {
  assert.throws(
    () => validateRefForProfile('dev', 'offscreen-lab-dev-workspace:dxk08'),
    /not accepted for dev profile/,
  );
});

test('Docker 29 index id matches containerd target and differs from config digest', () => {
  const { run, calls } = makeRunner(
    releaseNodeScripts({
      indexTarget: INDEX_I,
      indexManifest: MANIFEST_M,
      configId: CONFIG_A,
      hostId: INDEX_I,
    }),
  );
  const receipt = ensureKindImage({
    profileId: 'release',
    ref: RELEASE_REF,
    run,
  });
  assert.equal(receipt.digest, INDEX_I);
  assert.equal(receipt.nodes[NODE_CP].targetDigest, INDEX_I);
  assert.equal(receipt.nodes[NODE_CP].manifestDigest, MANIFEST_M);
  assert.equal(receipt.nodes[NODE_CP].configId, CONFIG_A);
  assert.notEqual(receipt.nodes[NODE_CP].configId, receipt.digest);
  assert.deepEqual(receipt.loadedNodes, []);
  assert.deepEqual(receipt.reusedNodes, [NODE_CP, NODE_WORKER]);
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('one stale worker loads only that node', () => {
  const workerCtr = { stdout: '' };
  const scripts = releaseNodeScripts({
    controlTarget: TARGET_T,
    workerTarget: null,
  });
  scripts.docker[`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`] =
    workerCtr;
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    if (command === 'kind' && args[0] === 'load') {
      workerCtr.stdout = `${RELEASE_CTR} ${RELEASE_CTR} ${TARGET_T} \n`;
      scripts.docker[
        `exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0content\0get\0${TARGET_T}`
      ] = {
        stdout: ociManifestJson(CONFIG_A),
      };
    }
    return run(command, args);
  };
  const receipt = ensureKindImage({
    profileId: 'release',
    ref: RELEASE_REF,
    run: trackingRun,
  });
  assert.deepEqual(receipt.loadedNodes, [NODE_WORKER]);
  assert.deepEqual(receipt.reusedNodes, [NODE_CP]);
  assert.equal(receipt.nodes[NODE_WORKER].targetDigest, TARGET_T);
  assert.equal(receipt.nodes[NODE_WORKER].configId, CONFIG_A);
  assert.notEqual(receipt.digest, CONFIG_A);
  assert.equal(
    calls.filter((call) => call.command === 'kind' && call.args[0] === 'load')
      .length,
    1,
  );
});

test('missing worker in inventory refuses before mutation', () => {
  const { run, calls } = makeRunner({
    kind: {
      'get\0nodes\0--name\0offscreen-release': {
        stdout: `node/${NODE_CP}\n`,
      },
      load: { status: 0 },
    },
    docker: {
      [`image\0inspect\0--format\0{{.Id}}\0${RELEASE_REF}`]: {
        stdout: `${TARGET_T}\n`,
      },
    },
  });
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /node count/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('post-load mismatch refuses when node target digest is wrong', () => {
  const scripts = releaseNodeScripts({
    controlTarget: TARGET_T,
    workerTarget: null,
    hostId: TARGET_T,
  });
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    const result = run(command, args);
    if (command === 'kind' && args[0] === 'load') {
      scripts.docker[`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`] = {
        stdout: `${RELEASE_CTR} ${RELEASE_CTR} ${TARGET_U} \n`,
      };
      scripts.docker[
        `exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0content\0get\0${TARGET_U}`
      ] = {
        stdout: ociManifestJson(CONFIG_A),
      };
    }
    return result;
  };
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run: trackingRun,
      }),
    /post-load-mismatch/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind'),
    true,
  );
});

test('changed host digest before load refuses', () => {
  let hostReads = 0;
  const workerCtr = { stdout: '' };
  const scripts = releaseNodeScripts({
    controlTarget: TARGET_T,
    workerTarget: null,
  });
  scripts.docker[`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`] =
    workerCtr;
  const { run, calls } = makeRunner(scripts);
  const trackingRun = (command, args) => {
    if (command === 'docker' && args[0] === 'image' && args[1] === 'inspect') {
      hostReads += 1;
      if (hostReads === 2) {
        return { status: 0, stdout: `${CONFIG_B}\n`, stderr: '', signal: null };
      }
    }
    return run(command, args);
  };
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run: trackingRun,
      }),
    /host image digest changed before load/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('malformed expected digest refuses', () => {
  const { run } = makeRunner(releaseNodeScripts());
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        expectedDigest: 'sha256:bad',
        run,
      }),
    /malformed expected digest/,
  );
});

test('failed docker inspect refuses before load', () => {
  const scripts = releaseNodeScripts();
  scripts.docker[`exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0images\0ls`] = {
    status: 1,
  };
  const { run, calls } = makeRunner(scripts);
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /node image inspect failed/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('unreadable ctr content refuses before load', () => {
  const scripts = releaseNodeScripts();
  scripts.docker[
    `exec\0${NODE_WORKER}\0ctr\0-n\0k8s.io\0content\0get\0${TARGET_T}`
  ] = {
    status: 1,
  };
  const { run, calls } = makeRunner(scripts);
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /node image content unreadable/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

test('foreign docker label refuses before load', () => {
  const scripts = releaseNodeScripts();
  scripts.docker[
    `inspect\0--format\0{{index .Config.Labels "io.x-k8s.kind.cluster"}}\0${NODE_WORKER}`
  ] = { stdout: 'other-cluster\n' };
  const { run, calls } = makeRunner(scripts);
  assert.throws(
    () =>
      ensureKindImage({
        profileId: 'release',
        ref: RELEASE_REF,
        run,
      }),
    /foreign cluster label/,
  );
  assert.equal(
    calls.some((call) => call.command === 'kind' && call.args[0] === 'load'),
    false,
  );
});

import { createHash } from 'node:crypto';
import { matchesRuntimeImageDigest } from './kind-image-loader.mjs';

test('runtime import wrapper proves exact target by content hash, not alias name', () => {
  const expected = 'sha256:' + 'b'.repeat(64);
  const foreign = 'sha256:' + 'c'.repeat(64);
  const index = 'application/vnd.oci.image.index.v1+json';
  const node = 'offscreen-release-worker';
  const check = (children, tampered = false, scheduledNode = node) => {
    const bytes = JSON.stringify({ schemaVersion: 2, mediaType: index,
      manifests: children.map(digest => ({ mediaType: index, digest, size: 856 })) });
    const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
    return matchesRuntimeImageDigest({
      profileId: 'release', node: scheduledNode, observedDigest: digest,
      expectedDigest: expected, acceptedIds: [expected],
      run(command, args) {
        if (command === 'kind') return { status: 0, stdout: 'offscreen-release-control-plane\noffscreen-release-worker\n' };
        if (args[0] === 'inspect') return { status: 0, stdout: 'offscreen-release' };
        if (args[0] === 'exec' && args.at(-1) === digest) return { status: 0, stdout: tampered ? bytes + ' ' : bytes };
        return { status: 1, stdout: '' };
      },
    });
  };
  assert.equal(check([expected]), true);
  assert.equal(check([foreign]), false);
  assert.equal(check([expected, foreign]), false);
  assert.equal(check([expected], true), false);
  assert.equal(check([expected], false, 'offscreen-dev-worker'), false);
});

import { releaseGenerationRef } from './kind-image-loader.mjs';
test('release generation references use full digest and preserve repository family', () => {
  const d = 'sha256:' + 'a'.repeat(64);
  const alias = 'offscreen-lab-content-bootstrap:boot02';
  const generation = releaseGenerationRef(alias, d);
  assert.equal(generation, 'offscreen-lab-content-bootstrap:sha256-' + 'a'.repeat(64));
  assert.equal(validateRefForProfile('release', generation), generation);
  assert.throws(() => validateRefForProfile('dev', generation));
  assert.throws(() => releaseGenerationRef(alias, 'sha256:bad'));
  assert.notEqual(generation, releaseGenerationRef(alias, 'sha256:' + 'b'.repeat(64)));
});

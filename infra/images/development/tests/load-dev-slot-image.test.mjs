import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  fingerprintDevImageContext,
  UNION_ROLE_FILTER,
  verifyDevImageFingerprintHint,
} from '../image-plan.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const slotLoader = join(
  repoRoot,
  'infra/images/development/load-dev-slot-image.sh',
);
const tiltfile = readFileSync(join(repoRoot, 'Tiltfile'), 'utf8');

function runTiltRef(ref, env = {}) {
  return spawnSync('bash', [slotLoader, '--tilt-ref', ref], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function verifiedFingerprint() {
  const result = fingerprintDevImageContext(repoRoot, {
    roleFilter: UNION_ROLE_FILTER,
  });
  assert.equal(result.ok, true);
  return result.fingerprint;
}

function installFakes(
  root,
  { cachedFingerprint = null, driftOnBuild = false } = {},
) {
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const mark = join(root, 'fingerprint.mark');
  const counter = join(root, 'build.count');
  const canonicalRef = join(root, 'canonical.ref');
  const fpCounter = join(root, 'fingerprint.calls');
  if (cachedFingerprint) {
    writeFileSync(mark, cachedFingerprint);
    writeFileSync(
      canonicalRef,
      `offscreen-dev-workspace:union-${cachedFingerprint.slice(0, 16)}`,
    );
  }
  writeFileSync(fpCounter, '0');
  writeFileSync(
    join(bin, 'node'),
    `#!/bin/bash
if [[ "\${1:-}" == *kind-image-loader.mjs ]]; then
  if [[ "\$2" == "inspect" ]]; then
    echo '{"configId":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","manifestDigest":"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","targetDigest":"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}'
    exit 0
  fi
  ref="\$3"
  echo "{\\"ref\\":\\"\$ref\\",\\"digest\\":\\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\",\\"loadedNodes\\":[],\\"reusedNodes\\":[\\"cp\\",\\"worker\\"]}"
  exit 0
fi
if [[ "\${1:-}" == --input-type=module && "\$*" == *fingerprintDevImageContext* ]]; then
  count=\$(($(cat "${fpCounter}") + 1))
  echo "\$count" > "${fpCounter}"
  if [[ "${driftOnBuild}" == true && "\$count" -gt 1 ]]; then
    echo drifted-fingerprint-0000000000000000000000000000000000000000000000000000000000000001
    exit 0
  fi
fi
exec "\${OFFSCREEN_REAL_NODE}" "$@"
`,
  );
  writeFileSync(
    join(bin, 'docker'),
    `#!/bin/bash
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  ref=""
  for arg in "$@"; do
    if [[ "\$arg" == offscreen-dev-workspace:* ]]; then ref="\$arg"; fi
  done
  if [[ "$*" == *offscreen.fingerprint* ]]; then
    if [[ -f "${mark}" && "\$ref" == offscreen-dev-workspace:union-* && "\$ref" != offscreen-dev-workspace:union-build-* ]]; then
      cat "${mark}"
    fi
    exit 0
  fi
  echo sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  exit 0
fi
if [[ "$1" == "build" ]]; then
  echo 1 >> "${counter}"
  label=""
  tag=""
  args=("$@")
  i=0
  while [[ $i -lt \${#args[@]} ]]; do
    case "\${args[$i]}" in
      --label)
        i=$((i + 1))
        label="\${args[$i]}"
        ;;
      -t)
        i=$((i + 1))
        tag="\${args[$i]}"
        ;;
    esac
    i=$((i + 1))
  done
  if [[ "\$label" == offscreen.fingerprint=* ]]; then
    printf '%s' "\${label#offscreen.fingerprint=}" > "${mark}"
  fi
  if [[ "\$tag" == offscreen-dev-workspace:union-build-* ]]; then
    printf '%s' "\$tag" > "${canonicalRef}"
  fi
  exit 0
fi
if [[ "$1" == "tag" ]]; then
  printf '%s' "$4" > "${canonicalRef}"
  exit 0
fi
if [[ "$1" == "rmi" ]]; then exit 0; fi
if [[ "$1" == "exec" && "$*" == *"images ls"* ]]; then
  for r in \\
    offscreen-dev-workspace:union-same-fp-abcdefgh \\
    offscreen-dev-workspace:dev-2-authority \\
    offscreen-dev-workspace:dev-3-api \\
    offscreen-dev-workspace:dev-4-web; do
    printf 'docker.io/library/%s application/vnd.oci.image.index.v1+json sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n' "$r"
  done
  exit 0
fi
exit 0
`,
  );
  writeFileSync(join(bin, 'kind'), '#!/bin/bash\nexit 0\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'docker'), 0o755);
  chmodSync(join(bin, 'kind'), 0o755);
  return { bin, counter, mark };
}

function installFingerprintFailFakes(root) {
  const base = installFakes(root);
  const nodePath = join(base.bin, 'node');
  const prior = readFileSync(nodePath, 'utf8');
  writeFileSync(
    nodePath,
    prior.replace(
      'exec "${OFFSCREEN_REAL_NODE}" "$@"',
      `if [[ "\${1:-}" == --input-type=module && "\$*" == *fingerprintDevImageContext* ]]; then
  echo refusing-fingerprint >&2
  exit 2
fi
exec "\${OFFSCREEN_REAL_NODE}" "$@"`,
    ),
  );
  chmodSync(nodePath, 0o755);
  return base;
}

test('dev Tiltfile uses worktree-scoped receipt paths and shared rebuild inputs', () => {
  assert.match(
    tiltfile,
    /\.offscreen\/tilt-image-refs\/' \+ OFFSCREEN_DEV_SLOT \+ '\//,
  );
  assert.match(readFileSync(slotLoader, 'utf8'), /--tilt-ref/);
  assert.doesNotMatch(tiltfile, /TURBO_FILTER_BY_IMAGE/);
  assert.match(tiltfile, /rebuild_paths_by_image/);
  assert.match(tiltfile, /--tilt-ref /);
  assert.match(tiltfile, /deps=rebuild_deps/);
  assert.doesNotMatch(tiltfile, /\/tmp\/offscreen-tilt-image-ref-/);
});

test('tilt-ref refuses slot ref that does not match OFFSCREEN_DEV_SLOT', () => {
  const receipt = join(repoRoot, '.offscreen/tilt-image-refs/dev-2/web.ref');
  mkdirSync(dirname(receipt), { recursive: true });
  writeFileSync(receipt, 'stale-ref\n');
  const result = runTiltRef('offscreen-dev-workspace:dev-2-web', {
    OFFSCREEN_DEV_SLOT: 'dev-3',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing slot ref/);
  assert.equal(readFileSync(receipt, 'utf8'), 'stale-ref\n');
});

test('tilt-ref refuses legacy dev workspace refs before docker', () => {
  const result = runTiltRef('offscreen-lab-dev-workspace:dxk08-api', {
    OFFSCREEN_DEV_SLOT: 'dev-2',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing legacy dev workspace ref/);
});

test('tilt-ref refuses malformed slot refs without valid OFFSCREEN_DEV_SLOT', () => {
  const result = runTiltRef('offscreen-dev-workspace:dev-2-typo', {
    OFFSCREEN_DEV_SLOT: 'unassigned',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /without valid OFFSCREEN_DEV_SLOT/);
});

test('tilt-ref refuses release refs with no cross-profile fallback', () => {
  const result = runTiltRef('offscreen-lab-game-web:turn02', {
    OFFSCREEN_DEV_SLOT: 'dev-2',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing ref/);
});

test('tilt-ref rejects unknown refs with no cross-profile fallback', () => {
  const result = runTiltRef('offscreen-lab-game-web:turn02');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing ref/);
});

test('slot loader refuses invalid roles before any build', () => {
  const result = spawnSync('bash', [slotLoader, 'dev-2', 'bogus'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing role/);
});

test('source change recomputes fingerprint for tilt rebuilds', () => {
  const lock = join(repoRoot, 'pnpm-lock.yaml');
  const original = readFileSync(lock, 'utf8');
  const first = fingerprintDevImageContext(repoRoot, {
    roleFilter: UNION_ROLE_FILTER,
  });
  assert.equal(first.ok, true);
  writeFileSync(lock, `${original}# fingerprint probe\n`);
  const changed = fingerprintDevImageContext(repoRoot, {
    roleFilter: UNION_ROLE_FILTER,
  });
  writeFileSync(lock, original);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.fingerprint, first.fingerprint);
});

test('valid tilt-ref clears own receipt before work; failure leaves no success file', () => {
  const root = mkdtempSync(join(tmpdir(), 'receipt-fail-'));
  const receipt = join(repoRoot, '.offscreen/tilt-image-refs/dev-2/web.ref');
  mkdirSync(dirname(receipt), { recursive: true });
  writeFileSync(receipt, 'stale-ref\n');
  const { bin } = installFingerprintFailFakes(root);
  const result = runTiltRef('offscreen-dev-workspace:dev-2-web', {
    OFFSCREEN_DEV_SLOT: 'dev-2',
    PATH: `${bin}:${process.env.PATH}`,
    OFFSCREEN_REAL_NODE: execPath,
    TMPDIR: root,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing-fingerprint/);
  assert.equal(existsSync(receipt), false);
});

test('authority tilt-ref targets game-authority receipt path', () => {
  const script = readFileSync(slotLoader, 'utf8');
  assert.match(script, /game-authority/);
  const receipt = join(
    repoRoot,
    '.offscreen/tilt-image-refs/dev-2/game-authority.ref',
  );
  mkdirSync(dirname(receipt), { recursive: true });
  writeFileSync(receipt, 'stale-ref\n');
  const root = mkdtempSync(join(tmpdir(), 'receipt-ga-'));
  const fingerprint = verifiedFingerprint();
  const { bin } = installFakes(root, { cachedFingerprint: fingerprint });
  const result = runTiltRef('offscreen-dev-workspace:dev-2-authority', {
    OFFSCREEN_DEV_SLOT: 'dev-2',
    PATH: `${bin}:${process.env.PATH}`,
    OFFSCREEN_REAL_NODE: execPath,
    OFFSCREEN_IMAGE_FINGERPRINT: fingerprint,
    TMPDIR: root,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(receipt), true);
  assert.equal(readFileSync(receipt, 'utf8').trim(), `offscreen-dev-workspace:union-${fingerprint.slice(0, 16)}`);
});

test('two slots write separate receipt paths', () => {
  assert.notEqual(
    tiltfile.includes("OFFSCREEN_DEV_SLOT + '/' + image_key"),
    false,
  );
  const left = join(repoRoot, '.offscreen/tilt-image-refs/dev-2/web.ref');
  const right = join(repoRoot, '.offscreen/tilt-image-refs/dev-3/web.ref');
  assert.notEqual(left, right);
});

test('concurrent role loads build the shared artifact once under fake toolchain', () => {
  const root = mkdtempSync(join(tmpdir(), 'img-reuse-'));
  const fingerprint = verifiedFingerprint();
  const { bin, counter } = installFakes(root);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    OFFSCREEN_REAL_NODE: execPath,
    OFFSCREEN_IMAGE_FINGERPRINT: fingerprint,
    TMPDIR: root,
  };
  const run = (slot, role) =>
    spawnSync('bash', [slotLoader, slot, role], {
      cwd: repoRoot,
      encoding: 'utf8',
      env,
    });
  const left = run('dev-3', 'api');
  const right = run('dev-4', 'web');
  assert.equal(left.status, 0, left.stderr);
  assert.equal(right.status, 0, right.stderr);
  const builds = `${left.stdout}\n${right.stdout}`.match(/builds=1/g) ?? [];
  assert.equal(builds.length, 1);
  assert.match(`${left.stdout}${right.stdout}`, /builds=0/);
  assert.equal(readFileSync(counter, 'utf8').trim().split('\n').length, 1);
});

test('missing-node import is handled by the shared distributor, not alias tagging', () => {
  const planSource = readFileSync(
    join(repoRoot, 'infra/images/development/image-plan.mjs'),
    'utf8',
  );
  assert.match(planSource, /missing-kind-node/);
  const loader = readFileSync(
    join(repoRoot, 'infra/images/distribution/kind-image-loader.mjs'),
    'utf8',
  );
  assert.match(loader, /loadedNodes/);
});

test('alias tagging does not invoke kind load for role-only work', () => {
  const script = readFileSync(slotLoader, 'utf8');
  assert.match(script, /kind-image-loader\.mjs" dev/);
  assert.doesNotMatch(script, /kind load docker-image "\$ref"/);
  assert.match(script, /ctr -n k8s.io images tag/);
  assert.match(script, /write_image_ref_receipt/);
});

test('stale fingerprint hint refuses before distribution', () => {
  const root = mkdtempSync(join(tmpdir(), 'stale-hint-'));
  const fingerprint = verifiedFingerprint();
  const { bin } = installFakes(root);
  const stale = `${'0'.repeat(63)}1`;
  assert.equal(
    verifyDevImageFingerprintHint(stale, fingerprint).reason,
    'stale-fingerprint-hint',
  );
  const result = spawnSync('bash', [slotLoader, 'dev-2', 'web'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      OFFSCREEN_REAL_NODE: execPath,
      OFFSCREEN_IMAGE_FINGERPRINT: stale,
      TMPDIR: root,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing stale fingerprint hint/);
});

test('fingerprint drift during docker build discards temp image only', () => {
  const root = mkdtempSync(join(tmpdir(), 'build-drift-'));
  const fingerprint = verifiedFingerprint();
  const { bin, counter } = installFakes(root, { driftOnBuild: true });
  const result = spawnSync('bash', [slotLoader, 'dev-2', 'web'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      OFFSCREEN_REAL_NODE: execPath,
      OFFSCREEN_IMAGE_FINGERPRINT: fingerprint,
      TMPDIR: root,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fingerprint changed during docker build/);
  assert.doesNotMatch(result.stdout, /digest=/);
  assert.equal(existsSync(counter), true);
});

test('verified cache hit reuses labeled canonical image without docker build', () => {
  const root = mkdtempSync(join(tmpdir(), 'cache-hit-'));
  const fingerprint = verifiedFingerprint();
  const { bin, counter } = installFakes(root, {
    cachedFingerprint: fingerprint,
  });
  const result = spawnSync('bash', [slotLoader, 'dev-2', 'web'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      OFFSCREEN_REAL_NODE: execPath,
      OFFSCREEN_IMAGE_FINGERPRINT: fingerprint,
      TMPDIR: root,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /builds=0/);
  assert.equal(existsSync(counter), false);
});

test('cache miss builds under temp tag then publishes canonical tag', () => {
  const root = mkdtempSync(join(tmpdir(), 'build-ok-'));
  const fingerprint = verifiedFingerprint();
  const { bin, counter } = installFakes(root);
  const result = spawnSync('bash', [slotLoader, 'dev-2', 'web'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      OFFSCREEN_REAL_NODE: execPath,
      OFFSCREEN_IMAGE_FINGERPRINT: fingerprint,
      TMPDIR: root,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /builds=1/);
  assert.equal(readFileSync(counter, 'utf8').trim().split('\n').length, 1);
});

test('warm and reconciled image handoffs both select immutable canonical generation', () => {
  const source = readFileSync(slotLoader, 'utf8');
  assert.equal([...source.matchAll(/write_image_ref_receipt "\$OFFSCREEN_IMAGE_REF_FILE" "\$canonical"/g)].length, 2);
  assert.doesNotMatch(source, /receipt_ref="offscreen-dev-workspace:/);
});

test('image progress is separate from machine output and distribution has a timing boundary', () => {
  const source = readFileSync(slotLoader, 'utf8');
  assert.match(source, /exec 3>\/dev\/tty/);
  assert.match(source, /printf .*>&3/);
  assert.match(source, /startup_timing_end kind-distribution images/);
});

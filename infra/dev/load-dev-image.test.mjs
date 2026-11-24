import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  fingerprintDevImageContext,
  UNION_ROLE_FILTER,
} from '../../tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const adapter = join(repoRoot, 'infra/dev/load-dev-image.sh');
const slotLoader = join(repoRoot, 'infra/images/development/load-dev-slot-image.sh');
const tiltfile = readFileSync(join(repoRoot, 'infra/dev/Tiltfile'), 'utf8');

function runAdapter(ref, env = {}) {
  return spawnSync('bash', [adapter, ref], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function installFakes(root) {
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const mark = join(root, 'fingerprint.mark');
  const counter = join(root, 'build.count');
  writeFileSync(
    join(bin, 'node'),
    `#!/bin/bash
if [[ "\${1:-}" == *kind-image-loader.mjs ]]; then
  ref="\$3"
  echo "{\\"ref\\":\\"\$ref\\",\\"digest\\":\\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\",\\"loadedNodes\\":[],\\"reusedNodes\\":[\\"cp\\",\\"worker\\"]}"
  exit 0
fi
exec "\${OFFSCREEN_REAL_NODE}" "$@"
`,
  );
  writeFileSync(
    join(bin, 'docker'),
    `#!/bin/bash
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  if [[ "$*" == *offscreen.fingerprint* ]]; then
    if [[ -f "${mark}" ]]; then cat "${mark}"; fi
    exit 0
  fi
  echo sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  exit 0
fi
if [[ "$1" == "build" ]]; then
  echo 1 >> "${counter}"
  printf '%s' "$OFFSCREEN_IMAGE_FINGERPRINT" > "${mark}"
  exit 0
fi
if [[ "$1" == "tag" ]]; then exit 0; fi
if [[ "$1" == "exec" && "$*" == *"images ls"* ]]; then
  for r in \\
    offscreen-dev-workspace:union-same-fp-abcdefgh \\
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

test('dev Tiltfile uses worktree-scoped receipt paths and shared rebuild inputs', () => {
  assert.match(tiltfile, /\.offscreen\/tilt-image-refs\/' \+ OFFSCREEN_DEV_SLOT \+ '\//);
  assert.match(tiltfile, /infra\/dev\/load-dev-image\.sh/);
  assert.doesNotMatch(tiltfile, /TURBO_FILTER_BY_IMAGE/);
  assert.match(tiltfile, /kind-image-loader\.mjs/);
  assert.match(tiltfile, /deps=rebuild_deps/);
  assert.doesNotMatch(tiltfile, /\/tmp\/offscreen-tilt-image-ref-/);
});

test('adapter refuses slot ref that does not match OFFSCREEN_DEV_SLOT', () => {
  const result = runAdapter('offscreen-dev-workspace:dev-2-web', { OFFSCREEN_DEV_SLOT: 'dev-3' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing slot ref/);
});

test('adapter refuses legacy dev workspace refs before docker', () => {
  const result = runAdapter('offscreen-lab-dev-workspace:dxk08-api', { OFFSCREEN_DEV_SLOT: 'dev-2' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing legacy dev workspace ref/);
});

test('adapter refuses malformed slot refs without valid OFFSCREEN_DEV_SLOT', () => {
  const result = runAdapter('offscreen-dev-workspace:dev-2-typo', { OFFSCREEN_DEV_SLOT: 'unassigned' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /without valid OFFSCREEN_DEV_SLOT/);
});

test('adapter refuses release refs with no cross-profile fallback', () => {
  const result = runAdapter('offscreen-lab-game-web:turn02', { OFFSCREEN_DEV_SLOT: 'dev-2' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing ref/);
});

test('adapter rejects unknown refs with no cross-profile fallback', () => {
  const result = runAdapter('offscreen-lab-game-web:turn02');
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
  const first = fingerprintDevImageContext(repoRoot, { roleFilter: UNION_ROLE_FILTER });
  assert.equal(first.ok, true);
  writeFileSync(lock, `${original}# fingerprint probe\n`);
  const changed = fingerprintDevImageContext(repoRoot, { roleFilter: UNION_ROLE_FILTER });
  writeFileSync(lock, original);
  assert.equal(changed.ok, true);
  assert.notEqual(changed.fingerprint, first.fingerprint);
});

test('failure removes stale receipt before adapter work and leaves no success file', () => {
  const root = mkdtempSync(join(tmpdir(), 'receipt-'));
  const receipt = join(root, '.offscreen/tilt-image-refs/dev-2/web.ref');
  mkdirSync(dirname(receipt), { recursive: true });
  writeFileSync(receipt, 'stale-ref\n');
  const result = runAdapter('offscreen-dev-workspace:dev-2-web', {
    OFFSCREEN_DEV_SLOT: 'dev-3',
    OFFSCREEN_IMAGE_REF_FILE: receipt,
  });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(receipt), false);
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
  const { bin, counter } = installFakes(root);
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    OFFSCREEN_REAL_NODE: execPath,
    OFFSCREEN_IMAGE_FINGERPRINT: 'same-fp-abcdefghijklmnopqrstuvwxyz',
    TMPDIR: root,
  };
  const run = (slot, role) =>
    spawnSync('bash', [slotLoader, slot, role], { cwd: repoRoot, encoding: 'utf8', env });
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
    join(repoRoot, 'tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs'),
    'utf8',
  );
  assert.match(planSource, /missing-kind-node/);
  const loader = readFileSync(join(repoRoot, 'infra/images/distribution/kind-image-loader.mjs'), 'utf8');
  assert.match(loader, /loadedNodes/);
});

test('alias tagging does not invoke kind load for role-only work', () => {
  const script = readFileSync(slotLoader, 'utf8');
  assert.match(script, /kind-image-loader\.mjs" dev/);
  assert.doesNotMatch(script, /kind load docker-image "\$ref"/);
  assert.match(script, /ctr -n k8s\.io images tag/);
  assert.match(script, /write_image_ref_receipt/);
});
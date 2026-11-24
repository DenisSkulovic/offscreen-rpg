import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const VERIFY_ROOT = join(HERE, '../..');
const REPO_ROOT = join(HERE, '../../../..');
const LIB_SH = join(HERE, '../../../clusters/kind/release/lib.sh');

const GUARDED_SCRIPTS = [
  join(REPO_ROOT, 'infra/platform/postgres/install.sh'),
  join(VERIFY_ROOT, 'smoke/postgres/smoke.sh'),
  join(REPO_ROOT, 'infra/platform/temporal/install.sh'),
  join(VERIFY_ROOT, 'smoke/temporal/smoke.sh'),
  join(VERIFY_ROOT, 'smoke/object-storage/smoke.sh'),
  join(REPO_ROOT, 'infra/environments/release/content-bootstrap/smoke.sh'),
  join(VERIFY_ROOT, 'fixtures/document-access/smoke.sh'),
];

/** @param {string} fn @param {string} before @param {string} after */
function runAssertNoVolumeLoss(fn, before, after) {
  const work = mkdtempSync(join(tmpdir(), 'vol-guard-'));
  const beforePath = join(work, 'before');
  const afterPath = join(work, 'after');
  writeFileSync(beforePath, before, 'utf8');
  writeFileSync(afterPath, after, 'utf8');
  return spawnSync(
    'bash',
    [
      '-c',
      `source "${LIB_SH}"; ${fn} "${beforePath}" "${afterPath}"`,
    ],
    { encoding: 'utf8' },
  );
}

/** @param {string[]} volumeLines @param {string[]} contextLines */
function runVolumeGuardCycle(volumeLines, contextLines) {
  const work = mkdtempSync(join(tmpdir(), 'vol-guard-cycle-'));
  const fakeBin = join(work, 'bin');
  mkdirSync(fakeBin, { recursive: true });
  const dockerPath = join(fakeBin, 'docker');
  const kubectlPath = join(fakeBin, 'kubectl');
  const volumesBody = `${volumeLines.join('\n')}\n`;
  const contextsBody = `${contextLines.join('\n')}\n`;
  writeFileSync(
    dockerPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == volume && "\${2:-}" == ls && "\${3:-}" == -q ]]; then
  cat <<'VOL'
${volumesBody}VOL
  exit 0
fi
echo "unexpected docker: $*" >&2
exit 2
`,
    'utf8',
  );
  writeFileSync(
    kubectlPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == config && "\${2:-}" == get-contexts && "\${3:-}" == -o && "\${4:-}" == name ]]; then
  cat <<'CTX'
${contextsBody}CTX
  exit 0
fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
    'utf8',
  );
  chmodSync(dockerPath, 0o755);
  chmodSync(kubectlPath, 0o755);

  const guardWork = join(work, 'guard');
  mkdirSync(guardWork, { recursive: true });
  const script = `#!/usr/bin/env bash
set -euo pipefail
source "${LIB_SH}"
volume_guard_begin "${guardWork}"
volume_guard_end "${guardWork}"
`;
  return spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}` },
  });
}

describe('volume guard', () => {
  test('cold clone with zero legacy volumes passes assert_no_volume_loss', () => {
    const result = runAssertNoVolumeLoss('assert_no_volume_loss', '', '');
    assert.equal(result.status, 0, result.stderr);
  });

  test('unchanged unrelated volume list passes assert_no_volume_loss', () => {
    const listing = 'kind-offscreen-lab-control-plane\nsome-other-volume\n';
    const result = runAssertNoVolumeLoss(
      'assert_no_volume_loss',
      listing,
      listing,
    );
    assert.equal(result.status, 0, result.stderr);
  });

  test('disappearing unrelated volume fails assert_no_volume_loss', () => {
    const before = 'kind-offscreen-lab-control-plane\nsome-other-volume\n';
    const after = 'kind-offscreen-lab-control-plane\n';
    const result = runAssertNoVolumeLoss(
      'assert_no_volume_loss',
      before,
      after,
    );
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /Refusing to continue: existing Docker volumes disappeared/,
    );
    assert.match(result.stderr, /some-other-volume/);
  });

  test('cold clone volume_guard_begin/end cycle passes without legacy Compose names', () => {
    const result = runVolumeGuardCycle([], ['kind-offscreen-lab', 'minikube']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  });

  test('destroy.sh exits before probes when confirmation is missing or wrong', () => {
    const destroySh = join(REPO_ROOT, 'infra/clusters/kind/release/destroy.sh');
    const work = mkdtempSync(join(tmpdir(), 'destroy-confirm-'));
    const fakeBin = join(work, 'bin');
    mkdirSync(fakeBin, { recursive: true });
    const logPath = join(work, 'invocations.log');
    writeFileSync(
      join(fakeBin, 'kind'),
      `#!/usr/bin/env bash
echo "kind $*" >>"${logPath}"
exit 0
`,
      'utf8',
    );
    writeFileSync(
      join(fakeBin, 'docker'),
      `#!/usr/bin/env bash
echo "docker $*" >>"${logPath}"
exit 0
`,
      'utf8',
    );
    writeFileSync(
      join(fakeBin, 'kubectl'),
      `#!/usr/bin/env bash
echo "kubectl $*" >>"${logPath}"
exit 0
`,
      'utf8',
    );
    chmodSync(join(fakeBin, 'kind'), 0o755);
    chmodSync(join(fakeBin, 'docker'), 0o755);
    chmodSync(join(fakeBin, 'kubectl'), 0o755);

    const env = { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}` };
    const missing = spawnSync('bash', [destroySh], { encoding: 'utf8', env });
    assert.equal(missing.status, 2, missing.stderr);
    assert.match(missing.stderr, /exactly one confirmation/);
    assert.throws(() => readFileSync(logPath, 'utf8'), /ENOENT/);

    const wrong = spawnSync('bash', [destroySh, 'offscreen-lab'], {
      encoding: 'utf8',
      env,
    });
    assert.equal(wrong.status, 2, wrong.stderr);
    assert.match(wrong.stderr, /confirmation must be exactly/);
    assert.throws(() => readFileSync(logPath, 'utf8'), /ENOENT/);
  });

  test('cluster_volume_names selects only volumes with exact kind cluster label', () => {
    const work = mkdtempSync(join(tmpdir(), 'vol-label-'));
    const fakeBin = join(work, 'bin');
    mkdirSync(fakeBin, { recursive: true });
    const dockerPath = join(fakeBin, 'docker');
    writeFileSync(
      dockerPath,
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == volume && "\${2:-}" == ls && "\${3:-}" == -q ]]; then
  printf '%s\n' foreign-volume kind-owned-volume
  exit 0
fi
if [[ "\${1:-}" == volume && "\${2:-}" == inspect ]]; then
  vol="\${5:-\${3:-}}"
  if [[ "\$vol" == kind-owned-volume ]]; then
    echo offscreen-lab
    exit 0
  fi
  echo ""
  exit 0
fi
echo "unexpected docker: $*" >&2
exit 2
`,
      'utf8',
    );
    chmodSync(dockerPath, 0o755);

    const outFile = join(work, 'cluster-vols');
    const script = `#!/usr/bin/env bash
set -euo pipefail
source "${LIB_SH}"
cluster_volume_names "${outFile}"
`;
    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}` },
    });
    assert.equal(result.status, 0, result.stderr);
    const listed = readFileSync(outFile, 'utf8').trim().split('\n').filter(Boolean);
    assert.deepEqual(listed, ['kind-owned-volume']);

    const before = join(work, 'before');
    const after = join(work, 'after');
    writeFileSync(before, 'foreign-volume\nkind-owned-volume\n', 'utf8');
    writeFileSync(after, 'foreign-volume\n', 'utf8');
    const assertResult = spawnSync(
      'bash',
      [
        '-c',
        `source "${LIB_SH}"; assert_volumes_outside_cluster_remain "${before}" "${outFile}" "${after}"`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(assertResult.status, 0, assertResult.stderr);
  });

  test('guarded lab scripts no longer require legacy Compose volume inspect', () => {
    const legacy =
      /docker volume inspect offscreen-rpg_(postgres|temporal)-data/;
    for (const scriptPath of GUARDED_SCRIPTS) {
      const body = readFileSync(scriptPath, 'utf8');
      const label = scriptPath.startsWith(REPO_ROOT)
        ? scriptPath.slice(REPO_ROOT.length + 1)
        : scriptPath.slice(VERIFY_ROOT.length + 1);
      assert.doesNotMatch(
        body,
        legacy,
        `${label} still inspects a legacy Compose volume`,
      );
      assert.match(body, /volume_guard_begin/, `${label} must call volume_guard_begin`);
      assert.match(body, /volume_guard_end/, `${label} must call volume_guard_end`);
    }
  });
});
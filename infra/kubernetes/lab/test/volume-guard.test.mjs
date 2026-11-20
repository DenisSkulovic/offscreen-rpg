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
const LAB_ROOT = join(HERE, '..');
const LIB_SH = join(LAB_ROOT, 'lib.sh');

const GUARDED_SCRIPTS = [
  'cnpg/install.sh',
  'cnpg/smoke.sh',
  'temporal/install.sh',
  'temporal/smoke.sh',
  'object-storage/smoke.sh',
  'content-bootstrap/smoke.sh',
  'document-access/smoke.sh',
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

  test('guarded lab scripts no longer require legacy Compose volume inspect', () => {
    const legacy =
      /docker volume inspect offscreen-rpg_(postgres|temporal)-data/;
    for (const rel of GUARDED_SCRIPTS) {
      const body = readFileSync(join(LAB_ROOT, rel), 'utf8');
      assert.doesNotMatch(
        body,
        legacy,
        `${rel} still inspects a legacy Compose volume`,
      );
      assert.match(body, /volume_guard_begin/, `${rel} must call volume_guard_begin`);
      assert.match(body, /volume_guard_end/, `${rel} must call volume_guard_end`);
    }
  });
});
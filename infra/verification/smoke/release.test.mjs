import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const smokeDir = dirname(fileURLToPath(import.meta.url));
const releaseSmokePath = join(smokeDir, 'release.sh');

/** @typedef {'ok' | 'unreadable' | 'foreign' | 'foreign-ns'} ContextMode */

/** @param {{ contextMode?: ContextMode, namespacesAbsent?: boolean }} [options] */
function stubBinDir({ contextMode = 'ok', namespacesAbsent = true } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'release-smoke-guard-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };

  const nsAbsentFlag = namespacesAbsent ? '1' : '0';
  const nsLabel = contextMode === 'foreign-ns' ? 'foreign' : 'disposable';

  writeStub(
    'kind',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-lab
  exit 0
fi
echo "unexpected kind: $*" >&2
exit 2
`,
  );

  writeStub(
    'docker',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "ps" ]]; then
  echo "offscreen-lab-control-plane 127.0.0.1:6443->6443/tcp"
  exit 0
fi
if [[ "\${1:-}" == "volume" && "\${2:-}" == "ls" ]]; then exit 0; fi
echo "unexpected docker: $*" >&2
exit 2
`,
  );

  const contextBlock =
    contextMode === 'unreadable' || contextMode === 'foreign-ns'
      ? contextMode === 'unreadable'
        ? `exit 1`
        : `echo kind-offscreen-lab
  exit 0`
      : contextMode === 'foreign'
        ? `echo kind-other-cluster
  exit 0`
        : `echo kind-offscreen-lab
  exit 0`;

  const applyLog = join(binDir, 'apply-log');
  writeFileSync(applyLog, '', 'utf8');

  writeStub(
    'kubectl',
    `#!/usr/bin/env bash
set -euo pipefail
joined="$*"
if [[ "\${1:-}" == "--context" && "\${3:-}" == "config" && "\${4:-}" == "get-contexts" ]]; then
  ${contextBlock}
fi
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  ${contextBlock}
fi
if [[ "$joined" == *"get namespace lab-a"* || "$joined" == *"get namespace lab-b"* ]]; then
  if [[ "${nsAbsentFlag}" == "1" ]]; then
    exit 0
  fi
  if [[ "$joined" == *"get namespace lab-b"* ]]; then
    echo "namespace/lab-b"
  else
    echo "namespace/lab-a"
  fi
  exit 0
fi
if [[ "$joined" == *"jsonpath={.metadata.labels.offscreen\\\\.rpg/lab}"* ]]; then
  echo "${nsLabel}"
  exit 0
fi
if [[ "$joined" == *" apply "* ]]; then
  for arg in "$@"; do
    echo "$arg" >> "${applyLog}"
  done
  exit 0
fi
if [[ "$joined" == *"wait "* ]]; then exit 0; fi
if [[ "$joined" == *"logs pod/"* ]]; then
  echo "kubernetes.default.svc.cluster.local"
  echo "probe.lab-b.svc.cluster.local"
  echo "lab-b-ok"
  echo "lab-pvc-ok"
  exit 0
fi
if [[ "$joined" == *"get svc -A"* ]]; then exit 0; fi
if [[ "$joined" == *"exec pod/pvc-writer"* ]]; then echo lab-pvc-ok; exit 0; fi
if [[ "$joined" == *"delete pod"* ]]; then exit 0; fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, applyLog };
}

test('release.sh sources ensure-namespaces before probe fixtures', () => {
  const text = readFileSync(releaseSmokePath, 'utf8');
  assert.match(text, /ensure-namespaces\.sh/);
  assert.match(text, /ensure_probe_namespaces/);
  const ensureIndex = text.indexOf('ensure_probe_namespaces');
  const probeIndex = text.indexOf('probes/cross-namespace.yaml');
  assert.ok(ensureIndex > 0 && probeIndex > ensureIndex);
});

test('release.sh stub run applies probe namespaces before probe objects', () => {
  const { binDir, applyLog } = stubBinDir({ namespacesAbsent: true });
  const result = spawnSync('bash', [releaseSmokePath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.match(applied, /fixtures\/probes\/namespaces\.yaml/);
  const nsPos = applied.indexOf('namespaces.yaml');
  const crossPos = applied.indexOf('cross-namespace.yaml');
  assert.ok(nsPos >= 0 && crossPos > nsPos, applied);
});

test('release.sh refuses foreign probe namespace label before fixtures', () => {
  const { binDir, applyLog } = stubBinDir({
    contextMode: 'foreign-ns',
    namespacesAbsent: false,
  });
  const result = spawnSync('bash', [releaseSmokePath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /foreign or missing lab label/);
  const applied = readFileSync(applyLog, 'utf8');
  assert.equal(applied.trim(), '');
});

test('release.sh refuses when kubectl context is unreadable', () => {
  const { binDir } = stubBinDir({ contextMode: 'unreadable' });
  const result = spawnSync('bash', [releaseSmokePath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unreadable or absent/);
});
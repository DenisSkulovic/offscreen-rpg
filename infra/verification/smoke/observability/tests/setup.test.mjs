import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const smokeDir = dirname(dirname(fileURLToPath(import.meta.url)));
const setupPath = join(smokeDir, 'setup.sh');

/** @typedef {'ok' | 'unreadable' | 'foreign'} ContextMode */

/** @param {{ contextMode?: ContextMode, collectorPresent?: boolean }} [options] */
function stubBinDir({ contextMode = 'ok', collectorPresent = true } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'observability-setup-guard-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };

  writeStub(
    'kind',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-lab
  exit 0
fi
if [[ "\${1:-}" == "get" && "\${2:-}" == "nodes" ]]; then
  echo offscreen-lab-control-plane
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
if [[ "\${1:-}" == "image" && "\${2:-}" == "inspect" ]]; then
  echo "python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"
  exit 0
fi
if [[ "\${1:-}" == "save" ]]; then exit 0; fi
if [[ "\${1:-}" == "exec" ]]; then exit 0; fi
echo "unexpected docker: $*" >&2
exit 2
`,
  );

  const contextBlock =
    contextMode === 'unreadable'
      ? `exit 1`
      : contextMode === 'foreign'
        ? `echo kind-other-cluster
  exit 0`
        : `echo kind-offscreen-lab
  exit 0`;

  const collectorExit = collectorPresent ? 0 : 1;
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
if [[ "$joined" == *"get deployment otel-collector"* ]]; then exit ${collectorExit}; fi
if [[ "$joined" == *" apply "* || "$joined" == *" apply -f"* ]]; then
  for arg in "$@"; do
    echo "$arg" >> "${applyLog}"
  done
  exit 0
fi
if [[ "$joined" == *" create "* ]]; then
  for arg in "$@"; do
    echo "$arg" >> "${applyLog}"
  done
  exit 0
fi
if [[ "$joined" == *"rollout status deployment/hop-"* ]]; then exit 0; fi
if [[ "$joined" == *"get svc hop-a"* || "$joined" == *"get svc hop-b"* ]]; then
  echo ClusterIP
  exit 0
fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, applyLog };
}

test('setup.sh refuses when kubectl context is unreadable', () => {
  const { binDir } = stubBinDir({ contextMode: 'unreadable' });
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unreadable or absent/);
});

test('setup.sh refuses when kubectl context is foreign', () => {
  const { binDir } = stubBinDir({ contextMode: 'foreign' });
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unreadable or absent/);
});

test('setup.sh refuses when collector is absent', () => {
  const { binDir } = stubBinDir({ collectorPresent: false });
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /otel-collector/);
});

test('setup.sh stub run applies smoke hops only, not platform collector render', () => {
  const { binDir, applyLog } = stubBinDir();
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.match(applied, /hops\.yaml/);
  assert.doesNotMatch(applied, /platform\/observability/);
  assert.doesNotMatch(applied, /render observability/);
});

test('setup.sh applies only verification smoke manifests', () => {
  const text = readFileSync(setupPath, 'utf8');
  assert.doesNotMatch(text, /render observability/);
  assert.doesNotMatch(text, /common\/cli\.mjs/);
  assert.doesNotMatch(text, /source .*install\.sh/);
  assert.doesNotMatch(text, /helm upgrade/);
  assert.match(text, /hops\.yaml/);
  assert.match(text, /hop\.py/);
});
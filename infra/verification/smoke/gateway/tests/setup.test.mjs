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

/** @param {{ gameEdgePresent?: boolean, contextMode?: ContextMode }} [options] */
function stubBinDir({ gameEdgePresent = false, contextMode = 'ok' } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'gateway-setup-guard-'));
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
  echo offscreen-release
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
        : `echo kind-offscreen-release
  exit 0`;

  const gameEdgeExit = gameEdgePresent ? 0 : 1;
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
if [[ "$joined" == *"get gateway lab-edge"* ]]; then exit 0; fi
if [[ "$joined" == *"get httproute game-edge-routes"* ]]; then exit ${gameEdgeExit}; fi
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
if [[ "$joined" == *"wait --for=condition=Available"* ]]; then exit 0; fi
if [[ "$joined" == *"get httproute lab-edge-routes"* ]]; then
  echo True
  exit 0
fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, applyLog };
}

test('setup.sh refuses when game-edge-routes is present', () => {
  const { binDir } = stubBinDir({ gameEdgePresent: true });
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /game-edge-routes/);
  assert.match(result.stderr, /overlaps/);
});

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

test('setup.sh stub run applies smoke manifests only, not platform gateway.yaml', () => {
  const { binDir, applyLog } = stubBinDir();
  const result = spawnSync('bash', [setupPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.match(applied, /backends\.yaml/);
  assert.match(applied, /routes\.yaml/);
  assert.doesNotMatch(applied, /platform\/gateway\/gateway\.yaml/);
  assert.doesNotMatch(applied, /game-edge/);
});

test('setup.sh applies only verification smoke manifests', () => {
  const text = readFileSync(setupPath, 'utf8');
  assert.doesNotMatch(text, /environments\/release/);
  assert.doesNotMatch(text, /game-edge-route\.yaml/);
  assert.doesNotMatch(text, /source .*install\.sh/);
  assert.doesNotMatch(text, /helm upgrade/);
  assert.match(text, /backends\.yaml/);
  assert.match(text, /routes\.yaml/);
});
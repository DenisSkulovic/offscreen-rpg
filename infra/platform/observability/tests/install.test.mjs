import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const observabilityDir = dirname(dirname(fileURLToPath(import.meta.url)));
const installPath = join(observabilityDir, 'install.sh');
const smokeHops = join(
  observabilityDir,
  '../../verification/smoke/observability/hops.yaml',
);

/** @typedef {'ok' | 'unreadable' | 'foreign'} ContextMode */

/** @param {{ contextMode?: ContextMode }} [options] */
function stubBinDir({ contextMode = 'ok' } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'observability-install-guard-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };

  writeStub(
    'docker',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "image" && "\${2:-}" == "inspect" ]]; then
  echo "otel/opentelemetry-collector:0.165.0@sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73"
  exit 0
fi
if [[ "\${1:-}" == "run" ]]; then
  echo "otelcol version 0.165.0"
  exit 0
fi
if [[ "\${1:-}" == "save" ]]; then exit 0; fi
if [[ "\${1:-}" == "ps" ]]; then
  echo "offscreen-lab-control-plane 127.0.0.1:6443->6443/tcp"
  exit 0
fi
if [[ "\${1:-}" == "exec" ]]; then exit 0; fi
echo "unexpected docker: $*" >&2
exit 2
`,
  );

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
if [[ "\${1:-}" == "version" ]]; then
  echo kind v0.33.0
  exit 0
fi
echo "unexpected kind: $*" >&2
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
if [[ "\${1:-}" == "version" ]]; then
  echo '{"clientVersion":{"gitVersion":"v1.37.2"}}'
  exit 0
fi
if [[ "$joined" == *"version --client=true -o json"* ]]; then
  echo '{"clientVersion":{"gitVersion":"v1.37.2"}}'
  exit 0
fi
if [[ "$joined" == *"config view --minify -o json"* ]]; then
  cat <<'JSON'
{"contexts":[{"context":{"cluster":"offscreen-lab","user":"kind-offscreen-lab"}}],"clusters":[{"name":"offscreen-lab","cluster":{"server":"https://127.0.0.1:6443"}}]}
JSON
  exit 0
fi
if [[ "$joined" == *"get namespace lab-postgres"* ]]; then
  cat <<'JSON'
{"metadata":{"name":"lab-postgres","namespace":"lab-postgres","labels":{"offscreen.rpg/lab":"disposable"}}}
JSON
  exit 0
fi
if [[ "$joined" == *" apply "* || "$joined" == *" apply" ]]; then
  for arg in "$@"; do
    echo "$arg" >> "${applyLog}"
  done
  exit 0
fi
if [[ "$joined" == *"rollout status deployment/otel-collector"* ]]; then exit 0; fi
if [[ "$joined" == *"get svc otel-collector"* ]]; then
  echo ClusterIP
  exit 0
fi
if [[ "$joined" == *"get pod -l app=otel-collector"* ]]; then
  echo "docker.io/otel/opentelemetry-collector@sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73"
  exit 0
fi
if [[ "$joined" == *"get svc -A"* ]]; then
  echo "lab-a otel-collector ClusterIP"
  exit 0
fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, applyLog };
}

test('verification hops.yaml keeps synthetic hop deployments', () => {
  const text = readFileSync(smokeHops, 'utf8');
  assert.match(text, /name:\s*hop-a/);
  assert.match(text, /name:\s*hop-b/);
  assert.doesNotMatch(text, /kind:\s*ConfigMap/);
});

test('install.sh does not reference synthetic smoke fixtures', () => {
  const text = readFileSync(installPath, 'utf8');
  assert.doesNotMatch(text, /VERIFICATION_OBS_ROOT/);
  assert.doesNotMatch(text, /synthetic-hop/);
  assert.doesNotMatch(text, /hop\.py/);
  assert.doesNotMatch(text, /hops\.yaml/);
  assert.doesNotMatch(text, /PYTHON_IMAGE/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*verification\/smoke/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*setup\.sh/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*smoke\.sh/);
  assert.doesNotMatch(text, /helm upgrade/);
  assert.match(text, /render observability release all/);
  assert.match(text, /chart\/files\/collector-config\.yaml/);
});

test('install.sh stub run applies rendered collector only, not smoke fixtures', () => {
  const { binDir, applyLog } = stubBinDir();
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.doesNotMatch(applied, /hops\.yaml/);
  assert.doesNotMatch(applied, /hop\.py/);
  assert.doesNotMatch(applied, /verification\/smoke\/observability/);
  assert.doesNotMatch(applied, /collector\.yaml/);
});

test('install.sh refuses when kubectl context is unreadable', () => {
  const { binDir } = stubBinDir({ contextMode: 'unreadable' });
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unreadable or absent/);
});

test('install.sh refuses when kubectl context is foreign', () => {
  const { binDir } = stubBinDir({ contextMode: 'foreign' });
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unreadable or absent/);
});
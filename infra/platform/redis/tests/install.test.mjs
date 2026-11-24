import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const redisDir = dirname(dirname(fileURLToPath(import.meta.url)));
const installPath = join(redisDir, 'install.sh');

/** @typedef {'ok' | 'unreadable' | 'foreign' | 'foreign-ns'} ContextMode */

/** @param {{ contextMode?: ContextMode, labAAbsent?: boolean }} [options] */
function stubBinDir({ contextMode = 'ok', labAAbsent = true } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'redis-install-guard-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };

  const nsAbsentFlag = labAAbsent ? '1' : '0';
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
if [[ "\${1:-}" == "ps" ]]; then exit 0; fi
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
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  ${contextBlock}
fi
if [[ "$joined" == *"config view --minify -o json"* ]]; then
  cat <<'JSON'
{"contexts":[{"context":{"cluster":"offscreen-lab","user":"kind-offscreen-lab"}}],"clusters":[{"name":"offscreen-lab","cluster":{"server":"https://127.0.0.1:6443"}}]}
JSON
  exit 0
fi
if [[ "$joined" == *"get namespace lab-postgres"* ]]; then
  cat <<'JSON'
{"metadata":{"name":"lab-postgres","labels":{"offscreen.rpg/lab":"disposable"}}}
JSON
  exit 0
fi
if [[ "$joined" == *"get namespace lab-a"* ]]; then
  if [[ "${nsAbsentFlag}" == "1" ]]; then
    exit 0
  fi
  echo "namespace/lab-a"
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
if [[ "$joined" == *"rollout status deployment/redis"* ]]; then exit 0; fi
if [[ "$joined" == *"get svc redis"* ]]; then
  echo ClusterIP
  exit 0
fi
if [[ "$joined" == *"get svc -A"* ]]; then exit 0; fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  return { binDir, applyLog };
}

test('install.sh ensures lab-a before rendered redis manifest', () => {
  const text = readFileSync(installPath, 'utf8');
  assert.match(text, /ensure-lab-namespace\.sh/);
  assert.match(text, /ensure_lab_namespace lab-a/);
  const ensureIndex = text.indexOf('ensure_lab_namespace lab-a');
  const applyIndex = text.lastIndexOf('apply -f "$rendered"');
  assert.ok(ensureIndex > 0 && ensureIndex < applyIndex);
});

test('install.sh stub run applies only lab-a namespace then rendered manifest', () => {
  const { binDir, applyLog } = stubBinDir({ labAAbsent: true });
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.match(applied, /lab-a-namespace\.yaml/);
  assert.doesNotMatch(applied, /lab-b/);
  assert.doesNotMatch(applied, /namespaces\.yaml/);
});

test('install.sh refuses foreign lab-a namespace label', () => {
  const { binDir, applyLog } = stubBinDir({
    contextMode: 'foreign-ns',
    labAAbsent: false,
  });
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /foreign or missing lab label/);
  assert.equal(readFileSync(applyLog, 'utf8').trim(), '');
});
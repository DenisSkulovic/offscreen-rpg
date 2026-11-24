import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const gatewayDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(gatewayDir, '../../..');
const installPath = join(gatewayDir, 'install.sh');
const gatewayYaml = join(gatewayDir, 'gateway.yaml');
const smokeRoutes = join(
  repoRoot,
  'infra/verification/smoke/gateway/routes.yaml',
);

/** @typedef {'ok' | 'unreadable' | 'foreign'} ContextMode */

/** @param {{ contextMode?: ContextMode }} [options] */
function stubBinDir({ contextMode = 'ok' } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'gateway-install-guard-'));
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
  echo "traefik:v3.7.19@sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4"
  exit 0
fi
if [[ "\${1:-}" == "ps" ]]; then
  echo "offscreen-release-control-plane 127.0.0.1:6443->6443/tcp"
  exit 0
fi
echo "unexpected docker: $*" >&2
exit 2
`,
  );

  writeStub(
    'kind',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-release
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

  const helmLog = join(binDir, 'helm-log');
  writeFileSync(helmLog, '', 'utf8');

  writeStub(
    'helm',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "version" && "\${2:-}" == "--short" ]]; then
  echo v3.22.1
  exit 0
fi
if [[ "\${1:-}" == "repo" && "\${2:-}" == "list" ]]; then
  echo '[{"name":"traefik"}]'
  exit 0
fi
if [[ "\${1:-}" == "repo" ]]; then exit 0; fi
if [[ "\${1:-}" == "upgrade" ]]; then
  printf '%s\\n' "$*" >> "${helmLog}"
  exit 0
fi
echo "unexpected helm: $*" >&2
exit 2
`,
  );

  const applyLog = join(binDir, 'apply-log');
  writeFileSync(applyLog, '', 'utf8');

  const contextBlock =
    contextMode === 'unreadable'
      ? `exit 1`
      : contextMode === 'foreign'
        ? `echo kind-other-cluster
  exit 0`
        : `echo kind-offscreen-release
  exit 0`;

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
if [[ "$joined" == *" apply "* || "$joined" == *" apply" ]]; then
  for arg in "$@"; do
    echo "$arg" >> "${applyLog}"
  done
  exit 0
fi
if [[ "$joined" == *" create "* ]]; then exit 0; fi
if [[ "$joined" == *" label "* ]]; then exit 0; fi
if [[ "$joined" == *"wait --for=condition=Established"* ]]; then exit 0; fi
if [[ "$joined" == *"wait --for=condition=Available deployment/lab-gateway-traefik"* ]]; then exit 0; fi
if [[ "$joined" == *"get gateway lab-edge"* ]]; then
  echo True
  exit 0
fi
if [[ "$joined" == *"get svc -A"* ]]; then
  echo "lab-edge synthetic-web ClusterIP"
  exit 0
fi
echo "unexpected kubectl: $*" >&2
exit 2
`,
  );

  writeStub(
    'curl',
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "-fsSL" && "\${2:-}" == "-o" ]]; then
  echo "# gateway api crds" > "\${3:-/dev/null}"
  exit 0
fi
echo "unexpected curl: $*" >&2
exit 2
`,
  );

  writeStub(
    'sha256sum',
    `#!/usr/bin/env bash
set -euo pipefail
echo "356c2b8e286a964dc20995435659ad1095386329974793af10bbfe3eff977fe5  standard-install.yaml: OK"
exit 0
`,
  );

  return { binDir, applyLog, helmLog };
}

test('platform gateway.yaml contains only the lab-edge Gateway', () => {
  const text = readFileSync(gatewayYaml, 'utf8');
  assert.match(text, /kind:\s*Gateway/);
  assert.match(text, /name:\s*lab-edge/);
  assert.doesNotMatch(text, /kind:\s*HTTPRoute/);
  assert.doesNotMatch(text, /synthetic-api/);
});

test('verification routes.yaml owns the synthetic HTTPRoute', () => {
  const text = readFileSync(smokeRoutes, 'utf8');
  assert.match(text, /name:\s*lab-edge-routes/);
  assert.match(text, /synthetic-api/);
  assert.doesNotMatch(text, /kind:\s*Gateway/);
});

test('install.sh does not reference synthetic smoke fixtures', () => {
  const text = readFileSync(installPath, 'utf8');
  assert.doesNotMatch(text, /GATEWAY_SMOKE_ROOT/);
  assert.doesNotMatch(text, /synthetic-backend/);
  assert.doesNotMatch(text, /backends\.yaml/);
  assert.doesNotMatch(text, /lab-edge-routes/);
  assert.doesNotMatch(text, /synthetic-web/);
  assert.doesNotMatch(text, /synthetic-api/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*verification\/smoke/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*setup\.sh/);
  assert.doesNotMatch(text, /(source|\.\/|bash ).*smoke\.sh/);
  assert.doesNotMatch(text, /game-edge-routes/);
  assert.doesNotMatch(text, /HTTPRoute/);
  assert.match(text, /gateway\.yaml/);
  assert.match(text, /HELM_CHART_VERSION="42\.4\.1"/);
  assert.match(text, /traefik\/traefik/);
});

test('install.sh stub run applies gateway.yaml only, not smoke fixtures', () => {
  const { binDir, applyLog, helmLog } = stubBinDir();
  const result = spawnSync('bash', [installPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.equal(result.status, 0, result.stderr);
  const applied = readFileSync(applyLog, 'utf8');
  assert.match(applied, /gateway\.yaml/);
  assert.doesNotMatch(applied, /backends\.yaml/);
  assert.doesNotMatch(applied, /synthetic-backend/);
  assert.doesNotMatch(applied, /verification\/smoke\/gateway\/routes\.yaml/);
  assert.doesNotMatch(applied, /game-edge/);

  const helm = readFileSync(helmLog, 'utf8');
  assert.match(helm, /upgrade --install lab-gateway traefik\/traefik/);
  assert.match(helm, /--version 42\.4\.1/);
  assert.match(helm, /--namespace gateway-system/);
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
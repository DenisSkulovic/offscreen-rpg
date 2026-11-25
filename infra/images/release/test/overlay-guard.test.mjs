import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  parseWorkloadDocuments,
  renderWorkloadDocuments,
} from '../../../workloads/render.mjs';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(appReleaseDir, '../../..');
const releaseInstallPath = join(repoRoot, 'infra/environments/release/install.sh');
const edgeRoutePath = join(repoRoot, 'infra/environments/release/game-edge-route.yaml');
const platformGatewayDir = join(repoRoot, 'infra/platform/gateway');
const pinnedRuleHash =
  'd643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab';

function renderRelease(section) {
  return renderWorkloadDocuments({ profile: 'release', section });
}

function loadEdgeRouteText() {
  return readFileSync(edgeRoutePath, 'utf8');
}

function containerEnv(deployment) {
  return deployment.spec?.template?.spec?.containers?.[0]?.env ?? [];
}

function envBlock(env, name) {
  return env.find((entry) => entry.name === name);
}

const authorityDocs = renderRelease('authority');
const workersDocs = renderRelease('workers');
const edgeDocs = renderRelease('edge');
const migrationDocs = renderRelease('migration');
const workloadDocs = [...authorityDocs, ...workersDocs, ...edgeDocs];

test('rendered services forbid NodePort, LoadBalancer, and hostPort', () => {
  const services = workloadDocs.filter((doc) => doc.kind === 'Service');
  assert.ok(services.length > 0);
  for (const service of services) {
    const text = JSON.stringify(service);
    assert.doesNotMatch(text, /\bNodePort\b/);
    assert.doesNotMatch(text, /\bLoadBalancer\b/);
    assert.doesNotMatch(text, /\bhostPort\b/);
  }
});

test('chaos-eligible only on the six app Deployments', () => {
  const migrate = migrationDocs[0];
  assert.equal(migrate.kind, 'Job');
  assert.doesNotMatch(
    JSON.stringify(migrate),
    /offscreen\.rpg\/chaos-eligible/,
    'migration Job must not carry chaos-eligible',
  );

  const deployments = workloadDocs.filter((doc) => doc.kind === 'Deployment');
  assert.equal(deployments.length, 6);
  for (const deployment of deployments) {
    const labels =
      deployment.spec?.template?.metadata?.labels ?? deployment.metadata?.labels ?? {};
    assert.equal(
      labels['offscreen.rpg/chaos-eligible'],
      'true',
      `${deployment.metadata.name} must label chaos-eligible`,
    );
  }

  const nonDeployments = workloadDocs.filter((doc) => doc.kind !== 'Deployment');
  for (const doc of nonDeployments) {
    assert.doesNotMatch(
      JSON.stringify(doc),
      /offscreen\.rpg\/chaos-eligible/,
      'chaos-eligible must not appear outside app Deployments',
    );
  }
});

test('HTTPRoute game-edge-routes does not backend game-authority', () => {
  const routeText = loadEdgeRouteText();
  assert.match(routeText, /name:\s*game-edge-routes/);
  assert.doesNotMatch(routeText, /game-authority/);
  assert.doesNotMatch(routeText, /synthetic-web/);
  assert.doesNotMatch(routeText, /synthetic-api/);
  assert.doesNotMatch(routeText, /lab-edge-routes/);
  assert.match(routeText, /name:\s*game-api/);
  assert.match(routeText, /name:\s*game-web/);
});

test('workers overlay refuses broad database env and pins rule hash on API', () => {
  const workers = workersDocs.filter((doc) => doc.kind === 'Deployment');
  const authority = authorityDocs.find(
    (doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-authority',
  );
  const api = edgeDocs.find((doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api');
  assert.ok(authority);
  assert.ok(api);

  for (const deployment of workers.filter((doc) => doc.metadata.name !== 'game-relay')) {
    const text = JSON.stringify(containerEnv(deployment));
    assert.doesNotMatch(text, /DATABASE_URL/);
  }

  const relay = workers.find((doc) => doc.metadata.name === 'game-relay');
  assert.ok(relay);
  const relayEnv = containerEnv(relay);
  assert.ok(envBlock(relayEnv, 'DATABASE_URL')?.valueFrom?.secretKeyRef?.name === 'game-db');
  assert.match(JSON.stringify(relay.spec?.template?.spec?.containers?.[0]?.command ?? []), /bootstrap\/main\.js/);
  assert.equal(envBlock(relayEnv, 'OFFSCREEN_DOCUMENT_STORE')?.value, 's3');
  assert.equal(
    envBlock(relayEnv, 'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID')?.valueFrom?.secretKeyRef?.key,
    'access-key-id',
  );

  const control = workers.find((doc) => doc.metadata.name === 'game-control');
  assert.match(JSON.stringify(control.spec?.template?.spec?.containers?.[0]?.command ?? []), /bootstrap\/control-main\.js/);
  const workersText = JSON.stringify(workers);
  assert.doesNotMatch(workersText, /containerPort:\s*8080/);
  assert.doesNotMatch(workersText, /tcpSocket/);

  const authorityEnv = containerEnv(authority);
  assert.ok(envBlock(authorityEnv, 'DATABASE_URL'));
  assert.ok(envBlock(authorityEnv, 'GAME_AUTHORITY_EXECUTOR_TOKEN'));
  assert.equal(
    envBlock(authorityEnv, 'GAME_AUTHORITY_EXECUTOR_TOKEN')?.valueFrom?.secretKeyRef?.key,
    'game-authority-executor-token',
  );
  assert.doesNotMatch(workersText, /POSTGRES_URL/);
  assert.doesNotMatch(workersText, /PGPASSWORD/);
  assert.equal(
    envBlock(containerEnv(control), 'TEMPORAL_TASK_QUEUE')?.value,
    'control',
  );
  assert.equal(
    envBlock(
      containerEnv(workers.find((doc) => doc.metadata.name === 'game-executor')),
      'TEMPORAL_TASK_QUEUE',
    )?.value,
    'storyteller-execute-v1',
  );

  const apiEnvText = JSON.stringify(containerEnv(api));
  assert.match(apiEnvText, new RegExp(pinnedRuleHash));
  assert.doesNotMatch(apiEnvText, /OFFSCREEN_DEFAULT_RULE_SOURCE/);
});

test('rendered manifests contain no committed secret literals', () => {
  const allText = JSON.stringify(workloadDocs);
  assert.doesNotMatch(allText, /postgresql:\/\//i);
  assert.doesNotMatch(allText, /POSTGRES_PASSWORD/);
  const sensitiveEnvNames = [
    'BETTER_AUTH_SECRET',
    'GAME_AUTHORITY_SERVICE_TOKEN',
    'GAME_AUTHORITY_CONTROL_TOKEN',
    'GAME_AUTHORITY_EXECUTOR_TOKEN',
    'OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY',
    'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID',
    'DATABASE_URL',
  ];
  for (const deployment of workloadDocs.filter((doc) => doc.kind === 'Deployment')) {
  for (const envName of sensitiveEnvNames) {
      const block = envBlock(containerEnv(deployment), envName);
      if (!block) continue;
      assert.ok(block.valueFrom?.secretKeyRef, `${envName} must reference secretKeyRef`);
      assert.equal(
        Object.prototype.hasOwnProperty.call(block, 'value'),
        false,
        `${envName} must use valueFrom, not a literal value`,
      );
    }
  }
  assert.match(allText, /secretKeyRef/);
  assert.match(allText, /game-db/);
  assert.match(allText, /game-runtime/);
});

test('platform gateway.yaml has no synthetic HTTPRoute fixture', () => {
  const gateway = readFileSync(join(platformGatewayDir, 'gateway.yaml'), 'utf8');
  assert.match(gateway, /name:\s*lab-edge/);
  assert.doesNotMatch(gateway, /lab-edge-routes/);
  assert.doesNotMatch(gateway, /synthetic-api/);
});

test('verification gateway routes.yaml keeps the synthetic HTTPRoute', () => {
  const routes = readFileSync(
    join(repoRoot, 'infra/verification/smoke/gateway/routes.yaml'),
    'utf8',
  );
  assert.match(routes, /synthetic-api/);
  assert.match(routes, /lab-edge-routes/);
});

const kubectlLabPrecheckStub = `#!/usr/bin/env bash
set -euo pipefail
joined="$*"
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  echo kind-offscreen-release
  exit 0
fi
if [[ "$joined" == *"get gateway lab-edge"* ]]; then exit 0; fi
if [[ "$joined" == *"get secret lab-pg-app"* ]]; then exit 0; fi
if [[ "$joined" == *"get service object-store"* ]]; then exit 0; fi
if [[ "$joined" == *"get service temporal-frontend"* ]]; then exit 0; fi
echo "unexpected kubectl invocation: $*" >&2
exit 2
`;

function stubBinDir({ docker, kubectl, kind, helm, node } = {}) {
  const binDir = mkdtempSync(join(tmpdir(), 'app-release-guard-'));
  const writeStub = (name, body) => {
    const path = join(binDir, name);
    writeFileSync(path, body, 'utf8');
    chmodSync(path, 0o755);
    return path;
  };
  writeStub(
    'docker',
    docker ??
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "image" && "\${2:-}" == "inspect" ]]; then exit 0; fi
echo "unexpected docker invocation: $*" >&2
exit 2
`,
  );
  writeStub('kubectl', kubectl ?? kubectlLabPrecheckStub);
  writeStub(
    'kind',
    kind ??
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-release
  exit 0
fi
echo "unexpected kind invocation: $*" >&2
exit 2
`,
  );
  writeStub(
    'helm',
    helm ??
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "version" && "\${2:-}" == "--short" ]]; then
  echo v3.14.0
  exit 0
fi
echo "unexpected helm invocation: $*" >&2
exit 2
`,
  );
  if (node) {
    writeStub('node', node);
  }
  return binDir;
}

test('install.sh exits before apply when worker image is absent', () => {
  const dockerStubBody = `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "image" && "\${2:-}" == "inspect" ]]; then
  case "\${3:-}" in
    *worker*) exit 1 ;;
    *) exit 0 ;;
  esac
fi
echo "unexpected docker invocation: $*" >&2
exit 2
`;
  const binDir = stubBinDir({ docker: dockerStubBody });
  const result = spawnSync('bash', [releaseInstallPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /offscreen-lab-app-release-worker:turn02 is missing/,
  );
  assert.doesNotMatch(result.stdout, /Applying migration Job/);
  assert.doesNotMatch(result.stderr, /kubectl apply/);
});

test('install.sh exits before mutation when helm is missing', () => {
  const binDir = stubBinDir({
    helm: `#!/usr/bin/env bash
set -euo pipefail
exit 1
`,
  });
  const result = spawnSync('bash', [releaseInstallPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /helm is not available/);
  assert.doesNotMatch(result.stdout, /Loading selected release images/);
  assert.doesNotMatch(result.stderr, /kubectl apply/);
});

test('install.sh exits before image load when render fails', () => {
  const realNode = process.execPath;
  const nodeStub = `#!/usr/bin/env bash
set -euo pipefail
for arg in "$@"; do
  if [[ "$arg" == *render.mjs* ]]; then
    echo "malformed workload document" >&2
    exit 1
  fi
done
exec "${realNode}" "$@"
`;
  const binDir = stubBinDir({ node: nodeStub });
  const result = spawnSync('bash', [releaseInstallPath], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ''}` },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /could not render release/);
  assert.doesNotMatch(result.stdout, /Loading selected release images/);
});

test('install.sh does not apply authority after migration wait fails', () => {
  const kubectlStub = `#!/usr/bin/env bash
set -euo pipefail
joined="$*"
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  echo kind-offscreen-release
  exit 0
fi
if [[ "$joined" == *"get gateway lab-edge"* ]]; then exit 0; fi
if [[ "$joined" == *"get secret lab-pg-app"* ]]; then exit 0; fi
if [[ "$joined" == *"get service object-store"* ]]; then exit 0; fi
if [[ "$joined" == *"get service temporal-frontend"* ]]; then exit 0; fi
if [[ "\${1:-}" == "apply" ]]; then exit 0; fi
if [[ "$joined" == *"wait --for=condition=complete job/game-migrate"* ]]; then
  echo "migration wait failed" >&2
  exit 1
fi
echo "unexpected kubectl invocation: $*" >&2
exit 2
`;
  const binDir = stubBinDir({ kubectl: kubectlStub });
  const result = spawnSync('bash', [releaseInstallPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
      OFFSCREEN_RELEASE_IMAGES: 'api,game-authority',
    },
  });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /Applying authority overlay/);
});

test('migrate Job uses API image and is not chaos-eligible', () => {
  const migrate = migrationDocs[0];
  assert.equal(migrate.kind, 'Job');
  assert.equal(migrate.metadata.name, 'game-migrate');
  const image = migrate.spec?.template?.spec?.containers?.[0]?.image ?? '';
  assert.match(image, /offscreen-lab-app-release-api:turn02/);
  assert.match(
    JSON.stringify(migrate.spec?.template?.spec?.containers?.[0]?.command ?? []),
    /packages\/db\/dist\/src\/migrate-cli\.js/,
  );
  assert.equal(migrate.spec?.backoffLimit, 0);
  assert.equal(migrate.spec?.template?.spec?.restartPolicy, 'Never');
  assert.doesNotMatch(JSON.stringify(migrate), /chaos-eligible/);
});

test('release render CLI output is parseable for install groups', () => {
  const renderCli = join(repoRoot, 'infra/workloads/render.mjs');
  for (const section of ['migration', 'authority', 'workers', 'edge']) {
    const result = spawnSync(process.execPath, [renderCli, 'release', section], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(parseWorkloadDocuments(result.stdout).length > 0);
  }
});
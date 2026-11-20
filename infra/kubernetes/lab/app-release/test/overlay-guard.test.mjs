import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const appReleaseDir = dirname(dirname(fileURLToPath(import.meta.url)));
const overlayDir = join(appReleaseDir, 'overlay');
const labRoot = join(appReleaseDir, '..');
const pinnedRuleHash =
  'd643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab';

const overlayFiles = [
  'edge.yaml',
  'authority.yaml',
  'workers.yaml',
  'migrate.yaml',
].map((name) => join(overlayDir, name));

const allOverlayText = overlayFiles
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

test('overlay yaml forbids NodePort, LoadBalancer, and hostPort', () => {
  for (const path of overlayFiles) {
    const text = readFileSync(path, 'utf8');
    assert.doesNotMatch(text, /\bNodePort\b/);
    assert.doesNotMatch(text, /\bLoadBalancer\b/);
    assert.doesNotMatch(text, /\bhostPort\b/);
  }
});

test('chaos-eligible only on the five app Deployments', () => {
  const migrate = readFileSync(join(overlayDir, 'migrate.yaml'), 'utf8');
  assert.doesNotMatch(
    migrate,
    /offscreen\.rpg\/chaos-eligible/,
    'migration Job must not carry chaos-eligible',
  );

  const deploymentBlocks = allOverlayText.split(/^---$/m).filter((doc) =>
    /kind:\s*Deployment/.test(doc),
  );
  assert.equal(deploymentBlocks.length, 5);
  for (const block of deploymentBlocks) {
    assert.match(
      block,
      /offscreen\.rpg\/chaos-eligible:\s*"true"/,
      'each app Deployment pod template must label chaos-eligible',
    );
  }

  const nonDeploymentDocs = allOverlayText
    .split(/^---$/m)
    .filter((doc) => doc.trim() && !/kind:\s*Deployment/.test(doc));
  for (const doc of nonDeploymentDocs) {
    assert.doesNotMatch(
      doc,
      /offscreen\.rpg\/chaos-eligible/,
      'chaos-eligible must not appear outside app Deployments',
    );
  }
});

test('HTTPRoute game-edge-routes does not backend game-authority', () => {
  const edge = readFileSync(join(overlayDir, 'edge.yaml'), 'utf8');
  const routeDoc = edge
    .split(/^---$/m)
    .find((doc) => /kind:\s*HTTPRoute/.test(doc));
  assert.ok(routeDoc, 'game-edge-routes HTTPRoute document is present');
  assert.match(routeDoc, /name:\s*game-edge-routes/);
  assert.doesNotMatch(routeDoc, /game-authority/);
  assert.doesNotMatch(edge, /synthetic-web/);
  assert.doesNotMatch(edge, /synthetic-api/);
  assert.doesNotMatch(edge, /lab-edge-routes/);
  assert.match(routeDoc, /name:\s*game-api/);
  assert.match(routeDoc, /name:\s*game-web/);
});

test('workers overlay refuses broad database env and pins rule hash on API', () => {
  const workers = readFileSync(join(overlayDir, 'workers.yaml'), 'utf8');
  const authority = readFileSync(join(overlayDir, 'authority.yaml'), 'utf8');
  assert.doesNotMatch(workers, /DATABASE_URL/);
  assert.doesNotMatch(workers, /containerPort:\s*8080/);
  assert.doesNotMatch(workers, /tcpSocket/);
  assert.match(authority, /name: DATABASE_URL/);
  assert.doesNotMatch(workers, /POSTGRES_URL/);
  assert.doesNotMatch(workers, /PGPASSWORD/);
  assert.match(workers, /TEMPORAL_TASK_QUEUE[\s\S]*value:\s*control/);
  assert.match(
    workers,
    /TEMPORAL_TASK_QUEUE[\s\S]*value:\s*storyteller-execute-v1/,
  );

  const edge = readFileSync(join(overlayDir, 'edge.yaml'), 'utf8');
  assert.match(edge, new RegExp(pinnedRuleHash));
  assert.doesNotMatch(edge, /OFFSCREEN_DEFAULT_RULE_SOURCE/);
});

test('overlay manifests contain no committed secret literals', () => {
  assert.doesNotMatch(allOverlayText, /postgresql:\/\//i);
  assert.doesNotMatch(allOverlayText, /POSTGRES_PASSWORD/);
  const sensitiveEnvNames = [
    'BETTER_AUTH_SECRET',
    'GAME_AUTHORITY_SERVICE_TOKEN',
    'GAME_AUTHORITY_CONTROL_TOKEN',
    'GAME_AUTHORITY_EXECUTOR_TOKEN',
    'OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY',
    'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID',
    'DATABASE_URL',
  ];
  for (const envName of sensitiveEnvNames) {
    const block = allOverlayText.match(
      new RegExp(`- name: ${envName}\\n(?:  .+\\n)+`),
    )?.[0];
    if (!block) {
      continue;
    }
    assert.doesNotMatch(
      block,
      /^\s+value:\s/m,
      `${envName} must use valueFrom, not a literal value`,
    );
    assert.match(
      block,
      /valueFrom:\s*\n\s+secretKeyRef:/,
      `${envName} must reference secretKeyRef`,
    );
  }
  assert.match(allOverlayText, /secretKeyRef/);
  assert.match(allOverlayText, /name:\s*game-db/);
  assert.match(allOverlayText, /name:\s*game-runtime/);
});

test('gateway routes.yaml synthetic fixture is unchanged', () => {
  const routes = readFileSync(join(labRoot, 'gateway/routes.yaml'), 'utf8');
  assert.match(routes, /synthetic-api/);
  assert.match(routes, /lab-edge-routes/);
});

test('install.sh exits before apply when worker image is absent', () => {
  const binDir = mkdtempSync(join(tmpdir(), 'app-release-guard-'));
  const dockerStub = join(binDir, 'docker');
  writeFileSync(
    dockerStub,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "image" && "\${2:-}" == "inspect" ]]; then
  case "\${3:-}" in
    *worker*) exit 1 ;;
    *) exit 0 ;;
  esac
fi
echo "unexpected docker invocation: $*" >&2
exit 2
`,
    'utf8',
  );
  const kubectlStub = join(binDir, 'kubectl');
  writeFileSync(
    kubectlStub,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "config" && "\${2:-}" == "get-contexts" ]]; then
  echo kind-offscreen-lab
  exit 0
fi
echo "unexpected kubectl invocation: $*" >&2
exit 2
`,
    'utf8',
  );
  const kindStub = join(binDir, 'kind');
  writeFileSync(
    kindStub,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "get" && "\${2:-}" == "clusters" ]]; then
  echo offscreen-lab
  exit 0
fi
echo "unexpected kind invocation: $*" >&2
exit 2
`,
    'utf8',
  );
  chmodSync(dockerStub, 0o755);
  chmodSync(kubectlStub, 0o755);
  chmodSync(kindStub, 0o755);

  const result = spawnSync('bash', [join(appReleaseDir, 'install.sh')], {
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

test('migrate Job uses API image and is not chaos-eligible', () => {
  const migrate = readFileSync(join(overlayDir, 'migrate.yaml'), 'utf8');
  assert.match(migrate, /kind:\s*Job/);
  assert.match(migrate, /name:\s*game-migrate/);
  assert.match(migrate, /offscreen-lab-app-release-api:turn02/);
  assert.match(migrate, /packages\/db\/dist\/src\/migrate-cli\.js/);
  assert.match(migrate, /backoffLimit:\s*0/);
  assert.match(migrate, /restartPolicy:\s*Never/);
});
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const gatewayDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pinsPath = join(gatewayDir, 'pins.yaml');
const valuesPath = join(gatewayDir, 'values.yaml');

const EXPECTED_IMAGE =
  'docker.io/traefik@sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4';

/**
 * @param {string} filePath
 */
function fileSha256Hex(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * @param {unknown} pins
 * @param {string} baseDir
 */
function verifyPinnedArtifacts(pins, baseDir) {
  assert.equal(typeof pins, 'object');
  assert.ok(pins && !Array.isArray(pins));
  const chart = /** @type {{ archive: string, sha256: string }} */ (pins.chart);
  const gatewayApi = /** @type {{ manifest: string, sha256: string }} */ (
    pins.gatewayApi
  );

  for (const [relativePath, expectedHex] of [
    [chart.archive, chart.sha256],
    [gatewayApi.manifest, gatewayApi.sha256],
  ]) {
    const absolutePath = join(baseDir, relativePath);
    const actualHex = fileSha256Hex(absolutePath);
    if (actualHex !== expectedHex) {
      throw new Error(
        `sha256 mismatch for ${relativePath}: expected ${expectedHex}, got ${actualHex}`,
      );
    }
  }
}

function renderGatewayChartText() {
  const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  const chartArchive = join(gatewayDir, pins.chart.archive);
  const result = spawnSync(
    'helm',
    [
      'template',
      'lab-gateway',
      chartArchive,
      '--namespace',
      'gateway-system',
      '--skip-crds',
      '-f',
      valuesPath,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(
    result.status,
    0,
    `helm template failed: ${result.stderr || result.stdout}`,
  );
  return result.stdout;
}

/**
 * @param {string} render
 */
function assertNativeGatewayRender(render) {
  const serviceBlocks = render
    .split('---')
    .filter((block) => /\nkind: Service\n/.test(block));
  assert.equal(serviceBlocks.length, 1);
  const service = serviceBlocks[0];
  assert.match(service, /\n\s+type: ClusterIP\n/);
  assert.match(service, /\n\s+- port: 80\n\s+name: web\n\s+targetPort: web\n/);
  assert.doesNotMatch(service, /externalIPs:/);
  assert.doesNotMatch(service, /hostPort:/);

  const deploymentBlocks = render
    .split('---')
    .filter((block) => /\nkind: Deployment\n/.test(block));
  assert.equal(deploymentBlocks.length, 1);
  const deployment = deploymentBlocks[0];
  assert.match(deployment, /hostNetwork: false/);
  assert.match(deployment, new RegExp(`image: ${EXPECTED_IMAGE}`));
  assert.match(deployment, /\n\s+- --providers\.kubernetesgateway\n/);
  assert.doesNotMatch(
    deployment,
    /--providers\.kubernetesCRD|--providers\.kubernetesIngress(?!NGINX)|--providers\.kubernetesIngressNGINX/,
  );
  assert.match(
    deployment,
    /--entryPoints\.web\.transport\.respondingTimeouts\.readTimeout=60s/,
  );
  assert.match(
    deployment,
    /--entryPoints\.web\.transport\.respondingTimeouts\.writeTimeout=0s/,
  );
  assert.match(
    deployment,
    /--entryPoints\.web\.transport\.respondingTimeouts\.idleTimeout=180s/,
  );

  const gatewayClassBlocks = render
    .split('---')
    .filter((block) => /\nkind: GatewayClass\n/.test(block));
  assert.equal(gatewayClassBlocks.length, 1);
  const gatewayClass = gatewayClassBlocks[0];
  assert.match(gatewayClass, /\n\s+name: lab-traefik\n/);
  assert.match(
    gatewayClass,
    /\n\s+controllerName: traefik\.io\/gateway-controller\n/,
  );
}

test('pins.yaml loads with JSON.parse and vendor bytes match locked sha256', () => {
  const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  assert.equal(pins.chart.version, '42.4.1');
  assert.equal(pins.chart.archive, 'vendor/traefik-42.4.1.tgz');
  assert.equal(
    pins.chart.sha256,
    '80ea7246b74d5bcd1f86ac598feca6ba516a110dc0ad9e95dfda28d933b4acdb',
  );
  assert.equal(pins.gatewayApi.version, 'v1.6.3');
  assert.equal(pins.gatewayApi.channel, 'standard');
  assert.equal(
    pins.gatewayApi.manifest,
    'vendor/gateway-api-v1.6.3-standard.yaml',
  );
  assert.equal(
    pins.gatewayApi.sha256,
    '356c2b8e286a964dc20995435659ad1095386329974793af10bbfe3eff977fe5',
  );
  verifyPinnedArtifacts(pins, gatewayDir);
});

test('corrupt artifact bytes fail checksum verification without cluster access', () => {
  const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
  const tempDir = mkdtempSync(join(tmpdir(), 'gateway-artifact-lock-'));
  try {
    const chartSrc = join(gatewayDir, pins.chart.archive);
    const chartDest = join(tempDir, 'traefik-42.4.1.tgz');
    copyFileSync(chartSrc, chartDest);
    const bytes = readFileSync(chartDest);
    bytes[0] ^= 0xff;
    writeFileSync(chartDest, bytes);

    const corruptPins = {
      ...pins,
      chart: { ...pins.chart, archive: 'traefik-42.4.1.tgz' },
    };
    assert.throws(
      () => verifyPinnedArtifacts(corruptPins, tempDir),
      /sha256 mismatch/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('helm template render exposes native gateway identities and web timeouts', () => {
  assertNativeGatewayRender(renderGatewayChartText());
});
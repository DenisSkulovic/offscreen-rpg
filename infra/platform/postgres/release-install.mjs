import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { verifyManifestBytes } from '../common/pins.mjs';
import { runPlatformCommand } from '../common/commands.mjs';
import {
  RELEASE_CNPG_CONTEXT,
  RELEASE_CNPG_NAMESPACE,
  parseCnpgPin,
} from './config.mjs';

export {
  RELEASE_CNPG_CONTEXT,
  RELEASE_CNPG_CLUSTER_NAME,
  RELEASE_LAB_LABEL_KEY,
  RELEASE_LAB_LABEL_VALUE,
  RELEASE_CNPG_MIN_MEMORY_MIB,
  RELEASE_OPERATOR_FIELD_MANAGER,
} from './config.mjs';

export {
  assertPositiveCnpgInstances,
  assessCnpgClusterTopologyReadiness,
  resolveExpectedCnpgInstances,
} from './cluster-readiness.mjs';

export {
  assertReleaseClusterPin,
  planReleaseCnpg,
  ensureReleaseCnpg,
} from './bootstrap/release-plan.mjs';

export { executeAuthorizedReleaseCnpg } from './bootstrap/release-execution.mjs';

export { collectReleaseCnpgProbe } from './bootstrap/release-observation.mjs';

import {
  renderReleaseManifests,
  ensureReleaseCnpg,
} from './bootstrap/release-plan.mjs';
import { collectReleaseCnpgProbe } from './bootstrap/release-observation.mjs';
import { executeAuthorizedReleaseCnpg } from './bootstrap/release-execution.mjs';

const postgresRoot = dirname(fileURLToPath(import.meta.url));
const operatorPinPath = join(postgresRoot, 'operator.pin');

/**
 * @param {{ operatorManifestPath: string, repoRoot: string }} options
 */
export function installReleaseCnpg({ operatorManifestPath, repoRoot }) {
  const pinText = readFileSync(operatorPinPath, 'utf8');
  const pin = parseCnpgPin(pinText);
  const manifestBody = operatorManifestPath
    ? readFileSync(operatorManifestPath, 'utf8')
    : '';
  if (operatorManifestPath) verifyManifestBytes(manifestBody, pin.sha256);

  const target = runPlatformCommand(process.execPath, [
    join(repoRoot, 'infra/platform/common/cli.mjs'),
    'target',
    'release',
  ]);
  if (!target.ok) {
    process.stderr.write(target.stderr || 'target verification failed\n');
    process.exit(1);
  }

  const result = executeAuthorizedReleaseCnpg({
    collect: () => collectReleaseCnpgProbe(),
    readOperatorManifest: operatorManifestPath
      ? () => ({ body: manifestBody, sha256: pin.sha256 })
      : undefined,
    sleep: (ms) => {
      spawnSync('sleep', [String(Math.max(1, Math.ceil(ms / 1000)))]);
    },
    run: runPlatformCommand,
  });

  if (!result.ok) {
    const message =
      result.refusals[0]?.detail ?? 'release CNPG install refused';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  process.stdout.write(`CloudNativePG ${pin.version} is ready.\n`);
  process.stdout.write(`Operator image: ${pin.operatorImage}\n`);
  process.stdout.write(`Postgres image: ${pin.postgresImage}\n`);
  process.stdout.write(`Instances: ${result.instances ?? '1'}\n`);
  process.stdout.write(
    `Phase: ${result.phase ?? 'Cluster in healthy state'}\n`,
  );
  const pvc = runPlatformCommand('kubectl', [
    '--context',
    RELEASE_CNPG_CONTEXT,
    '-n',
    RELEASE_CNPG_NAMESPACE,
    'get',
    'pvc',
    '-o',
    'custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,STATUS:.status.phase',
    '--no-headers',
  ]);
  if (pvc.ok) {
    process.stdout.write(pvc.stdout);
  }
  return result;
}

function parseInstallArgs(argv) {
  let operatorManifestPath = '';
  let repoRoot = '';
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--operator-manifest') {
      operatorManifestPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--repo-root') {
      repoRoot = argv[index + 1] ?? '';
      index += 1;
    }
  }
  if (!repoRoot) {
    process.stderr.write(
      'usage: node release-install.mjs install [--operator-manifest PATH] --repo-root PATH\n',
    );
    process.exit(2);
  }
  return { operatorManifestPath, repoRoot };
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'verify-render') {
    renderReleaseManifests();
    process.stdout.write('release PostgreSQL render verified\n');
    return;
  }
  if (cmd === 'prepare') {
    const probe = collectReleaseCnpgProbe();
    const decision = ensureReleaseCnpg(probe, { authorize: true });
    if (!decision.ok) {
      process.stderr.write(
        `${decision.refusals[0]?.detail ?? 'release CNPG install refused'}\n`,
      );
      process.exit(1);
    }
    const fetch = decision.actions.some(
      (action) => action.op === 'apply-operator',
    );
    process.stdout.write(fetch ? 'fetch\n' : 'skip\n');
    return;
  }
  if (cmd === 'install') {
    const options = parseInstallArgs(process.argv);
    installReleaseCnpg(options);
    return;
  }
  process.stderr.write(
    'usage: node release-install.mjs prepare | install [--operator-manifest PATH] --repo-root PATH\n',
  );
  process.exit(2);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

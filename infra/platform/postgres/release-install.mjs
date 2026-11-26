import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { readPlatformProfile } from '../common/profile.mjs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { RELEASE_CNPG_CONTEXT, RELEASE_CNPG_NAMESPACE, parseCnpgPin } from './config.mjs';
import { renderReleaseManifests } from './bootstrap/release-plan.mjs';
import { ensureBaseline } from './bootstrap/ensure.mjs';
import { createBaselineCustody } from './bootstrap/custody.mjs';
import { loadOperatorArtifact } from './bootstrap/operator.mjs';
import { collectBaselineObservation, assessBaselineObservation, assertBaselineKubeconfig } from './bootstrap/observation.mjs';

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


const postgresRoot = dirname(fileURLToPath(import.meta.url));
const actualRoot = resolve(postgresRoot, '../../..');

export function installReleaseCnpg({ operatorManifestPath, repoRoot }) {
  const custody = createBaselineCustody();
  const pin = parseCnpgPin(readFileSync(join(postgresRoot, 'operator.pin'), 'utf8'));
  const lib = join(actualRoot, 'infra/clusters/kind/release/lib.sh');
  let work;
  let began = false;
  let result = { ok: false, outcome: 'failed', stage: 'guard', confirmedMutations: [], actions: [], refusals: [{ id: 'guard', detail: 'Release preflight failed' }], mutated: false };
  let pvc;
  try {
    if (resolve(repoRoot) !== actualRoot) throw new Error('repository root mismatch');
    assertBaselineKubeconfig(readPlatformProfile('release'), custody.run);
    work = mkdtempSync(join(tmpdir(), 'offscreen-postgres-'));
    const before = custody.run('bash', ['-c', 'set -euo pipefail; source "$1"; require_memory; volume_guard_begin "$2"', 'postgres-guard', lib, work], { timeoutMs: 30000 });
    if (!before.ok) throw new Error('guard begin failed');
    began = true;
    // Keep the deadline and lock alive through the final read-only release guard.
    const workerCustody = { ...custody, close() {} };
    result = ensureBaseline('release', {
      authorized: true,
      maintenance: process.env.OFFSCREEN_POSTGRES_MAINTENANCE === 'authorized',
      operatorManifestPath,
      custody: workerCustody,
    });
    if (result.ok) pvc = custody.run('kubectl', ['--context', RELEASE_CNPG_CONTEXT, '-n', RELEASE_CNPG_NAMESPACE, 'get', 'pvc', '-o', 'custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,STATUS:.status.phase', '--no-headers']);
  } catch {
    result = { ...result, ok: false, outcome: result.outcome === 'unknown' ? 'unknown' : 'failed' };
  } finally {
    try {
      if (began) {
        const after = custody.run('bash', ['-c', 'set -euo pipefail; source "$1"; volume_guard_end "$2"; assert_loopback_only', 'postgres-guard', lib, work], { timeoutMs: 30000 });
        if (!after.ok || custody.remaining() < 1) {
          result = { ...result, ok: false, stage: 'guard', outcome: result.outcome === 'unknown' ? 'unknown' : 'failed',
            refusals: [...result.refusals, { id: 'guard-unverified', detail: 'Release final guard not verified' }] };
        }
      }
    } finally {
      custody.close();
      if (work) rmSync(work, { recursive: true, force: true });
    }
  }
  if (!result.ok) {
    process.stderr.write(JSON.stringify(result) + '\n');
    return result;
  }
  process.stdout.write('CloudNativePG ' + pin.version + ' is ready.\n');
  process.stdout.write('Operator image: ' + pin.operatorImage + '\nPostgres image: ' + pin.postgresImage + '\n');
  process.stdout.write('Instances: ' + result.instances + '\nPhase: ' + result.phase + '\n');
  if (pvc?.ok) process.stdout.write(pvc.stdout);
  process.stdout.write('Install completed for CloudNativePG ' + pin.version + '.\n');
  return result;
}

function parseInstallArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = { '--operator-manifest': 'operatorManifestPath', '--repo-root': 'repoRoot' }[args[index]];
    const value = args[index + 1];
    if (!name || Object.hasOwn(options, name) || !value || value.startsWith('--')) throw new Error('invalid install arguments');
    options[name] = value;
  }
  if (!options.repoRoot) throw new Error('missing repository root');
  return options;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'verify-render' && !args.length) {
      renderReleaseManifests();
      process.stdout.write('release PostgreSQL render verified\n');
    } else if (command === 'prepare' && !args.length) {
      const artifact = loadOperatorArtifact();
      const decision = assessBaselineObservation(collectBaselineObservation('release', { artifact }));
      if (decision.refusals.length) {
        process.stderr.write(JSON.stringify(decision.refusals) + '\n');
        process.exitCode = 1;
      } else process.stdout.write(decision.operator === 'absent' ? 'fetch\n' : 'skip\n');
    } else if (command === 'install') {
      const result = installReleaseCnpg(parseInstallArgs(args));
      if (!result.ok) process.exitCode = 1;
    } else throw new Error('invalid command');
  } catch {
    process.stderr.write('release PostgreSQL command refused or observation unavailable\n');
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

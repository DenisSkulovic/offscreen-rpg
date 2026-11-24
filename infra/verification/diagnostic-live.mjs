// Invoked in a bounded subprocess for each local observation. No ensure/up/repair calls.
import process from 'node:process';
import { assertPlatformTarget, runPlatformCommand } from '../platform/common/commands.mjs';
import { verifyClusterNodesReady, verifyReleaseLocalPathProvisioner, observeSelectedServiceState } from '../environments/infra-cli.mjs';
import { readKindProfile } from '../clusters/kind/manager/config.mjs';
import { parsePlatformServiceSelection } from '../environments/platform-plan.mjs';

const [profile, service] = process.argv.slice(2);
function observe() {
  if (!['dev', 'release'].includes(profile)) throw new Error('invalid profile');
  const kind = readKindProfile(profile);
  // Never contact an ambient remote Docker daemon. Do not use kubeconfig auth plugins.
  if (process.env.DOCKER_HOST || process.env.DOCKER_TLS_VERIFY || process.env.DOCKER_CONTEXT) throw new Error('Docker endpoint override is not allowed');
  const active = runPlatformCommand('docker', ['context', 'show']);
  const contextName = active.stdout.trim();
  if (!active.ok || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(contextName)) throw new Error('Docker context unavailable');
  const context = runPlatformCommand('docker', ['context', 'inspect', contextName, '--format', '{{json .Endpoints.docker.Host}}']);
  const endpoint = context.ok ? JSON.parse(context.stdout) : null;
  if (typeof endpoint !== 'string' || !/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint)) throw new Error('Docker context is not local');
  const config = runPlatformCommand('kubectl', ['--context', kind.contextName, 'config', 'view', '--minify', '-o', 'json']);
  if (!config.ok) throw new Error('explicit local kubeconfig unavailable');
  const body = JSON.parse(config.stdout);
  if (body.users?.some(u => u.user?.exec || u.user?.['auth-provider']) || body.clusters?.some(c => c.cluster?.['proxy-url'])) throw new Error('external authentication or proxy refused');
  assertPlatformTarget(profile);
  if (service === 'cluster') {
    verifyClusterNodesReady(profile, runPlatformCommand);
    if (profile === 'release') verifyReleaseLocalPathProvisioner(runPlatformCommand, kind.contextName);
    const nodes = runPlatformCommand('kind', ['get', 'nodes', '--name', kind.clusterName]);
    if (!nodes.ok || nodes.stdout.trim().split(/\s+/).length !== 2) throw new Error('expected two Kind nodes');
    return { status: 'PASS', reason: 'existing local cluster identity and readiness observed' };
  }
  if (!parsePlatformServiceSelection(profile, service).ok) return { status: 'NOT-RUN', reason: 'unsupported service' };
  const observed = observeSelectedServiceState(profile, service);
  return { status: observed.state === 'installed' ? 'PASS' : observed.state === 'unsupported' ? 'NOT-RUN' : 'FAIL', reason: observed.state, detail: observed.detail ?? '' };
}
try { process.stdout.write(JSON.stringify(observe()) + '\n'); }
catch (error) { process.stdout.write(JSON.stringify({ status: 'FAIL', reason: 'local observation refused or failed', detail: error.message }) + '\n'); }

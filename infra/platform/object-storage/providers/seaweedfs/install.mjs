import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  readPlatformObject,
  runPlatformCommand,
} from '../../../common/commands.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';
import {
  resolvePlatformChartPath,
  resolvePlatformProfilePath,
} from '../../../common/render.mjs';
import {
  HELM_WAIT_SECONDS,
  withObjectStorageMutation,
} from './mutation-guard.mjs';
import {
  OBJECT_STORE_RELEASE_NAME,
  observeObjectStorageChain,
  observeObjectStorageHistory,
} from './observe.mjs';

export const OBJECT_STORE_ADMIN_SECRET = 'object-store-s3';

const LEGACY_OCCUPIED_HISTORY_REASON =
  'object-storage namespace exists without an object-store Helm release';

const MUTATING_PATTERN =
  /\b(apply|create|delete|patch|replace|install|upgrade|rollback|uninstall)\b/i;

/**
 * @param {import('./observe.mjs').observeObjectStorageHistory extends (...args: any) => infer R ? R : never} history
 */
/**
 * After this callback has created the namespace, history is no longer
 * `absent`. Helm install is still allowed only when that is the sole change:
 * no release and no Helm storage. Any other refused history is occupied.
 *
 * @param {ReturnType<typeof observeObjectStorageHistory>} history
 */
function historyAllowsHelmAfterFreshCreate(history) {
  if (history.state === 'absent') {
    return true;
  }
  return (
    history.state === 'refused' &&
    history.reason === LEGACY_OCCUPIED_HISTORY_REASON
  );
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
function decideObjectStorageInstall(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile(profileId);
  const history = observeObjectStorageHistory(profileId, { run });

  /** @type {ReturnType<typeof observeObjectStorageChain> | null} */
  let chain = null;
  if (
    history.state === 'native-compatible' ||
    (history.state === 'refused' &&
      history.reason === LEGACY_OCCUPIED_HISTORY_REASON)
  ) {
    chain = observeObjectStorageChain(profileId, { run });
  }

  /** @type {'absent' | 'native-noop' | 'refused' | 'unknown'} */
  let state;
  /** @type {string} */
  let reason;

  if (history.state === 'unknown') {
    state = 'unknown';
    reason = history.reason;
  } else if (history.state === 'absent') {
    state = 'absent';
    reason = history.reason;
  } else if (
    history.state === 'native-compatible' &&
    chain?.state === 'native-compatible'
  ) {
    state = 'native-noop';
    reason = chain.reason ?? history.reason;
  } else if (chain?.state === 'legacy-structural') {
    state = 'refused';
    reason = chain.reason;
  } else if (chain?.state === 'refused' || history.state === 'refused') {
    state = 'refused';
    reason = chain?.reason ?? history.reason;
  } else {
    state = 'refused';
    reason = chain?.reason ?? history.reason;
  }

  return {
    profileId,
    context: profile.contextName,
    namespace: profile.namespaces.objectStorage,
    state,
    reason,
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function planObjectStorage(profileId, deps = {}) {
  const decision = decideObjectStorageInstall(profileId, deps);
  return {
    mode: 'plan',
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    actions: [],
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function statusObjectStorage(profileId, deps = {}) {
  const decision = decideObjectStorageInstall(profileId, deps);
  return {
    mode: 'status',
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    actions: [],
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   authorize?: boolean,
 *   run?: import('../../../common/commands.mjs').runPlatformCommand,
 *   generateCredentials?: () => { accessKeyId: string, secretAccessKey: string },
 *   stateRoot?: string,
 *   readIdentity?: (profileId: 'dev' | 'release') => Promise<{ state: string, identity?: object, reason?: string }>,
 *   now?: () => number,
 *   budgetMs?: number,
 *   mutationCommands?: string[],
 * }} [deps]
 */
export async function ensureObjectStorage(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const decision = decideObjectStorageInstall(profileId, { run });
  const base = {
    mode: /** @type {const} */ ('ensure'),
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    actions: /** @type {object[]} */ ([]),
  };

  if (!deps.authorize) {
    return { ...base, ok: false, mutated: false };
  }
  if (decision.state === 'native-noop') {
    return { ...base, ok: true, mutated: false };
  }
  if (decision.state !== 'absent') {
    return { ...base, ok: false, mutated: false };
  }

  const credentials = deps.generateCredentials?.();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    return {
      ...base,
      ok: false,
      mutated: false,
      reason: 'admin credentials were not generated',
    };
  }

  const chartPath = resolvePlatformChartPath('object-storage');
  const profilePath = resolvePlatformProfilePath('object-storage', profileId);
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.objectStorage;
  const context = profile.contextName;

  /** @type {object[]} */
  const actions = [];
  let mutated = false;

  try {
    await withObjectStorageMutation(
      profileId,
      async ({ runWrite }) => {
        const historyBefore = observeObjectStorageHistory(profileId, { run });
        if (historyBefore.state !== 'absent') {
          throw new Error('object store history is no longer absent');
        }

        const namespaceRead = readPlatformObject(
          { profileId, resource: 'namespace', name: namespace },
          { run },
        );
        if (namespaceRead.state !== 'absent') {
          throw new Error('object storage namespace is not absent');
        }
        const createdNamespace = await runWrite('kubectl', [
          '--context',
          context,
          'create',
          'namespace',
          namespace,
        ]);
        if (!createdNamespace.ok) {
          throw new Error('object storage namespace create failed');
        }
        actions.push({ op: 'create-namespace', context, name: namespace });
        mutated = true;

        const secretRead = readPlatformObject(
          {
            profileId,
            resource: 'secret',
            name: OBJECT_STORE_ADMIN_SECRET,
            namespace,
          },
          { run },
        );
        if (secretRead.state !== 'absent') {
          throw new Error('object storage admin secret is not absent');
        }
        const secretManifest = {
          apiVersion: 'v1',
          kind: 'Secret',
          type: 'Opaque',
          metadata: {
            name: OBJECT_STORE_ADMIN_SECRET,
            namespace,
          },
          stringData: {
            'access-key-id': credentials.accessKeyId,
            'secret-access-key': credentials.secretAccessKey,
          },
        };
        let createdSecret;
        try {
          createdSecret = await runWrite(
            'kubectl',
            ['--context', context, 'create', '-f', '-'],
            { input: JSON.stringify(secretManifest) },
          );
        } catch {
          throw new Error('object storage admin secret create failed');
        }
        if (!createdSecret.ok) {
          throw new Error('object storage admin secret create failed');
        }
        actions.push({
          op: 'create-secret',
          context,
          namespace,
          name: OBJECT_STORE_ADMIN_SECRET,
        });
        mutated = true;

        const historyAfter = observeObjectStorageHistory(profileId, { run });
        if (!historyAllowsHelmAfterFreshCreate(historyAfter)) {
          throw new Error(
            'object store history is no longer eligible for Helm install',
          );
        }

        const installed = await runWrite(
          'helm',
          [
            'install',
            OBJECT_STORE_RELEASE_NAME,
            chartPath,
            '--kube-context',
            context,
            '--namespace',
            namespace,
            '--create-namespace=false',
            '-f',
            profilePath,
            '--wait',
            '--timeout',
            `${HELM_WAIT_SECONDS}s`,
          ],
          { timeoutMs: HELM_WAIT_SECONDS * 1000 + 5_000 },
        );
        if (!installed.ok) {
          throw new Error('object storage Helm install failed');
        }
        actions.push({
          op: 'helm-install',
          context,
          release: OBJECT_STORE_RELEASE_NAME,
        });
        mutated = true;
        return { ok: true };
      },
      {
        run,
        stateRoot: deps.stateRoot,
        readIdentity: deps.readIdentity,
        now: deps.now,
        budgetMs: deps.budgetMs,
        mutationCommands: deps.mutationCommands,
      },
    );
    return { ...base, ok: true, mutated, actions };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    /** @type {{ id: string, detail: string }[]} */
    const refusals = [];
    if (reason.includes('admin secret create failed')) {
      refusals.push({
        id: 'create-secret-failed',
        detail: 'secret create failed or conflicted',
      });
    }
    return { ...base, ok: false, mutated, reason, actions, refusals };
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 */
export function isObjectStorageMutatingInvocation(command, args) {
  if (command === 'helm') {
    const verb = args[0];
    return (
      verb === 'install' ||
      verb === 'upgrade' ||
      verb === 'uninstall' ||
      verb === 'rollback'
    );
  }
  const joined = args.join(' ');
  return MUTATING_PATTERN.test(joined);
}

/**
 * @param {string[]} args
 */
function objectStorageCliExitCodeForState(state) {
  return state === 'unknown' ? 1 : 0;
}

/**
 * @param {string[]} args
 */
async function objectStorageCliMain(args) {
  const [command, profileId, extra] = args;
  if (
    extra ||
    !['plan', 'ensure', 'status'].includes(command) ||
    (profileId !== 'dev' && profileId !== 'release')
  ) {
    process.exitCode = 2;
    return;
  }

  if (command === 'plan') {
    const result = planObjectStorage(profileId);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = objectStorageCliExitCodeForState(result.state);
    return;
  }
  if (command === 'status') {
    const result = statusObjectStorage(profileId);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = objectStorageCliExitCodeForState(result.state);
    return;
  }

  if (process.env.OFFSCREEN_OBJECT_STORAGE_ENSURE !== 'authorized') {
    process.stderr.write('object storage ensure is not authorized\n');
    process.exitCode = 2;
    return;
  }

  const result = await ensureObjectStorage(profileId, { authorize: true });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  objectStorageCliMain(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

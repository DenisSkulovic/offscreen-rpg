#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import { DEV_S3_PVC, DEV_S3_SECRET } from './dev-bootstrap.mjs';
import {
  ensureObjectStorage,
  planObjectStorage,
} from './providers/seaweedfs/install.mjs';

const releaseProfile = readPlatformProfile('release');
export const RELEASE_S3_CONTEXT = releaseProfile.contextName;
export const RELEASE_S3_NAMESPACE = releaseProfile.namespaces.objectStorage;
export const RELEASE_S3_STORAGE_CLASS = releaseProfile.storageClass;
export const RELEASE_S3_OWNER = releaseProfile.ownerValue;

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function collectReleaseObjectStorageProbe(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  /** @type {{ kind: string, name: string, reason: string }[]} */
  const unreadables = [];
  /** @type {object[]} */
  const resources = [];

  const reads = [
    {
      profileId: 'release',
      resource: 'namespace',
      name: RELEASE_S3_NAMESPACE,
      kind: 'Namespace',
    },
    {
      profileId: 'release',
      resource: 'secret',
      name: DEV_S3_SECRET,
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Secret',
    },
    {
      profileId: 'release',
      resource: 'pvc',
      name: DEV_S3_PVC,
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'PersistentVolumeClaim',
    },
    {
      profileId: 'release',
      resource: 'deployment',
      name: 'object-store',
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Deployment',
    },
    {
      profileId: 'release',
      resource: 'service',
      name: 'object-store',
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Service',
    },
  ];

  for (const spec of reads) {
    const result = readPlatformObject(spec, { run });
    if (result.state === 'unreadable') {
      unreadables.push({
        kind: spec.kind,
        name: spec.name,
        reason: result.reason,
      });
      continue;
    }
    if (result.state === 'absent') continue;
    const object = result.object;
    resources.push({
      kind: spec.kind,
      name: spec.name,
      namespace: object.metadata?.namespace,
      owner: object.metadata?.labels?.['offscreen.rpg/lab'] ?? null,
      uid: object.metadata?.uid ?? null,
      image: object.spec?.template?.spec?.containers?.[0]?.image,
      serviceType: object.spec?.type,
      storageClass: object.spec?.storageClassName,
    });
  }

  const storage = run('kubectl', [
    '--context',
    RELEASE_S3_CONTEXT,
    'get',
    'storageclass',
    RELEASE_S3_STORAGE_CLASS,
    '-o',
    'jsonpath={.metadata.name}',
  ]);

  return {
    context: RELEASE_S3_CONTEXT,
    clusterName: releaseProfile.clusterName,
    baselineOwner: RELEASE_S3_OWNER,
    storageClass: storage.ok ? (storage.stdout ?? '').trim() : null,
    unreadables,
    resources,
  };
}

/**
 * @param {object} probe
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function planReleaseObjectStorageInstall(probe, deps = {}) {
  void probe;
  return {
    ...planObjectStorage('release', { run: deps.run }),
    readOnly: true,
    storageClass: RELEASE_S3_STORAGE_CLASS,
  };
}

/**
 * @param {object} probe
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function ensureReleaseObjectStorageInstall(probe, deps = {}) {
  void probe;
  const plan = planObjectStorage('release', { run: deps.run });
  if (plan.state === 'native-noop') {
    return { ...plan, ok: true, mutated: false, actions: [] };
  }
  if (plan.state === 'absent') {
    return { ...plan, ok: true, mutated: false, actions: [] };
  }
  const refusals =
    plan.state === 'unknown'
      ? [{ id: 'unreadable-state', detail: plan.reason }]
      : [{ id: 'install-refused', detail: plan.reason }];
  return { ...plan, ok: false, mutated: false, refusals, actions: [] };
}

/**
 * @param {{
 *   collect?: () => object,
 *   run?: (command: string, args: string[], options?: { input?: string }) => { ok: boolean, stdout?: string, stderr?: string },
 *   generateCredentials?: () => { accessKeyId: string, secretAccessKey: string },
 *   stateRoot?: string,
 *   readIdentity?: (profileId: 'dev' | 'release') => Promise<{ state: string, identity?: object, reason?: string }>,
 *   now?: () => number,
 *   budgetMs?: number,
 *   mutationCommands?: string[],
 * }} [deps]
 */
export async function executeReleaseObjectStorageInstall(deps = {}) {
  void deps.collect;
  const run = deps.run ?? runPlatformCommand;
  return ensureObjectStorage('release', {
    authorize: true,
    run,
    generateCredentials:
      deps.generateCredentials ??
      (() => ({
        accessKeyId: randomBytes(12).toString('hex'),
        secretAccessKey: randomBytes(24).toString('hex'),
      })),
    stateRoot: deps.stateRoot,
    readIdentity: deps.readIdentity,
    now: deps.now,
    budgetMs: deps.budgetMs,
    mutationCommands: deps.mutationCommands,
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  assertPlatformTarget('release');
  const result = await executeReleaseObjectStorageInstall();
  process.stdout.write(
    `${JSON.stringify({ ...result, actions: result.actions })}\n`,
  );
  process.exitCode = result.ok ? 0 : 1;
}

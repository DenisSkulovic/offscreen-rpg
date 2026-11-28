/**
 * Owner entrypoint: one-use synthetic acceptance marker preparation (G4b).
 *
 *   OFFSCREEN_OBJECT_STORAGE_MARKER_PREPARE=authorized \
 *   OFFSCREEN_OBJECT_STORAGE_MAINTENANCE=quiesced \
 *   node infra/platform/object-storage/providers/seaweedfs/prepare-marker.mjs \
 *     dev --confirm-context kind-offscreen-dev --descriptor-file <new-private-path>
 *
 * Creates exactly one bucket `offscreen-e2-marker-<128-bit hex>` and one
 * object `retained-marker.bin` (64 random bytes), verifies it by GET, and
 * persists the descriptor consumed by `install.mjs upgrade-metrics
 * --marker-file`. No retry, delete, rollback, policy/IAM or Helm operation.
 * Any uncertainty retains the durable intent and refuses later mutations.
 */
import process from 'node:process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPlatformCommand } from '../../../common/commands.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';
import { MIN_HOST_MEMORY_MIB, parseMeminfoMiB } from '../../../../clusters/kind/manager/host-probe.mjs';
import { readExistingRegistryV2 } from '../../../../../tools/dev-environments/src/domain/dev-worktree-registry.mjs';
import { assertMetricsQuiescence } from './install.mjs';
import { withObjectStorageMarkerPreparation } from './mutation-guard.mjs';
import {
  observeObjectStorageHistory,
  observeOwnedMarkerPreparation,
  observeOwnerPredecessorBeforeIntent,
} from './observe.mjs';

const MARKER_KEY = 'retained-marker.bin';
const MARKER_BYTES = 64;

class MarkerRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'MarkerRefusal';
  }
}

function canonicalRegistryRoot() {
  return join(homedir(), '.local', 'state', 'offscreen-rpg', 'dev-worktree-registry');
}

function fsyncDirectory(dir) {
  const fd = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * The descriptor destination must be a new absolute path whose parent is a
 * private (0700-class), owner-held directory and which does not yet exist.
 * @param {string} path
 */
export function assertDescriptorDestination(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || basename(path) === '' || path.includes('\0')) {
    throw new MarkerRefusal('marker descriptor destination must be an absolute path');
  }
  const directory = dirname(path);
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) throw new Error('x');
  } catch {
    throw new MarkerRefusal('marker descriptor directory is not private');
  }
  try {
    lstatSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw new MarkerRefusal('marker descriptor destination is unreadable');
  }
  throw new MarkerRefusal('marker descriptor destination already exists');
}

/**
 * Exclusive no-follow 0600 creation with durable fsync of file and directory.
 * @param {string} path
 * @param {object} descriptor
 */
export function writeDescriptorFile(path, descriptor) {
  assertDescriptorDestination(path);
  const fd = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const stat = fstatSync(fd);
    const named = lstatSync(path);
    if (
      !stat.isFile() || named.isSymbolicLink() || stat.dev !== named.dev || stat.ino !== named.ino ||
      stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid()
    ) {
      throw new MarkerRefusal('marker descriptor file is not private');
    }
    const body = Buffer.from(`${JSON.stringify(descriptor)}\n`, 'utf8');
    if (writeSync(fd, body, 0, body.length) !== body.length) throw new MarkerRefusal('marker descriptor write incomplete');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fsyncDirectory(dirname(path));
}

/**
 * @param {{ confirmContext: string, descriptorPath: string }} request
 * @param {object} [deps] fixture seams; defaults are the real observers
 */
export async function prepareObjectStorageMarker(request, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile('dev');
  const base = {
    mode: /** @type {const} */ ('prepare-marker'),
    profileId: /** @type {const} */ ('dev'),
    context: profile.contextName,
    namespace: profile.namespaces.objectStorage,
  };
  const refuse = (reason, extra = {}) => ({ ...base, ok: false, mutated: false, intentRetained: false, reason, ...extra });
  if (request.confirmContext !== profile.contextName) return refuse('confirmed context does not match');
  const env = deps.env ?? process.env;
  if (
    env.OFFSCREEN_OBJECT_STORAGE_MARKER_PREPARE !== 'authorized' ||
    env.OFFSCREEN_OBJECT_STORAGE_MAINTENANCE !== 'quiesced'
  ) {
    return refuse('marker preparation is not authorized');
  }
  const registryRoot = deps.registryRoot ?? canonicalRegistryRoot();
  const override = env.OFFSCREEN_DEV_WORKTREE_REGISTRY?.trim();
  if (deps.registryRoot === undefined && override && resolve(override) !== registryRoot) {
    return refuse('noncanonical dev registry override refused');
  }
  try {
    assertDescriptorDestination(request.descriptorPath);
  } catch (error) {
    return refuse(error.message);
  }

  const observeDeps = { run, stateRoot: deps.stateRoot };
  const obs = {
    history: observeObjectStorageHistory,
    before: observeOwnerPredecessorBeforeIntent,
    owned: observeOwnedMarkerPreparation,
    ...deps.observers,
  };
  const memory = () => {
    let text;
    try {
      text = (deps.readMeminfo ?? (() => readFileSync('/proc/meminfo', 'utf8')))();
    } catch {
      throw new MarkerRefusal('host memory is unreadable');
    }
    const { memAvailableMiB } = parseMeminfoMiB(text);
    if (memAvailableMiB === null || memAvailableMiB < MIN_HOST_MEMORY_MIB) {
      throw new MarkerRefusal('host memory is insufficient');
    }
  };
  const quiescence = () =>
    (deps.assertQuiescence ?? assertMetricsQuiescence)({
      run,
      contextName: profile.contextName,
      registryRoot,
      readRegistry: deps.readRegistry ?? readExistingRegistryV2,
    });
  const sdk = () => import('./live-sdk.mjs');
  const bucketAbsent = deps.bucketAbsent ?? (async (bucket, secret) => (await sdk()).markerBucketAbsent(bucket, secret));
  const writeMarker = deps.writeMarker ?? (async (d, bytes, secret) => (await sdk()).writeMarkerObject(d, bytes, secret));
  const readMarker = deps.readMarker ?? (async (d, secret) => (await sdk()).readMarkerObject(d, secret));
  const persistDescriptor = deps.persistDescriptor ?? writeDescriptorFile;

  let handle;
  let writeStarted = false;
  try {
    return await withObjectStorageMarkerPreparation(
      async (session) => {
        const history = obs.history('dev', observeDeps);
        if (history.historyId !== 'dev-base-r1') {
          return refuse(history.reason ?? 'object-store history is not the exact predecessor');
        }
        quiescence();
        memory();
        const before = obs.before('dev-base-r1', observeDeps);
        if (!before.ok) return refuse(before.reason);
        const c = before.chain;
        const secret = { uid: c.secretUid, resourceVersion: c.secretResourceVersion };

        const bytes = (deps.randomBytes ?? randomBytes)(MARKER_BYTES);
        const descriptor = {
          schema: 1,
          bucket: `offscreen-e2-marker-${(deps.randomBytes ?? randomBytes)(16).toString('hex')}`,
          key: MARKER_KEY,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          size: bytes.length,
        };

        let absent;
        try {
          absent = await bucketAbsent(descriptor.bucket, secret);
        } catch {
          throw new MarkerRefusal('marker bucket absence could not be verified');
        }
        if (absent !== true) return refuse('marker bucket already exists');
        // Repeat immediately before the first write.
        quiescence();
        memory();
        handle = session.recordIntent({
          schema: 2,
          operation: 'prepare-marker',
          profileId: 'dev',
          contextName: profile.contextName,
          startedAt: new Date().toISOString(),
          operationId: (deps.operationId ?? randomUUID)(),
          identity: { ...c },
          details: { descriptor, descriptorPath: request.descriptorPath },
        });
        const recheck = obs.owned(handle, { run });
        if (!recheck.ok || JSON.stringify(recheck.chain) !== JSON.stringify(c)) {
          throw new MarkerRefusal('predecessor identity changed before marker write');
        }
        session.authorizeWrite(handle);
        writeStarted = true;
        await writeMarker({ bucket: descriptor.bucket, key: descriptor.key }, bytes, secret);

        let read;
        try {
          read = await readMarker({ bucket: descriptor.bucket, key: descriptor.key }, secret);
        } catch {
          throw new MarkerRefusal('marker readback failed');
        }
        if (read?.sha256 !== descriptor.sha256 || read?.size !== descriptor.size) {
          throw new MarkerRefusal('marker readback does not match');
        }
        const final = obs.owned(handle, { run });
        if (!final.ok || JSON.stringify(final.chain) !== JSON.stringify(c)) {
          throw new MarkerRefusal('owner chain changed after marker write');
        }
        persistDescriptor(request.descriptorPath, descriptor);
        session.clearIntent(handle);
        return {
          ...base,
          ok: true,
          mutated: true,
          intentRetained: false,
          state: 'marker-prepared',
          descriptorPath: request.descriptorPath,
          marker: { bucket: descriptor.bucket, sha256: descriptor.sha256, size: descriptor.size },
        };
      },
      { stateRoot: deps.stateRoot, now: deps.now, budgetMs: deps.budgetMs },
    );
  } catch (error) {
    const safe =
      error instanceof Error &&
      (error.name === 'OwnerRefusal' || error.name === 'MarkerRefusal' ||
        error.message.startsWith('Object storage') || error.message.startsWith('marker '));
    return {
      ...refuse(safe ? error.message : 'marker preparation failed (details withheld)'),
      mutated: writeStarted,
      intentRetained: handle !== undefined,
    };
  }
}

async function main(args) {
  if (
    args.length !== 5 ||
    args[0] !== 'dev' ||
    args[1] !== '--confirm-context' ||
    args[3] !== '--descriptor-file' ||
    !args[2] ||
    !args[4]
  ) {
    process.exitCode = 2;
    return;
  }
  const result = await prepareObjectStorageMarker({ confirmContext: args[2], descriptorPath: args[4] });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch(() => {
    process.stderr.write('marker preparation refused\n');
    process.exitCode = 1;
  });
}

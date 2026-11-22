import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

export class PendingIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PendingIntentError';
  }
}

const TTL_MS = 24 * 60 * 60 * 1000;

export const frozenResolutionEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('resolution'),
  ownerId: z.string().min(1),
  storyId: z.uuid(),
  operationId: z.uuid(),
  endpoint: z.string().min(1),
  body: z.strictObject({
    expectedRevision: z.number().int().positive(),
    submission: z.unknown(),
  }),
  requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.number().int().positive(),
});

export type FrozenResolutionEnvelope = z.infer<
  typeof frozenResolutionEnvelopeSchema
>;

export const launchPointerSchema = z.strictObject({
  version: z.literal(1),
  ownerId: z.string().min(1),
  operationId: z.uuid(),
  requestHash: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: z.number().int().positive(),
});

export type LaunchPointer = z.infer<typeof launchPointerSchema>;

async function assertNotSymlink(path: string): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink()) {
    throw new PendingIntentError('Refusing symlinked state path.');
  }
}

async function assertOwnerOnlyMode(path: string): Promise<void> {
  const info = await stat(path);
  const mode = info.mode & 0o777;
  if (mode !== 0o600) {
    throw new PendingIntentError('State file must be owner-only mode 0600.');
  }
}

async function writeSecureJson(path: string, payload: unknown): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await assertNotSymlink(dir);
  } catch (error) {
    if (!(error instanceof PendingIntentError)) {
      throw error;
    }
  }
  const tempPath = `${path}.tmp.${randomBytes(8).toString('hex')}`;
  const body = `${JSON.stringify(payload)}\n`;
  try {
    await writeFile(tempPath, body, { encoding: 'utf8', mode: 0o600 });
    await rename(tempPath, path);
    await chmod(path, 0o600);
    await assertNotSymlink(path);
    await assertOwnerOnlyMode(path);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function readSecureJson(path: string): Promise<unknown | null> {
  try {
    await assertNotSymlink(path);
    await assertOwnerOnlyMode(path);
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }
}

function assertFresh(createdAt: number): void {
  if (Date.now() - createdAt > TTL_MS) {
    throw new PendingIntentError('Stored intent expired.');
  }
}

export async function loadPendingResolution(
  filePath: string,
  ownerId: string,
  storyId: string,
): Promise<FrozenResolutionEnvelope | null> {
  const parsed = frozenResolutionEnvelopeSchema.safeParse(
    await readSecureJson(filePath),
  );
  if (!parsed.success) {
    return null;
  }
  try {
    assertFresh(parsed.data.createdAt);
  } catch {
    await clearPendingResolution(filePath);
    return null;
  }
  if (parsed.data.ownerId !== ownerId || parsed.data.storyId !== storyId) {
    await clearPendingResolution(filePath);
    return null;
  }
  return parsed.data;
}

export async function savePendingResolution(
  filePath: string,
  envelope: FrozenResolutionEnvelope,
): Promise<void> {
  await writeSecureJson(filePath, envelope);
}

export async function clearPendingResolution(filePath: string): Promise<void> {
  try {
    await assertNotSymlink(filePath);
    await unlink(filePath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

export async function loadLaunchPointer(
  filePath: string,
  ownerId: string,
): Promise<LaunchPointer | null> {
  const parsed = launchPointerSchema.safeParse(await readSecureJson(filePath));
  if (!parsed.success) {
    return null;
  }
  try {
    assertFresh(parsed.data.createdAt);
  } catch {
    await clearLaunchPointer(filePath);
    return null;
  }
  if (parsed.data.ownerId !== ownerId) {
    await clearLaunchPointer(filePath);
    return null;
  }
  return parsed.data;
}

export async function saveLaunchPointer(
  filePath: string,
  pointer: LaunchPointer,
): Promise<void> {
  await writeSecureJson(filePath, pointer);
}

export async function clearLaunchPointer(filePath: string): Promise<void> {
  try {
    await assertNotSymlink(filePath);
    await unlink(filePath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
}

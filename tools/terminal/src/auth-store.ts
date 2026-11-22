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

export type StoredTerminalAuth = {
  apiOrigin: string;
  token: string;
  expiresAt: string;
  scope: 'player-story';
};

export class AuthStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthStoreError';
  }
}

async function assertNotSymlink(path: string): Promise<void> {
  const info = await lstat(path);
  if (info.isSymbolicLink()) {
    throw new AuthStoreError('Refusing symlinked credential path.');
  }
}

async function assertOwnerOnlyMode(path: string): Promise<void> {
  const info = await stat(path);
  const mode = info.mode & 0o777;
  if (mode !== 0o600) {
    throw new AuthStoreError('Credential file must be owner-only mode 0600.');
  }
}

export async function readStoredAuth(
  filePath: string,
): Promise<StoredTerminalAuth | null> {
  let raw: string;
  try {
    await assertNotSymlink(filePath);
    await assertOwnerOnlyMode(filePath);
    raw = await readFile(filePath, 'utf8');
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
  const parsed = JSON.parse(raw) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('token' in parsed) ||
    !('apiOrigin' in parsed) ||
    !('expiresAt' in parsed) ||
    !('scope' in parsed)
  ) {
    throw new AuthStoreError('Credential file is corrupt.');
  }
  const record = parsed as StoredTerminalAuth;
  if (record.scope !== 'player-story') {
    throw new AuthStoreError('Credential file has unexpected scope.');
  }
  return record;
}

export async function writeStoredAuth(
  filePath: string,
  auth: StoredTerminalAuth,
): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await assertNotSymlink(dir);
  } catch (error) {
    if (!(error instanceof AuthStoreError)) {
      throw error;
    }
  }
  const tempPath = `${filePath}.tmp.${randomBytes(8).toString('hex')}`;
  const body = `${JSON.stringify(auth)}\n`;
  try {
    await writeFile(tempPath, body, { encoding: 'utf8', mode: 0o600 });
    await rename(tempPath, filePath);
    await chmod(filePath, 0o600);
    await assertNotSymlink(filePath);
    await assertOwnerOnlyMode(filePath);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

export async function clearStoredAuth(filePath: string): Promise<void> {
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

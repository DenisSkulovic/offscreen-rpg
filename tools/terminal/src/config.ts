import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Normalize configured API origin (no trailing slash on path). */
export function normalizeApiOrigin(raw: string): string {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/\/+$/, '') || '';
  return url.toString().replace(/\/$/, '');
}

export function assertAllowedApiOrigin(raw: string): URL {
  const url = new URL(raw);
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
    throw new TerminalConfigError(
      'API origin must use HTTPS (HTTP is allowed only on loopback).',
    );
  }
  return url;
}

export class TerminalConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalConfigError';
  }
}

export function originStorageKey(apiOrigin: string): string {
  return createHash('sha256').update(apiOrigin, 'utf8').digest('hex');
}

export function defaultAuthFilePath(apiOrigin: string): string {
  const key = originStorageKey(apiOrigin);
  return join(
    homedir(),
    '.config',
    'offscreen-rpg',
    'terminal',
    key,
    'auth.json',
  );
}

export function defaultStateRoot(apiOrigin: string): string {
  const key = originStorageKey(apiOrigin);
  return join(homedir(), '.local', 'state', 'offscreen-rpg', key);
}

export function launchPointerFilePath(
  apiOrigin: string,
  ownerId: string,
): string {
  return join(defaultStateRoot(apiOrigin), ownerId, 'launch-pointer.json');
}

export function pendingResolutionFilePath(
  apiOrigin: string,
  ownerId: string,
  storyId: string,
): string {
  return join(
    defaultStateRoot(apiOrigin),
    ownerId,
    'stories',
    storyId,
    'pending-resolution.json',
  );
}

export function resolveApiOriginFromEnv(): string | undefined {
  const value = process.env['OFFSCREEN_API_ORIGIN']?.trim();
  return value && value.length > 0 ? value : undefined;
}

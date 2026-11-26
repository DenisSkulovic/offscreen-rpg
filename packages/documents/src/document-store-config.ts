import { resolve } from 'node:path';
import { LocalDocumentStore, type DocumentStore } from './local-store.js';
import { S3DocumentStore } from './s3-store.js';

export type DocumentStoreMode = 'local' | 's3';

/**
 * Parse OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE. Omitted or empty uses
 * {@link Boolean(endpoint)} (path style when an endpoint is set).
 */
export function parseDocumentS3ForcePathStyle(
  raw: string | undefined,
  endpoint: string | undefined,
): boolean {
  const trimmed = raw?.trim();
  if (!trimmed) return Boolean(endpoint);
  const lower = trimmed.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  throw new Error(
    `OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE must be true, false, 1, or 0 (got ${JSON.stringify(trimmed)})`,
  );
}

/**
 * Resolve the process DocumentStore from environment.
 * Unset OFFSCREEN_DOCUMENT_STORE keeps prior behavior: local when
 * OFFSCREEN_DOCUMENT_ROOT is set, otherwise undefined.
 * S3 mode fails closed on missing required config (no silent local fallback).
 */
export function createDocumentStoreFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DocumentStore | undefined {
  const mode = (env['OFFSCREEN_DOCUMENT_STORE'] ?? '').trim().toLowerCase();
  if (mode === 's3') {
    const bucket = required(env, 'OFFSCREEN_DOCUMENT_S3_BUCKET');
    const region = env['OFFSCREEN_DOCUMENT_S3_REGION']?.trim() || 'us-east-1';
    const endpoint = env['OFFSCREEN_DOCUMENT_S3_ENDPOINT']?.trim();
    const prefix = env['OFFSCREEN_DOCUMENT_S3_PREFIX']?.trim();
    const accessKeyId = env['OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID']?.trim();
    const secretAccessKey =
      env['OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY']?.trim();
    if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
      throw new Error(
        'OFFSCREEN_DOCUMENT_S3_ACCESS_KEY_ID and OFFSCREEN_DOCUMENT_S3_SECRET_ACCESS_KEY must be set together',
      );
    }
    return new S3DocumentStore({
      bucket,
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: parseDocumentS3ForcePathStyle(
        env['OFFSCREEN_DOCUMENT_S3_FORCE_PATH_STYLE'],
        endpoint,
      ),
      ...(prefix ? { prefix } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }
  if (mode && mode !== 'local') {
    throw new Error(
      `Unknown OFFSCREEN_DOCUMENT_STORE=${mode}; expected local|s3`,
    );
  }
  const documentRoot = env['OFFSCREEN_DOCUMENT_ROOT']?.trim();
  if (!documentRoot) return undefined;
  return new LocalDocumentStore(resolve(documentRoot));
}

function required(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required when OFFSCREEN_DOCUMENT_STORE=s3`);
  }
  return value;
}

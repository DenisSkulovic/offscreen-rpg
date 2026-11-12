import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { ZodType } from 'zod';
import { apiInternalOrigin } from './api-origin';
import { classifyNestStatus } from '@/src/shared/api/classify-nest-status';
import { NestTransientError } from '@/src/shared/api/nest-errors';
import { parseNestJson } from './parse-nest-json';

export type ServerRequestContext = {
  cookie: string;
};

export { parseNestJson };

const DEFAULT_TIMEOUT_MS = 5000;

export async function nestFetch(
  ctx: ServerRequestContext,
  path: string,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return await fetch(`${apiInternalOrigin()}${path}`, {
      headers: { cookie: ctx.cookie },
      cache: 'no-store',
      signal: options?.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new NestTransientError(0, 'Nest request timed out or failed');
  }
}

/** Map non-success Nest status to Next route outcomes. Never call inside a catch-all. */
export function applyNestRoutePolicy(status: number): never {
  const classified = classifyNestStatus(status);
  if (classified.kind === 'unauthorized') redirect('/sign-in');
  if (classified.kind === 'not_found') notFound();
  throw new NestTransientError(
    classified.kind === 'transient' ? classified.status : status,
  );
}

export async function readNestJson<T>(
  ctx: ServerRequestContext,
  path: string,
  schema: ZodType<T>,
  options?: { timeoutMs?: number; optional?: false },
): Promise<T>;
export async function readNestJson<T>(
  ctx: ServerRequestContext,
  path: string,
  schema: ZodType<T>,
  options: { timeoutMs?: number; optional: true },
): Promise<T | null>;
export async function readNestJson<T>(
  ctx: ServerRequestContext,
  path: string,
  schema: ZodType<T>,
  options?: { timeoutMs?: number; optional?: boolean },
): Promise<T | null> {
  const response = await nestFetch(ctx, path, options);
  const classified = classifyNestStatus(response.status);
  if (classified.kind === 'success') {
    return parseNestJson(response, schema);
  }
  if (classified.kind === 'not_found' && options?.optional) {
    return null;
  }
  applyNestRoutePolicy(response.status);
}

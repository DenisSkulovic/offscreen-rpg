import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  PATHNAME_HEADER,
  signInHrefFor,
} from '@/src/features/session/safe-entry-destination';
import { nestFetch, type ServerRequestContext } from './nest-reader';
import { NestTransientError } from './nest-errors';
import { parseNestJson } from './parse-nest-json';

const viewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type Viewer = z.infer<typeof viewerSchema>;

export type ViewerContext = ServerRequestContext & {
  user: Viewer;
};

/**
 * Request-memoized session gate for private SSR. Layout may call this for a shell
 * check; each page must still perform owner-scoped Nest reads. Not endpoint auth.
 */
export const requireViewer = cache(async (): Promise<ViewerContext> => {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie') ?? '';
  const response = await nestFetch({ cookie }, '/api/me');
  if (response.status === 401) {
    redirect(signInHrefFor(requestHeaders.get(PATHNAME_HEADER)));
  }
  if (!response.ok) {
    throw new NestTransientError(
      response.status,
      'Account could not be loaded',
    );
  }
  const user = await parseNestJson(response, viewerSchema);
  return { user, cookie };
});

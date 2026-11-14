import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  adminSelfV1Schema,
  type AdminSelfV1,
} from '@offscreen/contracts/admin';
import { PATHNAME_HEADER } from '@/src/features/session/safe-entry-destination';
import { signInHrefForControl } from '@/src/features/admin/safe-control-destination';
import { nestFetch, type ServerRequestContext } from './nest-reader';
import { NestTransientError } from './nest-errors';
import { parseNestJson } from './parse-nest-json';

export type AdminActorContext = ServerRequestContext & {
  self: AdminSelfV1;
};

/**
 * Staff session gate for /control shell. Does not authorize resource reads —
 * each page still calls Nest Admin endpoints which re-check policy.
 */
export const requireAdminActor = cache(async (): Promise<AdminActorContext> => {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie') ?? '';
  const pathname = requestHeaders.get(PATHNAME_HEADER) ?? '/control';
  const response = await nestFetch({ cookie }, '/api/admin/me');
  if (response.status === 401) {
    redirect(signInHrefForControl(pathname));
  }
  if (response.status === 403) {
    // Missing Admin purpose session or not staff — enter flow handles both.
    redirect('/control/enter');
  }
  if (!response.ok) {
    throw new NestTransientError(
      response.status,
      'Admin session could not be loaded',
    );
  }
  const self = await parseNestJson(response, adminSelfV1Schema);
  return { self, cookie };
});

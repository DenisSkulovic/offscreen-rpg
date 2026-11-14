import { z } from 'zod';

/** Safe staff self projection for AD01 session enter/me. No customer data. */
export const adminSelfV1Schema = z.strictObject({
  version: z.literal(1),
  staffPrincipalId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
  accessEpoch: z.number().int().positive(),
  sessionExpiresAt: z.string().datetime(),
  idleExpiresAt: z.string().datetime(),
  /** Empty until AD02 activates grants; inert bootstrap package never widens this. */
  workspaceFamilies: z.array(z.string().min(1).max(64)).max(32),
});
export type AdminSelfV1 = z.infer<typeof adminSelfV1Schema>;

export const adminErrorV1Schema = z.strictObject({
  version: z.literal(1),
  code: z.enum([
    'unauthenticated',
    'staff_session_required',
    'not_found',
    'not_authorized',
    'step_up_required',
    'approval_required',
    'invalid_request',
    'conflict',
    'rate_limited',
    'unavailable',
  ]),
  requestId: z.string().min(1).max(128),
});
export type AdminErrorV1 = z.infer<typeof adminErrorV1Schema>;

export const ADMIN_BOOTSTRAP_PACKAGE_ID = 'admin-reader' as const;
export const ADMIN_BOOTSTRAP_PACKAGE_VERSION = 1 as const;

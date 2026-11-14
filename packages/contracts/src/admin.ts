import { z } from 'zod';

/** Safe staff self projection for AD01 session enter/me. No customer data. */
export const adminSelfV1Schema = z.strictObject({
  version: z.literal(1),
  staffPrincipalId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
  accessEpoch: z.number().int().positive(),
  sessionExpiresAt: z.string().datetime(),
  idleExpiresAt: z.string().datetime(),
  /** From active package grants only; inert/revoked assignments contribute nothing. */
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

export const adminAccessDecisionV1Schema = z.strictObject({
  version: z.literal(1),
  decision: z.enum([
    'allow',
    'deny',
    'approval_required',
    'step_up_required',
    'unavailable',
  ]),
  reason: z.string().min(1).max(64),
  decisionId: z.string().min(1).max(128),
  matchedPackageId: z.string().min(1).max(64).optional(),
});
export type AdminAccessDecisionV1 = z.infer<typeof adminAccessDecisionV1Schema>;

export const adminStaffAccessV1Schema = z.strictObject({
  version: z.literal(1),
  staffPrincipalId: z.string().uuid(),
  packages: z
    .array(
      z.strictObject({
        packageId: z.string().min(1).max(64),
        packageVersion: z.number().int().positive(),
        status: z.enum(['inert', 'active', 'revoked']),
        workspaceFamilies: z.array(z.string().min(1).max(64)).max(32),
      }),
    )
    .max(32),
});
export type AdminStaffAccessV1 = z.infer<typeof adminStaffAccessV1Schema>;

export const ADMIN_BOOTSTRAP_PACKAGE_ID = 'admin-reader' as const;
export const ADMIN_BOOTSTRAP_PACKAGE_VERSION = 1 as const;

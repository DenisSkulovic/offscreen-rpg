import { z } from 'zod';

const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const createTerminalPairingSchema = z.strictObject({
  challengeSha256: sha256HexSchema,
  label: z.string().min(1).max(64),
});

export type CreateTerminalPairingRequest = z.infer<
  typeof createTerminalPairingSchema
>;

export const terminalPairingCreatedSchema = z.strictObject({
  pairingId: z.uuid(),
  code: z.string().min(10).max(10),
  verificationUri: z.string().url(),
  expiry: z.iso.datetime(),
  pollAfterSeconds: z.literal(2),
});

export type TerminalPairingCreated = z.infer<
  typeof terminalPairingCreatedSchema
>;

export const approveTerminalPairingSchema = z.strictObject({
  userCode: z.string().min(10).max(10),
});

export type ApproveTerminalPairingRequest = z.infer<
  typeof approveTerminalPairingSchema
>;

export const exchangeTerminalPairingSchema = z.strictObject({
  verifier: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export type ExchangeTerminalPairingRequest = z.infer<
  typeof exchangeTerminalPairingSchema
>;

export const terminalAccessTokenIssuedSchema = z.strictObject({
  token: z.string().min(1),
  scope: z.literal('player-story'),
  expiresAt: z.iso.datetime(),
});

export type TerminalAccessTokenIssued = z.infer<
  typeof terminalAccessTokenIssuedSchema
>;

export const terminalTokenCurrentSchema = z.strictObject({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  scope: z.literal('player-story'),
  expiresAt: z.iso.datetime(),
});

export type TerminalTokenCurrent = z.infer<typeof terminalTokenCurrentSchema>;

/** Browser consent page metadata; code is never embedded in URLs. */
export const terminalPairingConsentSchema = z.strictObject({
  pairingId: z.uuid(),
  clientLabel: z.string().min(1).max(64),
  pairingExpiresAt: z.iso.datetime(),
  accessDurationDays: z.literal(7),
  scope: z.literal('player-story'),
});

export type TerminalPairingConsent = z.infer<
  typeof terminalPairingConsentSchema
>;
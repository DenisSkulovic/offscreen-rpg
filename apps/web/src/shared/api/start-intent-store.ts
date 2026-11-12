import { z } from 'zod';
import { paceSchema } from '@offscreen/game/time';
import { startPackageReferenceSchema } from '@offscreen/contracts/campaign';

const TTL_MS = 24 * 60 * 60 * 1000;
const storagePrefix = 'offscreen:start-intent:v1';

/** Minimal Start campaign slice frozen at first submit (no secrets / prose). */
export const frozenStartCampaignSchema = z.strictObject({
  mechanics: z.boolean(),
  locked: z.boolean(),
  pace: paceSchema.optional(),
  startPackage: startPackageReferenceSchema.optional(),
});

export const frozenStartEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('start'),
  viewerId: z.string().min(1),
  draftId: z.uuid(),
  storyId: z.uuid(),
  candidateId: z.uuid(),
  expectedDraftRevision: z.number().int().positive().max(2147483646),
  campaign: frozenStartCampaignSchema,
  createdAt: z.number().int().positive(),
});

export type FrozenStartEnvelope = z.infer<typeof frozenStartEnvelopeSchema>;

function storageKey(viewerId: string, storyId: string) {
  return `${storagePrefix}:${viewerId}:${storyId}`;
}

function readRaw(key: string): unknown {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadStartEnvelope(
  viewerId: string,
  storyId: string,
): FrozenStartEnvelope | null {
  const parsed = frozenStartEnvelopeSchema.safeParse(
    readRaw(storageKey(viewerId, storyId)),
  );
  if (!parsed.success) {
    return null;
  }
  if (Date.now() - parsed.data.createdAt > TTL_MS) {
    clearStartEnvelope(viewerId, storyId);
    return null;
  }
  if (parsed.data.viewerId !== viewerId || parsed.data.storyId !== storyId) {
    clearStartEnvelope(viewerId, storyId);
    return null;
  }
  return parsed.data;
}

export function saveStartEnvelope(envelope: FrozenStartEnvelope) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(
    storageKey(envelope.viewerId, envelope.storyId),
    JSON.stringify(envelope),
  );
}

export function clearStartEnvelope(viewerId: string, storyId: string) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(storageKey(viewerId, storyId));
}

/** Reject corrupted/foreign captures without inventing a replacement body. */
export function parseStartEnvelope(raw: unknown): FrozenStartEnvelope | null {
  const parsed = frozenStartEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

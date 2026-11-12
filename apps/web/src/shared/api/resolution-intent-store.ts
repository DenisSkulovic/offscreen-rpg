import { z } from 'zod';

const TTL_MS = 24 * 60 * 60 * 1000;
const storagePrefix = 'offscreen:resolution-intent:v1';

export const frozenResolutionEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('resolution'),
  viewerId: z.string().min(1),
  storyId: z.uuid(),
  operationId: z.uuid(),
  endpoint: z.string().min(1),
  body: z.strictObject({
    expectedRevision: z.number().int().positive(),
    submission: z.unknown(),
  }),
  requestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.number().int().positive(),
});

export type FrozenResolutionEnvelope = z.infer<
  typeof frozenResolutionEnvelopeSchema
>;

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

export function loadResolutionEnvelope(
  viewerId: string,
  storyId: string,
): FrozenResolutionEnvelope | null {
  const parsed = frozenResolutionEnvelopeSchema.safeParse(
    readRaw(storageKey(viewerId, storyId)),
  );
  if (!parsed.success) {
    return null;
  }
  if (Date.now() - parsed.data.createdAt > TTL_MS) {
    clearResolutionEnvelope(viewerId, storyId);
    return null;
  }
  if (parsed.data.viewerId !== viewerId || parsed.data.storyId !== storyId) {
    clearResolutionEnvelope(viewerId, storyId);
    return null;
  }
  return parsed.data;
}

export function saveResolutionEnvelope(envelope: FrozenResolutionEnvelope) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(
    storageKey(envelope.viewerId, envelope.storyId),
    JSON.stringify(envelope),
  );
}

export function clearResolutionEnvelope(viewerId: string, storyId: string) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(storageKey(viewerId, storyId));
}

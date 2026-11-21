import { z } from 'zod';
import type { StoryLaunchRequest } from '@offscreen/contracts/story-launch';

const TTL_MS = 24 * 60 * 60 * 1000;
const storagePrefix = 'offscreen:story-launch-pointer:v1';

export const launchPointerSchema = z.strictObject({
  version: z.literal(1),
  viewerId: z.string().min(1),
  operationId: z.uuid(),
  requestHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  createdAt: z.number().int().positive(),
});

export type LaunchPointer = z.infer<typeof launchPointerSchema>;

function storageKey(viewerId: string) {
  return `${storagePrefix}:${viewerId}`;
}

function readRaw(viewerId: string): unknown {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(viewerId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadLaunchPointer(viewerId: string): LaunchPointer | null {
  const parsed = launchPointerSchema.safeParse(readRaw(viewerId));
  if (!parsed.success) {
    if (readRaw(viewerId) !== null) {
      clearLaunchPointer(viewerId);
    }
    return null;
  }
  if (Date.now() - parsed.data.createdAt > TTL_MS) {
    clearLaunchPointer(viewerId);
    return null;
  }
  if (parsed.data.viewerId !== viewerId) {
    clearLaunchPointer(viewerId);
    return null;
  }
  return parsed.data;
}

export function saveLaunchPointer(pointer: LaunchPointer) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(storageKey(pointer.viewerId), JSON.stringify(pointer));
}

export function clearLaunchPointer(viewerId: string) {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(storageKey(viewerId));
}

export function parseLaunchPointer(raw: unknown): LaunchPointer | null {
  const parsed = launchPointerSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function hashStoryLaunchRequest(
  request: StoryLaunchRequest,
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(request));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

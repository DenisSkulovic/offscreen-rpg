import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLaunchPointer,
  hashStoryLaunchRequest,
  loadLaunchPointer,
  parseLaunchPointer,
  saveLaunchPointer,
  type LaunchPointer,
} from './story-launch-intent-store';
import type { StoryLaunchRequest } from '@offscreen/contracts/story-launch';

const viewerId = 'viewer-launch';
const otherViewer = 'viewer-other';

function pointer(overrides: Partial<LaunchPointer> = {}): LaunchPointer {
  return {
    version: 1,
    viewerId,
    operationId: crypto.randomUUID(),
    requestHash: 'a'.repeat(64),
    createdAt: Date.now(),
    ...overrides,
  };
}

afterEach(() => {
  clearLaunchPointer(viewerId);
  clearLaunchPointer(otherViewer);
});

describe('story launch pointer session store', () => {
  it('round-trips a launch pointer without storing a prompt', () => {
    const saved = pointer();
    saveLaunchPointer(saved);
    const loaded = loadLaunchPointer(viewerId);
    expect(loaded).toEqual(saved);
    expect(loaded).not.toHaveProperty('prompt');
    expect(JSON.stringify(loaded)).not.toMatch(/premise|prompt/i);
  });

  it('rejects expired, cross-viewer and corrupt pointers', () => {
    saveLaunchPointer(pointer({ createdAt: Date.now() - 25 * 60 * 60 * 1000 }));
    expect(loadLaunchPointer(viewerId)).toBeNull();

    saveLaunchPointer(pointer({ viewerId: otherViewer }));
    expect(loadLaunchPointer(viewerId)).toBeNull();

    expect(
      parseLaunchPointer({
        version: 1,
        viewerId,
        operationId: 'not-a-uuid',
      }),
    ).toBeNull();
  });

  it('hashStoryLaunchRequest is stable 64 hex', async () => {
    const request: StoryLaunchRequest = {
      operationId: '550e8400-e29b-41d4-a716-446655440000',
      source: { kind: 'prompt', prompt: 'A lone outlander in Balmora.' },
    };
    const hash = await hashStoryLaunchRequest(request);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashStoryLaunchRequest(request)).toBe(hash);
  });
});

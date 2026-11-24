import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { StoryLaunchStatus } from '@offscreen/story-interface/story-launch';
import {
  clearLaunchPointer,
  saveLaunchPointer,
} from '@/src/shared/api/story-launch-intent-store';
import { useStoryLaunch } from './use-story-launch';

const viewerId = 'viewer-launch-hook';
const requestHash = 'c'.repeat(64);

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  clearLaunchPointer(viewerId);
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function statusBase(
  operationId: string,
): Pick<
  StoryLaunchStatus,
  'operationId' | 'requestHash' | 'createdAt' | 'updatedAt'
> {
  const iso = new Date().toISOString();
  return {
    operationId,
    requestHash,
    createdAt: iso,
    updatedAt: iso,
  };
}

function pendingStatus(operationId: string): StoryLaunchStatus {
  return { ...statusBase(operationId), state: 'pending' };
}

function readyStatus(operationId: string, storyId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'ready',
    storyId,
    sceneSequence: 1,
  };
}

function failedStatus(operationId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'failed',
    reason: 'rejected',
  };
}

function heldStatus(operationId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'held',
    reason: 'policy',
  };
}

function uncertainStatus(operationId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'uncertain',
    explanation: 'The launch outcome could not be confirmed yet.',
  };
}

describe('useStoryLaunch', () => {
  it('same operation is reused when the PUT response is lost', async () => {
    let putCount = 0;
    let capturedOperationId = '';

    server.use(
      http.put('/api/stories/launch/:operationId', ({ params }) => {
        putCount += 1;
        capturedOperationId = String(params.operationId);
        return HttpResponse.error();
      }),
      http.get('/api/stories/launch/:operationId', ({ params }) => {
        expect(params.operationId).toBe(capturedOperationId);
        return HttpResponse.json(pendingStatus(capturedOperationId));
      }),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({
        prompt: 'Begin in Seyda Neen.',
      });
    });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('polling');
    });
    expect(putCount).toBe(1);
  });

  it('404 after reload is needs-input and does not PUT', async () => {
    const operationId = crypto.randomUUID();
    let putCount = 0;

    saveLaunchPointer({
      version: 1,
      viewerId,
      operationId,
      requestHash,
      createdAt: Date.now(),
    });

    server.use(
      http.put('/api/stories/launch/:operationId', () => {
        putCount += 1;
        return HttpResponse.json(pendingStatus(operationId));
      }),
      http.get('/api/stories/launch/:operationId', () =>
        HttpResponse.json(null, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('needs-input');
    });
    expect(result.current.phase).toMatchObject({
      message:
        'This launch was not submitted. Enter the prompt again. Nothing was started.',
    });
    expect(putCount).toBe(0);
  });

  it('failed status does not navigate', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});

    server.use(
      http.put('/api/stories/launch/:operationId', ({ params }) =>
        HttpResponse.json(failedStatus(String(params.operationId))),
      ),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({ prompt: 'A doomed kwama farmer.' });
    });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('attention');
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it('ready navigates to the validated story', async () => {
    const storyId = crypto.randomUUID();
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});

    server.use(
      http.put('/api/stories/launch/:operationId', ({ params }) =>
        HttpResponse.json(readyStatus(String(params.operationId), storyId)),
      ),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({ prompt: 'Meet the god Vivec.' });
    });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('ready');
    });
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(`/play/${storyId}`);
  });

  it('malformed status is rejected', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => {});

    server.use(
      http.put('/api/stories/launch/:operationId', () =>
        HttpResponse.json({ state: 'ready' }),
      ),
      http.get('/api/stories/launch/:operationId', () =>
        HttpResponse.json({ state: 'pending' }),
      ),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({ prompt: 'Walk the Ashlands.' });
    });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('rejected');
    });
    expect(result.current.phase).toMatchObject({
      message: 'The server status could not be read.',
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it('held and uncertain do not resubmit', async () => {
    let putCount = 0;
    const operationId = crypto.randomUUID();

    server.use(
      http.put('/api/stories/launch/:operationId', () => {
        putCount += 1;
        return HttpResponse.json(heldStatus(operationId));
      }),
      http.get('/api/stories/launch/:operationId', () =>
        HttpResponse.json(uncertainStatus(operationId)),
      ),
    );

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({
        prompt: 'Temple politics in Vvardenfell.',
      });
    });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('attention');
    });
    expect(putCount).toBe(1);

    await act(async () => {
      await result.current.refreshStatus();
    });
    expect(putCount).toBe(1);
  });

  it('empty prompt is rejected', async () => {
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((...args) => {
      fetchCount += 1;
      return originalFetch(...args);
    });

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({ prompt: '   ' });
    });

    expect(result.current.phase.kind).toBe('rejected');
    expect(fetchCount).toBe(0);
  });

  it('oversize prompt is rejected', async () => {
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((...args) => {
      fetchCount += 1;
      return originalFetch(...args);
    });

    const { result } = renderHook(() => useStoryLaunch(viewerId));
    await act(async () => {
      await result.current.beginLaunch({ prompt: 'x'.repeat(24001) });
    });

    expect(result.current.phase.kind).toBe('rejected');
    expect(fetchCount).toBe(0);
  });

  it('ignores cross-viewer pointer and does not fetch', async () => {
    const operationId = crypto.randomUUID();
    sessionStorage.setItem(
      `offscreen:story-launch-pointer:v1:${viewerId}`,
      JSON.stringify({
        version: 1,
        viewerId: 'someone-else',
        operationId,
        createdAt: Date.now(),
      }),
    );

    let fetchCount = 0;
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((...args) => {
      fetchCount += 1;
      return originalFetch(...args);
    });

    const { result } = renderHook(() => useStoryLaunch(viewerId));

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('idle');
    });
    expect(fetchCount).toBe(0);
  });
});

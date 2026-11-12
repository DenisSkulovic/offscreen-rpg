import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import {
  AuthenticatedQueryProvider,
  LOGOUT_CHANNEL,
  clearAuthenticatedQueryCaches,
} from './authenticated-query-provider';

describe('AuthenticatedQueryProvider cross-tab logout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears a sibling tab Query cache on logout broadcast (negative isolation)', async () => {
    type Handler = (event: MessageEvent<{ type?: string }>) => void;
    const receivers = new Set<Handler>();

    class FakeBroadcastChannel {
      #handler: Handler | null = null;
      constructor(public readonly name: string) {
        expect(name).toBe(LOGOUT_CHANNEL);
      }
      get onmessage() {
        return this.#handler;
      }
      set onmessage(handler: Handler | null) {
        if (this.#handler) {
          receivers.delete(this.#handler);
        }
        this.#handler = handler;
        if (handler) {
          receivers.add(handler);
        }
      }
      postMessage(data: { type?: string }) {
        const event = { data } as MessageEvent<{ type?: string }>;
        for (const receiver of [...receivers]) {
          receiver(event);
        }
      }
      close() {
        if (this.#handler) {
          receivers.delete(this.#handler);
        }
        this.#handler = null;
      }
    }

    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    let siblingClient: ReturnType<typeof createBrowserQueryClient> | null =
      null;
    function Probe() {
      const client = useQueryClient();
      useEffect(() => {
        siblingClient = client;
        const story = makeStorySnapshot();
        client.setQueryData(
          queryKeys.storySnapshot('viewer-1', story.id),
          story,
        );
      }, [client]);
      return null;
    }

    render(
      <AuthenticatedQueryProvider viewerId="viewer-1">
        <Probe />
      </AuthenticatedQueryProvider>,
    );

    await waitFor(() => {
      expect(siblingClient).not.toBeNull();
      expect(receivers.size).toBe(1);
    });
    const story = makeStorySnapshot();
    expect(
      siblingClient!.getQueryData(
        queryKeys.storySnapshot('viewer-1', story.id),
      ),
    ).toBeDefined();

    clearAuthenticatedQueryCaches(createBrowserQueryClient());

    await waitFor(() => {
      expect(
        siblingClient!.getQueryData(
          queryKeys.storySnapshot('viewer-1', story.id),
        ),
      ).toBeUndefined();
    });
  });
});

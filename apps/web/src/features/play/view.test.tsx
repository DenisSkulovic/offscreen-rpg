import { http, HttpResponse, delay } from 'msw';
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
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import { renderWithStoryQuery } from '@/src/test/query-harness';

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));
vi.mock('./history', () => ({
  StoryHistoryView: () => null,
}));
vi.mock('./campaign-settings', () => ({
  CampaignSettingsEditor: () => null,
}));
vi.mock('./campaign-play', () => ({
  CampaignPlay: () => null,
}));

import { PlayScene } from './view';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderPlay(story: ReturnType<typeof makeStorySnapshot>) {
  const { element } = renderWithStoryQuery(
    ({ viewerId, storyId }) => (
      <PlayScene viewerId={viewerId} storyId={storyId} />
    ),
    story,
  );
  return render(element);
}

describe('PlayScene', () => {
  it('renders an existing scene and lets the player choose an option', async () => {
    const user = userEvent.setup();
    const initial = makeStorySnapshot();
    const afterChoice = makeStorySnapshot({
      viewVersion: 4,
      revision: 4,
      canRespond: false,
      title: 'Choice accepted',
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
        async () => {
          await delay(25);
          return HttpResponse.json(afterChoice);
        },
      ),
    );

    renderPlay(initial);

    expect(
      screen.getByRole('heading', { name: 'Ashfall Approach' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The road narrows toward the silt gate.'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Walk the gate road' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Choice accepted' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /The storyteller is resolving this intention/i,
    );
  });

  it('keeps the newer scene when a stale poll arrives later (negative)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const initial = makeStorySnapshot({
      viewVersion: 5,
      canRespond: false,
      title: 'Current authoritative scene',
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 2,
      },
      interaction: null,
    });
    const stale = makeStorySnapshot({
      viewVersion: 4,
      title: 'Stale poll payload',
      canRespond: false,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });

    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, async () => {
        await delay(20);
        return HttpResponse.json(stale);
      }),
    );

    try {
      renderPlay(initial);
      expect(
        screen.getByRole('heading', { name: 'Current authoritative scene' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        /The storyteller is resolving this intention/i,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2050);
      });
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Current authoritative scene' }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByRole('heading', { name: 'Stale poll payload' }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops polling after unmount (Strict Mode cleanup groundwork)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const initial = makeStorySnapshot({
      canRespond: false,
      title: 'Pending narration',
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });
    let polls = 0;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () => {
        polls += 1;
        return HttpResponse.json(initial);
      }),
    );

    try {
      const { unmount } = renderPlay(initial);
      unmount();
      const pollsAtUnmount = polls;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
      expect(polls).toBe(pollsAtUnmount);
    } finally {
      vi.useRealTimers();
    }
  });
});

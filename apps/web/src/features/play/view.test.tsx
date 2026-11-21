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
import { focusManager } from '@tanstack/react-query';
import type { CampaignView } from '@offscreen/contracts/campaign';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';

const minimalCampaignCharacter = {
  name: 'Outlander',
  scores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  applicableAbilities: [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ],
  skills: [{ id: 'perception', label: 'Perception' }],
  proficientSkills: ['perception'],
  proficiencyBonus: 2,
  hp: 10,
  maxHp: 10,
  facts: [],
  quantities: [],
} as NonNullable<CampaignView['character']>;
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
vi.mock('./ui/campaign-play', () => ({
  CampaignPlay: () => null,
}));

import { PlayScene } from './view';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
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

const travellingWaiting = {
  dueAt: '2026-11-21T14:30:00.000Z',
  canControl: true,
  controlRevision: 7,
  remainingMs: null,
  gameDurationMs: 600_000,
} satisfies NonNullable<StorySnapshot['waiting']>;

describe('PlayScene', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('shows travelling wait copy and sends pause on control click', async () => {
    const user = userEvent.setup();
    const snapshot = makeStorySnapshot({
      waiting: travellingWaiting,
      interaction: null,
    });
    let controlBody: Record<string, unknown> | null = null;
    let controlPuts = 0;

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/controls/:operationId`,
        async ({ request }) => {
          controlPuts += 1;
          controlBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(snapshot);
        },
      ),
    );

    renderPlay(snapshot);

    expect(
      screen.getByText(/Still travelling\. Arrival estimated at/i),
    ).toHaveTextContent(travellingWaiting.dueAt);
    const pause = screen.getByRole('button', { name: 'Pause' });
    await user.click(pause);

    await waitFor(() => {
      expect(controlPuts).toBe(1);
    });
    expect(controlBody).toEqual({
      intervalId: fixtureIds.passageId,
      expectedControlRevision: travellingWaiting.controlRevision,
      action: 'pause',
    });
  });

  it('shows paused wait copy and sends resume on control click', async () => {
    const user = userEvent.setup();
    const pausedWaiting = {
      ...travellingWaiting,
      remainingMs: 15_000,
    };
    const snapshot = makeStorySnapshot({
      waiting: pausedWaiting,
      interaction: null,
    });
    let controlBody: Record<string, unknown> | null = null;

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/controls/:operationId`,
        async ({ request }) => {
          controlBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(snapshot);
        },
      ),
    );

    renderPlay(snapshot);

    expect(screen.getByText(/Journey paused\./i)).toHaveTextContent(
      '15 real seconds remain.',
    );
    await user.click(screen.getByRole('button', { name: 'Resume' }));

    await waitFor(() => {
      expect(controlBody).toEqual({
        intervalId: fixtureIds.passageId,
        expectedControlRevision: pausedWaiting.controlRevision,
        action: 'resume',
      });
    });
  });

  it('does not POST or PUT journey control on mount when waiting is shown (negative)', async () => {
    const snapshot = makeStorySnapshot({
      waiting: travellingWaiting,
      interaction: null,
    });
    let controlPuts = 0;
    let posts = 0;

    server.use(
      http.post('/api/*', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
      http.put(
        `/api/stories/${fixtureIds.storyId}/controls/:operationId`,
        () => {
          controlPuts += 1;
          return HttpResponse.json(snapshot);
        },
      ),
    );

    renderPlay(snapshot);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(controlPuts).toBe(0);
    expect(posts).toBe(0);
  });

  it('disables journey control while the first command is in flight (negative)', async () => {
    const user = userEvent.setup();
    const snapshot = makeStorySnapshot({
      waiting: travellingWaiting,
      interaction: null,
    });
    let controlPuts = 0;

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/controls/:operationId`,
        async () => {
          controlPuts += 1;
          await delay(200);
          return HttpResponse.json(snapshot);
        },
      ),
    );

    renderPlay(snapshot);

    const pause = screen.getByRole('button', { name: 'Pause' });
    await user.click(pause);
    await waitFor(() => {
      expect(pause).toBeDisabled();
    });
    await user.click(pause);

    await waitFor(() => {
      expect(controlPuts).toBe(1);
    });
  });

  it('opens Journal from the book without posting a command', async () => {
    const user = userEvent.setup();
    let posts = 0;
    server.use(
      http.post('/api/*', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
      http.put('/api/*', () => {
        posts += 1;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderPlay(makeStorySnapshot());

    expect(screen.queryByRole('heading', { name: 'Journal' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Contents' }));
    await user.click(screen.getByRole('link', { name: 'Journal' }));
    await act(async () => {
      window.location.hash = '#story-journal';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByRole('heading', { name: 'Journal' })).toBeVisible();
    expect(
      screen.getByText('Technical details').closest('details')?.textContent ??
        '',
    ).not.toMatch(/Journal/);
    await user.click(screen.getByRole('button', { name: 'Contents' }));
    await user.click(screen.getByRole('link', { name: 'Now' }));
    await act(async () => {
      window.location.hash = '#story-frame-now';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(
      screen.getByRole('heading', { name: 'Ashfall Approach' }),
    ).toBeVisible();
    expect(posts).toBe(0);
  });

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

    let choiceBody: Record<string, unknown> | null = null;
    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
        async ({ request }) => {
          choiceBody = (await request.json()) as Record<string, unknown>;
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
    expect(choiceBody).toMatchObject({
      expectedRevision: initial.revision,
      submission: {
        interactionId: fixtureIds.interactionId,
        answer: { kind: 'choice.v1', optionId: 'walk' },
      },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /The storyteller is resolving this intention/i,
    );
  });

  it.each([
    {
      label: 'interaction absent',
      story: makeStorySnapshot({ interaction: null }),
    },
    {
      label: 'campaign character present',
      story: makeStorySnapshot({
        campaign: {
          ...makeCampaign(),
          character: minimalCampaignCharacter,
        },
      }),
    },
  ])(
    'does not offer legacy choice buttons or resolution PUT when $label',
    async ({ story }) => {
      let puts = 0;
      server.use(
        http.put(
          `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
          () => {
            puts += 1;
            return HttpResponse.json(story);
          },
        ),
      );

      renderPlay(story);

      expect(
        screen.queryByRole('button', { name: 'Walk the gate road' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Wait and watch' }),
      ).toBeNull();
      expect(puts).toBe(0);
    },
  );

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

  it('keeps one frozen operation id after a lost ACK and never auto-posts on remount (negative)', async () => {
    const user = userEvent.setup();
    const initial = makeStorySnapshot();
    const operationIds: string[] = [];
    let puts = 0;

    server.use(
      http.put(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
        async ({ params }) => {
          puts += 1;
          operationIds.push(String(params.operationId));
          await delay(30);
          return HttpResponse.error();
        },
      ),
      http.get(`/api/stories/${fixtureIds.storyId}`, () =>
        HttpResponse.json(initial),
      ),
      http.get(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId/receipt`,
        () => HttpResponse.json(null, { status: 404 }),
      ),
    );

    const first = renderPlay(initial);
    await user.click(
      screen.getByRole('button', { name: 'Walk the gate road' }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Retry the same choice' }),
      ).toBeInTheDocument();
    });
    expect(puts).toBe(1);
    const frozenId = operationIds[0];
    expect(frozenId).toBeTruthy();

    first.unmount();
    const putsAfterUnmount = puts;
    renderPlay(initial);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Retry the same choice' }),
      ).toBeInTheDocument();
    });
    expect(puts).toBe(putsAfterUnmount);

    await user.click(
      screen.getByRole('button', { name: 'Retry the same choice' }),
    );
    await waitFor(() => {
      expect(puts).toBe(putsAfterUnmount + 1);
    });
    expect(operationIds.at(-1)).toBe(frozenId);
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

  it('stops pending refetch after the story settles', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pending = makeStorySnapshot({
      viewVersion: 3,
      canRespond: false,
      title: 'Still resolving',
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });
    const settled = makeStorySnapshot({
      viewVersion: 4,
      canRespond: true,
      title: 'Settled scene',
      resolution: null,
    });
    let polls = 0;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () => {
        polls += 1;
        return HttpResponse.json(polls === 1 ? settled : settled);
      }),
    );

    try {
      renderPlay(pending);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Settled scene' }),
        ).toBeInTheDocument();
      });
      const pollsAfterSettle = polls;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(polls).toBe(pollsAfterSettle);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suspends pending refetch while the document is hidden (negative)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const initial = makeStorySnapshot({
      canRespond: false,
      title: 'Hidden pending',
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
      renderPlay(initial);
      focusManager.setFocused(false);
      const pollsWhileHidden = polls;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });
      expect(polls).toBe(pollsWhileHidden);
    } finally {
      focusManager.setFocused(undefined);
      vi.useRealTimers();
    }
  });

  it('surfaces a refresh control after repeated 503 without dispatching a mutation (negative)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const initial = makeStorySnapshot({
      canRespond: false,
      title: 'Pending through outage',
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });
    let puts = 0;
    let gets = 0;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () => {
        gets += 1;
        return HttpResponse.json({ error: 'Unavailable' }, { status: 503 });
      }),
      http.put(
        `/api/stories/${fixtureIds.storyId}/resolutions/:operationId`,
        () => {
          puts += 1;
          return HttpResponse.json(initial);
        },
      ),
    );

    try {
      renderPlay(initial);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Refresh scene' }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          /Last update failed\. Refresh does not send a command/i,
        ),
      ).toBeInTheDocument();
      expect(gets).toBeGreaterThanOrEqual(1);
      expect(gets).toBeLessThanOrEqual(3);

      const getsBeforeRefresh = gets;
      await user.click(screen.getByRole('button', { name: 'Refresh scene' }));
      await waitFor(() => {
        expect(gets).toBeGreaterThan(getsBeforeRefresh);
      });
      expect(puts).toBe(0);
      expect(
        screen.getByRole('heading', { name: 'Pending through outage' }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

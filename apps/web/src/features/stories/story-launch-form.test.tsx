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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StoryLaunchStatus } from '@offscreen/contracts/story-launch';
import { clearLaunchPointer } from '@/src/shared/api/story-launch-intent-store';
import { StoryLaunchForm } from './story-launch-form';

const viewerId = 'viewer-launch-form';
const requestHash = 'a'.repeat(64);

const server = setupServer();

const samplePreset = {
  presetId: 'seyda-neen',
  presetRootHash: 'b'.repeat(64),
  label: 'Seyda Neen dock',
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  clearLaunchPointer(viewerId);
  sessionStorage.clear();
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

function uncertainStatus(operationId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'uncertain',
    explanation: 'The server did not confirm the launch yet.',
  };
}

function readyStatus(operationId: string, storyId: string): StoryLaunchStatus {
  return {
    ...statusBase(operationId),
    state: 'ready',
    storyId,
    sceneSequence: 1,
  };
}

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));

describe('StoryLaunchForm', () => {
  it('custom one-prompt launch sends prompt source once', async () => {
    const user = userEvent.setup();
    let putCount = 0;
    let putBody: unknown;

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        putCount += 1;
        putBody = await request.json();
        const op = (putBody as { operationId: string }).operationId;
        return HttpResponse.json(pendingStatus(op));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    const promptText = 'A pilgrim washed ashore on the Bitter Coast.';
    await user.type(screen.getByLabelText('Story prompt'), promptText);
    await user.click(screen.getByRole('button', { name: 'Create story' }));

    await waitFor(() => {
      expect(putCount).toBe(1);
    });
    expect(putBody).toMatchObject({
      source: { kind: 'prompt', prompt: promptText },
    });
  });

  it('does not show a fake prepared section when presets are empty', () => {
    render(<StoryLaunchForm viewerId={viewerId} />);
    expect(screen.queryByText('Prepared experiences')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Create a story' }),
    ).toBeInTheDocument();
  });

  it('one prompt does not ask for a title, character, or review wizard', () => {
    render(<StoryLaunchForm viewerId={viewerId} />);
    expect(screen.getByLabelText('Story prompt')).toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).toBeNull();
    expect(screen.queryByLabelText(/character/i)).toBeNull();
    expect(screen.queryByLabelText(/avatar/i)).toBeNull();
    expect(screen.queryByLabelText(/ruleset/i)).toBeNull();
    expect(screen.queryByText(/review your setup/i)).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('preset Play with empty prompt sends exact id and root hash once', async () => {
    const user = userEvent.setup();
    let putCount = 0;
    let putBody: unknown;

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        putCount += 1;
        putBody = await request.json();
        const op = (putBody as { operationId: string }).operationId;
        return HttpResponse.json(pendingStatus(op));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} presets={[samplePreset]} />);
    await user.click(screen.getByRole('button', { name: 'Play' }));

    await waitFor(() => {
      expect(putCount).toBe(1);
    });
    expect(putBody).toMatchObject({
      source: {
        kind: 'preset',
        presetId: 'seyda-neen',
        presetRootHash: 'b'.repeat(64),
      },
    });
    expect(
      (putBody as { source: { customPrompt?: string } }).source.customPrompt,
    ).toBeUndefined();
  });

  it('optional preset customization adds customPrompt and hints', async () => {
    const user = userEvent.setup();
    let putBody: unknown;

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        putBody = await request.json();
        const op = (putBody as { operationId: string }).operationId;
        return HttpResponse.json(pendingStatus(op));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} presets={[samplePreset]} />);
    const card = screen.getByRole('listitem');
    await user.click(within(card).getByText('Customize'));
    const promptText = 'A fresh arrival on the Bitter Coast.';
    await user.type(within(card).getByLabelText('Story prompt'), promptText);
    await user.selectOptions(
      within(card).getByLabelText('World invention'),
      'source-bound',
    );
    await user.click(
      within(card).getByRole('button', { name: 'Play with customization' }),
    );

    await waitFor(() => {
      expect(putBody).toBeDefined();
    });
    expect(putBody).toMatchObject({
      source: {
        kind: 'preset',
        presetId: 'seyda-neen',
        presetRootHash: 'b'.repeat(64),
        customPrompt: promptText,
      },
      hints: { worldInvention: 'source-bound' },
    });
  });

  it('rejects empty custom prompt without PUT', async () => {
    const user = userEvent.setup();
    let putCount = 0;

    server.use(
      http.put('/api/stories/launch/:operationId', async () => {
        putCount += 1;
        return HttpResponse.json(pendingStatus(crypto.randomUUID()));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    await user.click(screen.getByRole('button', { name: 'Create story' }));

    await waitFor(() => {
      expect(
        screen.getByText('Enter a prompt before launching.'),
      ).toBeInTheDocument();
    });
    expect(putCount).toBe(0);
  });

  it('duplicate submit stays disabled while pending', async () => {
    const user = userEvent.setup();
    let putCount = 0;
    let resolvePut: (() => void) | undefined;
    const putDone = new Promise<void>((resolve) => {
      resolvePut = resolve;
    });

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        putCount += 1;
        const body = (await request.json()) as { operationId: string };
        await putDone;
        return HttpResponse.json(pendingStatus(body.operationId));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    await user.type(screen.getByLabelText('Story prompt'), 'Hold at the gate.');
    const submit = screen.getByRole('button', { name: 'Create story' });
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Launching…' })).toBeDisabled();
    });
    expect(screen.getByLabelText('Story prompt')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Launching…' }));

    resolvePut?.();
    await waitFor(() => {
      expect(putCount).toBe(1);
    });
  });

  it('uncertain check status does not PUT', async () => {
    const user = userEvent.setup();
    let putCount = 0;
    let getCount = 0;

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        putCount += 1;
        const body = (await request.json()) as { operationId: string };
        return HttpResponse.json(uncertainStatus(body.operationId));
      }),
      http.get('/api/stories/launch/:operationId', ({ params }) => {
        getCount += 1;
        return HttpResponse.json(uncertainStatus(String(params.operationId)));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    await user.type(screen.getByLabelText('Story prompt'), 'A lost pilgrim.');
    await user.click(screen.getByRole('button', { name: 'Create story' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Check status' }),
      ).toBeInTheDocument();
    });
    expect(putCount).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Check status' }));

    await waitFor(() => {
      expect(getCount).toBeGreaterThanOrEqual(1);
    });
    expect(putCount).toBe(1);
  });

  it('ready links to the validated story', async () => {
    const user = userEvent.setup();
    const storyId = crypto.randomUUID();
    vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        const body = (await request.json()) as { operationId: string };
        return HttpResponse.json(readyStatus(body.operationId, storyId));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    await user.type(screen.getByLabelText('Story prompt'), 'Meet Vivec.');
    await user.click(screen.getByRole('button', { name: 'Create story' }));

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Open the story' }),
      ).toHaveAttribute('href', `/play/${storyId}`);
    });
  });

  it('prompt is absent from session storage', async () => {
    const user = userEvent.setup();
    const secretPrompt = 'The secret kwama mine under Suran.';

    server.use(
      http.put('/api/stories/launch/:operationId', async ({ request }) => {
        const body = (await request.json()) as { operationId: string };
        return HttpResponse.json(pendingStatus(body.operationId));
      }),
    );

    render(<StoryLaunchForm viewerId={viewerId} />);
    await user.type(screen.getByLabelText('Story prompt'), secretPrompt);
    await user.click(screen.getByRole('button', { name: 'Create story' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Launching…' }),
      ).toBeInTheDocument();
    });
    expect(JSON.stringify(sessionStorage)).not.toContain(secretPrompt);
  });
});

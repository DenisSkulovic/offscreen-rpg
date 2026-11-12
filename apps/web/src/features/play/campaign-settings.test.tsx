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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';
import { CampaignSettingsEditor } from './campaign-settings';

const server = setupServer();
const viewerId = 'viewer-settings';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderSettings(
  campaign = makeCampaign(),
  onSnapshot = vi.fn(),
) {
  const story = makeStorySnapshot({
    title: 'Settings scene',
  });
  const queryClient = createBrowserQueryClient();
  server.use(
    http.get('/api/stories/presets/catalogue', () => HttpResponse.json([])),
    http.get('/api/stories/presets', () => HttpResponse.json([])),
  );
  return {
    onSnapshot,
    campaign,
    queryClient,
    story,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CampaignSettingsEditor
          viewerId={viewerId}
          story={{ ...story, campaign }}
          campaign={campaign}
          onSnapshot={onSnapshot}
        />
      </QueryClientProvider>,
    ),
  };
}

describe('CampaignSettingsEditor RHF session', () => {
  it('keeps dirty tone edits when a newer revision arrives (negative)', async () => {
    const user = userEvent.setup();
    const first = makeCampaign();
    const { rerender, onSnapshot, queryClient, story } = renderSettings(first);
    const details = screen.getByText(/Storyteller settings/i).closest('details');
    expect(details).toBeTruthy();
    if (details && !details.open) {
      details.open = true;
    }

    const tone = screen.getByLabelText(/^Tone/i);
    await user.clear(tone);
    await user.type(tone, 'Keep this dirty tone.');

    const newer = {
      ...first,
      settings: {
        ...first.settings,
        revision: 2,
        creative: {
          ...first.settings.creative,
          tone: 'Server won the race.',
        },
      },
    };

    rerender(
      <QueryClientProvider client={queryClient}>
        <CampaignSettingsEditor
          viewerId={viewerId}
          story={{ ...story, campaign: newer }}
          campaign={newer}
          onSnapshot={onSnapshot}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByDisplayValue('Keep this dirty tone.')).toBeInTheDocument();
    expect(
      screen.getByText(/newer revision \(2\) arrived while these fields were dirty/i),
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Server won the race.')).not.toBeInTheDocument();
  });

  it('retries the frozen preset UUID/body, not newly typed values (negative)', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    const ids: string[] = [];
    server.use(
      http.get('/api/stories/presets/catalogue', () => HttpResponse.json([])),
      http.get('/api/stories/presets', () => HttpResponse.json([])),
      http.put('/api/stories/presets/:id', async ({ request, params }) => {
        ids.push(String(params.id));
        bodies.push(await request.json());
        return HttpResponse.json({ error: 'Unavailable' }, { status: 503 });
      }),
    );

    renderSettings();
    const details = screen.getByText(/Storyteller settings/i).closest('details');
    if (details && !details.open) {
      details.open = true;
    }

    await user.clear(screen.getByLabelText(/Private preset name/i));
    await user.type(screen.getByLabelText(/Private preset name/i), 'First name');
    await user.click(
      screen.getByRole('button', { name: 'Save as a private preset' }),
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry preset save' })).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText(/Private preset name/i));
    await user.type(
      screen.getByLabelText(/Private preset name/i),
      'Changed after freeze',
    );
    await user.click(screen.getByRole('button', { name: 'Retry preset save' }));
    await waitFor(() => {
      expect(ids.length).toBe(2);
    });
    expect(ids[0]).toBe(ids[1]);
    expect(bodies[0]).toEqual(bodies[1]);
    expect((bodies[0] as { name: string }).name).toBe('First name');
  });

  it('scopes settings history to the current story id', async () => {
    const user = userEvent.setup();
    const storyA = fixtureIds.storyId;
    const storyB = '99999999-9999-4999-8999-999999999999';
    server.use(
      http.get('/api/stories/presets/catalogue', () => HttpResponse.json([])),
      http.get('/api/stories/presets', () => HttpResponse.json([])),
      http.get(`/api/stories/${storyA}/settings`, () =>
        HttpResponse.json([
          {
            settings: makeCampaign().settings,
            createdAt: '2026-11-12T10:00:00.000Z',
          },
        ]),
      ),
      http.get(`/api/stories/${storyB}/settings`, () =>
        HttpResponse.json([
          {
            settings: {
              ...makeCampaign().settings,
              revision: 9,
              creative: {
                ...makeCampaign().settings.creative,
                tone: 'Story B history only',
              },
            },
            createdAt: '2026-11-12T11:00:00.000Z',
          },
        ]),
      ),
    );

    const campaign = makeCampaign();
    const onSnapshot = vi.fn();
    const queryClient = createBrowserQueryClient();
    const baseStory = makeStorySnapshot({ id: storyA, title: 'A' });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CampaignSettingsEditor
          viewerId={viewerId}
          story={
            { ...baseStory, campaign } as typeof baseStory & {
              campaign: typeof campaign;
            }
          }
          campaign={campaign}
          onSnapshot={onSnapshot}
        />
      </QueryClientProvider>,
    );
    const details = screen.getByText(/Storyteller settings/i).closest('details');
    if (details && !details.open) {
      details.open = true;
    }
    await user.click(
      screen.getByRole('button', { name: 'Show saved settings history' }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Revision 1/)).toBeInTheDocument();
    });

    const storyBSnapshot = makeStorySnapshot({ id: storyB, title: 'B' });
    rerender(
      <QueryClientProvider client={queryClient}>
        <CampaignSettingsEditor
          key={storyB}
          viewerId={viewerId}
          story={
            { ...storyBSnapshot, campaign } as typeof storyBSnapshot & {
              campaign: typeof campaign;
            }
          }
          campaign={campaign}
          onSnapshot={onSnapshot}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(/Story B history only/)).not.toBeInTheDocument();
  });
});

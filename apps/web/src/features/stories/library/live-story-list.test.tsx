import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import { fixtureIds } from '@/src/test/story-fixtures';
import { LiveStoryList } from './live-story-list';

const viewerId = 'viewer-list';
const olderId = '22222222-2222-4222-8222-222222222222';
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

function renderList() {
  const queryClient = createBrowserQueryClient();
  queryClient.setQueryData(queryKeys.storiesList(viewerId), {
    pages: [
      {
        items: [
          {
            id: fixtureIds.storyId,
            title: 'Newest live',
            storyteller: null,
            status: 'active',
          },
        ],
        nextBefore: olderId,
      },
    ],
    pageParams: [null],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveStoryList viewerId={viewerId} />
    </QueryClientProvider>,
  );
}

describe('LiveStoryList useInfiniteQuery', () => {
  it('appends the next page once and shows end-of-list', async () => {
    const user = userEvent.setup();
    let pages = 0;
    server.use(
      http.get('/api/stories', ({ request }) => {
        pages += 1;
        const before = new URL(request.url).searchParams.get('before');
        expect(before).toBe(olderId);
        return HttpResponse.json({
          items: [
            {
              id: olderId,
              title: 'Older live',
              storyteller: null,
              status: 'active',
            },
            {
              id: fixtureIds.storyId,
              title: 'Duplicate ignored',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        });
      }),
    );

    renderList();
    expect(
      screen.getByRole('heading', { name: 'Newest live' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Your story')).toBeInTheDocument();
    expect(screen.queryByText(/Return here/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter story' })).toHaveAttribute(
      'href',
      `/play/${fixtureIds.storyId}`,
    );
    expect(screen.queryByText(/Continuing/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Older stories' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Older live' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Newest live' }),
    ).toBeInTheDocument();
    expect(screen.getByText('One of your stories')).toBeInTheDocument();
    expect(screen.getByText('Other lives')).toBeInTheDocument();
    expect(screen.queryByText('Duplicate ignored')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'End of live stories.',
    );
    expect(pages).toBe(1);
  });

  it('does not claim empty stories when the list request failed', async () => {
    const queryClient = createBrowserQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    server.use(
      http.get('/api/stories', () =>
        HttpResponse.json({ message: 'down' }, { status: 503 }),
      ),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <LiveStoryList viewerId={viewerId} />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Stories could not be loaded/i,
      );
    });
    expect(
      screen.queryByText(/Every story begins with a situation/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/No live stories/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Enter story' }),
    ).not.toBeInTheDocument();
  });

  it('keeps one viewer cache out of another viewer list', () => {
    const harbor = createBrowserQueryClient();
    harbor.setQueryData(queryKeys.storiesList('viewer-harbor'), {
      pages: [
        {
          items: [
            {
              id: fixtureIds.storyId,
              title: 'Harbor only',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        },
      ],
      pageParams: [null],
    });
    const marsh = createBrowserQueryClient();
    marsh.setQueryData(queryKeys.storiesList('viewer-marsh'), {
      pages: [
        {
          items: [
            {
              id: olderId,
              title: 'Marsh only',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        },
      ],
      pageParams: [null],
    });
    const first = render(
      <QueryClientProvider client={harbor}>
        <LiveStoryList viewerId="viewer-harbor" />
      </QueryClientProvider>,
    );
    const second = render(
      <QueryClientProvider client={marsh}>
        <LiveStoryList viewerId="viewer-marsh" />
      </QueryClientProvider>,
    );
    expect(
      within(first.container).getByRole('heading', { name: 'Harbor only' }),
    ).toBeInTheDocument();
    expect(
      within(first.container).queryByText('Marsh only'),
    ).not.toBeInTheDocument();
    expect(
      within(second.container).getByRole('heading', { name: 'Marsh only' }),
    ).toBeInTheDocument();
    expect(
      within(second.container).queryByText('Harbor only'),
    ).not.toBeInTheDocument();
  });

  it('wraps a long Unicode title instead of keeping it on one line', () => {
    const css = readFileSync(
      path.join(__dirname, '../stories-library.css'),
      'utf8',
    );
    const titleRule = css.match(/\.stories-library__story-title\s*\{[^}]*\}/s);
    expect(titleRule?.[0]).toMatch(/overflow-wrap:\s*anywhere/);
    expect(titleRule?.[0]).toMatch(/min-width:\s*0/);
    expect(titleRule?.[0]).not.toMatch(/white-space:\s*nowrap/);
    expect(css).not.toMatch(/^(?:button|main|body|a|p)\s*\{/m);
    expect(css).not.toMatch(/\.story-demo|\.chamber\b/);
    const queryClient = createBrowserQueryClient();
    const title = `霧の港 — ${'とても長い名前'.repeat(12)}`;
    queryClient.setQueryData(queryKeys.storiesList(viewerId), {
      pages: [
        {
          items: [
            {
              id: fixtureIds.storyId,
              title,
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        },
      ],
      pageParams: [null],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <LiveStoryList viewerId={viewerId} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: title })).toHaveClass(
      'stories-library__story-title',
    );
    expect(screen.getByRole('link', { name: 'Enter story' })).toHaveAttribute(
      'href',
      `/play/${fixtureIds.storyId}`,
    );
  });

  it('ignores a rapid second fetchNextPage while the first is in flight (negative)', async () => {
    const user = userEvent.setup();
    let pages = 0;
    server.use(
      http.get('/api/stories', async ({ request }) => {
        pages += 1;
        await delay(80);
        const before = new URL(request.url).searchParams.get('before');
        expect(before).toBe(olderId);
        return HttpResponse.json({
          items: [
            {
              id: olderId,
              title: 'Older live',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        });
      }),
    );

    renderList();
    const button = screen.getByRole('button', { name: 'Older stories' });
    await user.click(button);
    await user.click(button);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Older live' }),
      ).toBeInTheDocument();
    });
    expect(pages).toBe(1);
  });
});

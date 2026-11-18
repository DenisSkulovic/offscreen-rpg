import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { http, HttpResponse, delay } from 'msw';
import { DraftList } from '@/src/features/stories/draft-list';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { fixtureIds } from '@/src/test/story-fixtures';
import {
  emptyDraftsHandlers,
  emptyStoriesHandlers,
  failedStoriesHandlers,
  oneStoryHandlers,
} from './msw/handlers';

const viewerId = 'storybook-viewer';
const privateViewerId = 'private-reader';
const unicodeTitle = `霧の港 — ${'とても長い名前'.repeat(8)}`;

function Library({
  liveViewerId,
  draftViewerId = viewerId,
}: {
  liveViewerId: string;
  draftViewerId?: string;
}) {
  return (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId={liveViewerId} />
      <DraftList viewerId={draftViewerId} />
    </main>
  );
}

const meta = {
  title: 'Platform/Stories library',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Populated: Story = {
  name: 'Populated',
  render: () => <Library liveViewerId={viewerId} />,
  parameters: {
    msw: { handlers: [...oneStoryHandlers, ...emptyDraftsHandlers] },
  },
};

export const Empty: Story = {
  name: 'Empty',
  render: () => <Library liveViewerId={viewerId} />,
  parameters: {
    msw: { handlers: [...emptyStoriesHandlers, ...emptyDraftsHandlers] },
  },
};

export const Loading: Story = {
  name: 'Loading',
  render: () => <Library liveViewerId={viewerId} />,
  parameters: {
    msw: {
      handlers: [
        http.get('/api/stories', async () => {
          await delay('infinite');
          return HttpResponse.json({ items: [], nextBefore: null });
        }),
        ...emptyDraftsHandlers,
      ],
    },
  },
};

export const ApiError: Story = {
  name: 'API error',
  render: () => <Library liveViewerId={viewerId} />,
  parameters: {
    msw: { handlers: [...failedStoriesHandlers, ...emptyDraftsHandlers] },
  },
};

export const PrivateScopedList: Story = {
  name: 'Private scoped list',
  render: () => <Library liveViewerId={privateViewerId} />,
  parameters: {
    msw: {
      handlers: [
        http.get('/api/stories', () =>
          HttpResponse.json({
            items: [
              {
                id: fixtureIds.storyId,
                title: 'Private harbor',
                status: 'live',
                storyteller: null,
              },
            ],
            nextBefore: null,
          }),
        ),
        ...emptyDraftsHandlers,
      ],
    },
  },
};

export const LongUnicodeTitle: Story = {
  name: 'Long Unicode title',
  render: () => <Library liveViewerId={viewerId} />,
  parameters: {
    msw: {
      handlers: [
        http.get('/api/stories', () =>
          HttpResponse.json({
            items: [
              {
                id: fixtureIds.storyId,
                title: unicodeTitle,
                status: 'live',
                storyteller: null,
              },
            ],
            nextBefore: null,
          }),
        ),
        ...emptyDraftsHandlers,
      ],
    },
  },
};

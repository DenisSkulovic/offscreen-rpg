import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { DraftList } from '@/src/features/stories/draft-list';
import {
  emptyDraftsHandlers,
  emptyStoriesHandlers,
  pagedStoriesHandlers,
} from './msw/handlers';

const viewerId = 'storybook-viewer';

const meta = {
  title: 'Engineering/List states',
  parameters: {
    msw: { handlers: emptyStoriesHandlers },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const EmptyLiveStories: Story = {
  render: () => (
    <main className="editor">
      <LiveStoryList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: emptyStoriesHandlers },
  },
};

export const InfiniteLiveStories: Story = {
  render: () => (
    <main className="editor">
      <LiveStoryList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: pagedStoriesHandlers },
  },
};

export const EmptyDrafts: Story = {
  render: () => (
    <main className="editor">
      <DraftList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: emptyDraftsHandlers },
  },
};

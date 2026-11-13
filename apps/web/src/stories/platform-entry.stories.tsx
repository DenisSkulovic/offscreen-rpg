import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PublicPortal } from '@/src/features/public-portal/public-portal';
import { StoryDemo } from '../../app/demo/story-demo';
import { SignInButton } from '@/src/features/session/sign-in-button';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { DraftList } from '@/src/features/stories/draft-list';
import {
  emptyDraftsHandlers,
  emptyStoriesHandlers,
  failedStoriesHandlers,
  oneStoryHandlers,
  pagedStoriesHandlers,
} from './msw/handlers';

const viewerId = 'storybook-viewer';

const meta = {
  title: 'Platform/Entry journeys',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const PublicPortalHome: Story = {
  name: 'A · Public portal',
  render: () => <PublicPortal />,
};

export const ScriptedPreviewOpening: Story = {
  name: 'B · Scripted preview D0',
  render: () => (
    <main className="story-demo">
      <StoryDemo />
    </main>
  ),
};

export const SignInWithCreateIntent: Story = {
  name: 'C · Sign-in create intent',
  render: () => (
    <main className="editor">
      <p className="eyebrow">Offscreen RPG</p>
      <h1>Continue where you left off</h1>
      <p>Intended destination: /stories/new (allowlisted).</p>
      <SignInButton next="/stories/new" />
    </main>
  ),
};

export const PlayerHomeEmpty: Story = {
  name: 'D · Player home empty',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId={viewerId} />
      <DraftList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: [...emptyStoriesHandlers, ...emptyDraftsHandlers] },
  },
};

export const PlayerHomeOneLife: Story = {
  name: 'D · Player home one life',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId={viewerId} />
      <DraftList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: [...oneStoryHandlers, ...emptyDraftsHandlers] },
  },
};

export const PlayerHomeManyLives: Story = {
  name: 'D · Player home many lives',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: pagedStoriesHandlers },
  },
};

export const PlayerHomeStoriesFailed: Story = {
  name: 'E · Stories failed ≠ empty',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId={viewerId} />
      <DraftList viewerId={viewerId} />
    </main>
  ),
  parameters: {
    msw: { handlers: [...failedStoriesHandlers, ...emptyDraftsHandlers] },
  },
};

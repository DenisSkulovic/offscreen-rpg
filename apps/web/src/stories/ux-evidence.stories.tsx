import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { PublicPortal } from '@/src/features/public-portal/public-portal';
import { StoryDemo } from '../../app/demo/story-demo';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { DraftList } from '@/src/features/stories/draft-list';
import {
  emptyDraftsHandlers,
  failedStoriesHandlers,
  oneStoryHandlers,
} from './msw/handlers';

/**
 * UX11 catalogue — representative shipped surfaces for human/browser review.
 * Not a claim of connected gameplay or live OAuth.
 */
const meta = {
  title: 'Experience/UX evidence',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function mobileDecorator(Story: () => ReactNode) {
  return (
    <div
      style={{
        width: 375,
        margin: '0 auto',
        minHeight: '100vh',
        background: '#0b0f14',
      }}
    >
      <Story />
    </div>
  );
}

export const PortalDesktop: Story = {
  name: 'Portal · 1440 conceptual',
  render: () => <PublicPortal />,
};

export const PortalMobile375: Story = {
  name: 'Portal · 375',
  render: () => <PublicPortal />,
  decorators: [mobileDecorator],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const PreviewOpening: Story = {
  name: 'Preview · first decision',
  render: () => (
    <main className="story-demo">
      <StoryDemo />
    </main>
  ),
};

export const PreviewMobile375: Story = {
  name: 'Preview · 375',
  render: () => (
    <main className="story-demo">
      <StoryDemo />
    </main>
  ),
  decorators: [mobileDecorator],
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const StageNoArtQuiet: Story = {
  name: 'Stage · quiet no art',
  render: () => (
    <StoryFrame
      storiesHref="/stories"
      storyLabel="Current passage"
      statusLabel="Nothing underway"
      paragraphs={[
        'The wind smells of salt. The harbor watch is changing shifts. The lantern remains dark, but nothing requires you to act immediately.',
      ]}
      intentions={[
        {
          id: 'repair',
          label: 'Begin repairing the lantern',
          support: 'An extended task',
        },
        {
          id: 'read',
          label: 'Read the sealed notice',
          support: 'Brief inspection',
        },
      ]}
    />
  ),
};

export const StageInterruptedHold: Story = {
  name: 'Stage · interrupted hold 3/9',
  render: () => (
    <StoryFrame
      storiesHref="/stories"
      storyLabel="Greywake"
      situationLabel="The beacon landing · interrupted"
      statusLabel="Repair held at 3 of 9"
      passageTitle="Someone at the stair"
      paragraphs={[
        'Someone stops at the top of the stair. Your repair is held — not rewarded.',
      ]}
      memory="Repair held · 3/9 earned · stranger waiting"
      intentions={[
        {
          id: 'ask',
          label: 'Ask why the lantern should stay dark',
          support: 'Press for a reason',
        },
        {
          id: 'show',
          label: 'Show the written order',
          support: 'Only if the notice was read',
        },
      ]}
    />
  ),
};

export const PlayerHomeOneLife: Story = {
  name: 'Home · one life',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId="storybook-viewer" />
      <DraftList viewerId="storybook-viewer" />
    </main>
  ),
  parameters: {
    msw: { handlers: [...oneStoryHandlers, ...emptyDraftsHandlers] },
  },
};

/** Deliberate counterexample fixture: failure must not look like verified empty. */
export const PlayerHomeStoriesFailedCounterexample: Story = {
  name: 'Home · stories failed (counterexample)',
  render: () => (
    <main className="stories-library">
      <h1 className="stories-library__title">Your stories</h1>
      <LiveStoryList viewerId="storybook-viewer" />
      <DraftList viewerId="storybook-viewer" />
    </main>
  ),
  parameters: {
    msw: { handlers: [...failedStoriesHandlers, ...emptyDraftsHandlers] },
  },
};

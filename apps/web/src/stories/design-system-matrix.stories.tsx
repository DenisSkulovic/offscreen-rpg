import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import { LiveStoryList } from '@/src/features/stories/library/live-story-list';
import {
  harborPresentation,
  harborScope,
  malformedPresentation,
  quietRoomPresentation,
  resolveFixture,
} from '@/src/features/play/presentation/fixtures';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';
import { oneStoryHandlers, emptyDraftsHandlers } from './msw/handlers';
import { matrixOptions, matrixProse } from './design-system-matrix-fixtures';

const optionScope = {
  ...harborScope,
  paragraphCount: matrixProse.length,
  validLegacyOptionIds: matrixOptions.map((option) => option.id),
};

const book = {
  storiesHref: '/stories',
  storyLabel: 'Greywake',
  situationLabel: 'The beacon landing',
  statusLabel: 'Waiting for your choice',
  passageTitle: 'Someone at the door',
  paragraphs: matrixProse,
  intentions: [...matrixOptions],
  journalHref: '#story-journal',
  journal: (
    <section>
      <h2>Journal</h2>
      <p>Saved passage fixture. Opening this leaf does not submit a choice.</p>
    </section>
  ),
};

const meta = {
  title: 'Experience/Design system matrix',
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [] },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const BookStoriesAndCreate: Story = {
  name: 'Book, Stories, and Create',
  render: () => (
    <div>
      <StoryFrame
        {...book}
        presentation={resolveFixture(harborPresentation, optionScope)}
      />
      <main className="stories-library">
        <h2>Stories</h2>
        <LiveStoryList viewerId="storybook-viewer" />
      </main>
      <section aria-label="Create" className="editor">
        <h2>Create</h2>
        <label htmlFor="matrix-title">Story title</label>
        <input id="matrix-title" />
        <Action kind="button" pending>
          Saving…
        </Action>
        <SystemNotice tone="error">
          Setup could not be confirmed. Your edits are still here.
        </SystemNotice>
      </section>
    </div>
  ),
  parameters: {
    msw: { handlers: [...oneStoryHandlers, ...emptyDraftsHandlers] },
  },
};

export const MalformedDirection: Story = {
  name: 'Malformed direction',
  render: () => (
    <StoryFrame
      {...book}
      presentation={resolveFixture(malformedPresentation, optionScope)}
    />
  ),
};

export const QuietNoArt: Story = {
  name: 'Quiet, no art',
  render: () => (
    <StoryFrame
      {...book}
      presentation={resolveFixture(quietRoomPresentation, optionScope)}
    />
  ),
};

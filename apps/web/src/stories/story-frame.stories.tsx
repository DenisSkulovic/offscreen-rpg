import { useState } from 'react';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { resolveLivePresentation } from '@/src/features/play/model/live-presentation';
import { fixtureIds, makeStorySnapshot } from '@/src/test/story-fixtures';
import { StoryFrame } from '@/src/features/play/ui/story-frame';

const shortParagraphs = [
  'Someone in a soaked harbor coat has climbed onto the landing.',
  'They stop beside the mechanism. "Is the light being repaired?"',
];

const longParagraphs = [
  ...shortParagraphs,
  'The wind from the channel pushes salt into the open door and lifts unfinished notes on the workbench. A clerk keeps counting elsewhere; nothing here invents a clock the world has not earned.',
  'Behind them the raised marsh path keeps its silence. The repair tools remain where the last verified attempt left them.',
  'Выпускные бумаги лежат рядом с мокрым краем стола. Mixed scripts stay in the same reading column.',
];

const meta = {
  title: 'Experience/StoryFrame',
  component: StoryFrame,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [] },
  },
} satisfies Meta<typeof StoryFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopDecision: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Greywake',
    situationLabel: 'The beacon landing',
    statusLabel: 'Waiting for your choice',
    passageTitle: 'Someone at the door',
    paragraphs: shortParagraphs,
    memory: 'Repair stopped · 3/9 earned',
    journalHref: '#story-journal',
    journal: (
      <section>
        <h2>Journal</h2>
        <p>Saved passage fixture. Opening this leaf does not submit a choice.</p>
      </section>
    ),
    intentions: [
      {
        id: 'ask',
        label: 'Ask who sent the visitor',
        support: 'Brief conversation',
      },
      {
        id: 'withdraw',
        label: 'Withdraw to the shelter',
        support: 'Leave without losing your work',
      },
    ],
    details: (
      <p>Settings and recovery stay available here in later slices.</p>
    ),
  },
};

export const NarrowLongProse: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Невыговоримое-имя',
    situationLabel: null,
    statusLabel: 'Nothing underway',
    passageTitle: 'Morning at the harbor',
    paragraphs: longParagraphs,
    intentions: [
      {
        id: 'repair',
        label: 'Continue your earlier repair',
        support: '3/9 earned · same saved commitment',
      },
      {
        id: 'observe',
        label: 'Wait and observe',
        support: 'A bounded time commitment',
      },
    ],
  },
  decorators: [
    (Story) => (
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
    ),
  ],
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const QuietWithoutInventory: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Current passage',
    paragraphs: [
      'The wind smells of salt. The harbor watch is changing shifts. The lantern remains dark, but nothing requires you to act immediately.',
    ],
  },
};

export const PublishedArrival: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Greywake',
    situationLabel: 'The beacon landing',
    statusLabel: 'Waiting for your choice',
    passageTitle: 'Someone at the door',
    paragraphs: shortParagraphs,
    journalHref: '#story-journal',
    journal: (
      <section>
        <h2>Journal</h2>
        <p>Opening this leaf does not publish a passage.</p>
      </section>
    ),
    intentions: [
      {
        id: 'ask',
        label: 'Ask who sent the visitor',
        support: 'The choice stays available during the cue.',
      },
    ],
  },
  render: function ArrivalStory(args) {
    const [passageId, setPassageId] = useState('passage-a');
    const [refresh, setRefresh] = useState(0);
    return (
      <>
        <p>
          <button type="button" onClick={() => setPassageId('passage-b')}>
            Publish the next passage
          </button>{' '}
          <button type="button" onClick={() => setRefresh((value) => value + 1)}>
            Refresh the same passage
          </button>
        </p>
        <StoryFrame
          {...args}
          passageId={passageId}
          paragraphs={[
            refresh % 2 === 0
              ? 'Someone in a soaked harbor coat has climbed onto the landing.'
              : 'Someone in a soaked harbor coat has climbed onto the landing. The same source is still here.',
          ]}
        />
      </>
    );
  },
};

export const SavedAppearance: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Ashfall Approach',
    paragraphs: ['The road narrows toward the silt gate.'],
  },
  render: function SavedAppearanceStory() {
    const base = makeStorySnapshot();
    const story = storySnapshotSchema.parse({
      ...base,
      current: {
        ...base.current,
        appearance: {
          source: {
            storyId: fixtureIds.storyId,
            passageId: fixtureIds.passageId,
            interactionId: fixtureIds.interactionId,
          },
          directive: {
            schemaVersion: 1,
            scene: {
              palette: {
                backdrop: '#1a3040',
                accent: '#d7a15a',
                surfaceTint: '#1c2830',
              },
              atmosphere: { lighting: 'dim', vignette: 0.2 },
            },
          },
        },
      },
    });
    return (
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Ashfall Approach"
        passageTitle={story.current.content.title}
        passageId={story.current.id}
        interactionId={story.current.interaction?.id}
        paragraphs={story.current.content.paragraphs}
        presentation={resolveLivePresentation(story)}
        intentions={
          story.current.interaction?.specification.options.map((option) => ({
            id: option.id,
            label: option.label,
          })) ?? []
        }
      />
    );
  },
};

export const LongLeaf: Story = {
  args: {
    storiesHref: '/stories',
    storyLabel: 'Greywake',
    passageTitle: 'The long watch',
    paragraphs: ['Salt '.repeat(1200)],
    intentions: [
      { id: 'one', label: 'Hold the lamp' },
      { id: 'two', label: 'Call down the path' },
      { id: 'three', label: 'Check the chain' },
      { id: 'four', label: 'Close the shutter' },
      { id: 'five', label: 'Wait in the doorway' },
      { id: 'six', label: 'Step back inside' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320, fontSize: '200%' }}>
        <Story />
      </div>
    ),
  ],
};

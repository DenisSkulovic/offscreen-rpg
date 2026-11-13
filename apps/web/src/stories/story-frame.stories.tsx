import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

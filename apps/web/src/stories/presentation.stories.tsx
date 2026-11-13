import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import {
  abstractPresentation,
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  malformedPresentation,
  sterilePresentation,
  unknownVersionPresentation,
} from '@/src/features/play/presentation/fixtures';
import { resolvePresentation } from '@/src/features/play/presentation/resolve';
import type { PresentationScope } from '@/src/features/play/presentation/types';

const paragraphs = [
  'The landing boards are dark with rain.',
  'A soaked coat stops beside the mechanism and waits.',
  'Выпускные бумаги лежат рядом с мокрым краем стола.',
];

const intentions = [
  { id: 'ask', label: 'Ask who sent the visitor', support: 'Brief conversation' },
  { id: 'withdraw', label: 'Withdraw to the shelter', support: 'Leave without losing your work' },
];

const presets = {
  baseline: null,
  harbor: harborPresentation,
  cave: cavePresentation,
  sterile: sterilePresentation,
  abstract: abstractPresentation,
  malformed: malformedPresentation,
  'unknown-version': unknownVersionPresentation,
} as const;

function scopeFor(preset: keyof typeof presets): PresentationScope {
  if (preset === 'cave') return caveScope;
  return harborScope;
}

function Presented({
  preset,
}: {
  preset: keyof typeof presets;
}) {
  const scope = scopeFor(preset);
  const presentation =
    preset === 'baseline' ? null : resolvePresentation(presets[preset], scope);
  return (
    <StoryFrame
      storiesHref="/stories"
      storyLabel="Mocked presentation"
      situationLabel="Fixture only — not a live storyteller"
      statusLabel="Waiting for your choice"
      passageId={scope.passageId}
      interactionId={scope.interactionId}
      passageTitle="Someone at the door"
      paragraphs={paragraphs}
      presentation={presentation}
      intentions={intentions}
      details={<p>Mocked presentation. No model, provider, or saved art direction.</p>}
    />
  );
}

const meta = {
  title: 'Experience/Presentation',
  component: Presented,
  parameters: { layout: 'fullscreen', msw: { handlers: [] } },
  args: { preset: 'baseline' },
  argTypes: {
    preset: {
      control: 'select',
      options: Object.keys(presets),
    },
  },
} satisfies Meta<typeof Presented>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Laboratory: Story = {};

export const Harbor: Story = { args: { preset: 'harbor' } };
export const Cave: Story = { args: { preset: 'cave' } };
export const Sterile: Story = { args: { preset: 'sterile' } };
export const Abstract: Story = { args: { preset: 'abstract' } };
export const Malformed: Story = { args: { preset: 'malformed' } };
export const Narrow: Story = {
  args: { preset: 'cave' },
  decorators: [
    (Story) => (
      <div style={{ width: 375 }}>
        <Story />
      </div>
    ),
  ],
};

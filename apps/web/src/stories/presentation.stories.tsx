import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CampaignOfferPanel } from '@/src/features/play/ui/campaign-offer';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import {
  abstractPresentation,
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  malformedPresentation,
  quietRoomPresentation,
  resolveFixture,
  sterilePresentation,
  unknownVersionPresentation,
} from '@/src/features/play/presentation/fixtures';
import type { PresentationScope } from '@/src/features/play/presentation/types';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';

const scenes = {
  harbor: {
    label: 'Greywake',
    title: 'Someone at the door',
    paragraphs: [
      'Rain darkens the landing boards.',
      'A soaked coat stops beside the mechanism and waits.',
    ],
    intentions: [
      { id: 'ask', label: 'Ask who sent the visitor', support: 'Brief conversation' },
      { id: 'withdraw', label: 'Withdraw to the shelter', support: 'Leave without losing your work' },
    ],
    document: harborPresentation,
    scope: harborScope,
    campaign: false,
  },
  cave: {
    label: 'Under the silt',
    title: 'The passage narrows',
    paragraphs: [
      'The air is cold and still. Water ticks somewhere ahead.',
      'Two ways are open: a lit crack, and a darker bend.',
    ],
    intentions: [],
    document: cavePresentation,
    scope: caveScope,
    campaign: true,
  },
  sterile: {
    label: 'Clean room',
    title: 'The bench is clear',
    paragraphs: [
      'White light sits evenly on the sealed bench.',
      'Nothing here is wet, and nothing is waiting outside a door.',
    ],
    intentions: [
      { id: 'ask', label: 'Read the sealed note', support: 'Does not open the lock' },
      { id: 'withdraw', label: 'Leave the room', support: 'The bench stays as it is' },
    ],
    document: sterilePresentation,
    scope: harborScope,
    campaign: false,
  },
  abstract: {
    label: 'Field',
    title: 'A pressure, not a place',
    paragraphs: [
      'There is no floor and no face. A pattern tightens, then loosens.',
      'Выпускные бумаги are not here. The change is only in the field.',
    ],
    intentions: [
      { id: 'ask', label: 'Attend to the pattern', support: 'No body is required' },
      { id: 'withdraw', label: 'Let it pass', support: 'Nothing is carried away' },
    ],
    document: abstractPresentation,
    scope: { ...harborScope, storyId: 'story-field', passageId: 'passage-field' },
    campaign: false,
  },
  quiet: {
    label: 'The room',
    title: 'After the lamp',
    paragraphs: ['The chair is still warm. The rest of the room does not ask for anything.'],
    intentions: [
      { id: 'ask', label: 'Stay seated', support: 'A short while' },
      { id: 'withdraw', label: 'Stand up', support: 'No errand attached' },
    ],
    document: quietRoomPresentation,
    scope: { ...harborScope, storyId: 'story-room', passageId: 'passage-room', paragraphCount: 1 },
    campaign: false,
  },
  malformed: {
    label: 'Recovered scene',
    title: 'The landing holds',
    paragraphs: ['The bad direction was dropped. The landing is still here.'],
    intentions: [
      { id: 'ask', label: 'Ask who sent the visitor', support: 'Brief conversation' },
      { id: 'withdraw', label: 'Withdraw to the shelter', support: 'Leave without losing your work' },
    ],
    document: malformedPresentation,
    scope: { ...harborScope, paragraphCount: 1 },
    campaign: false,
  },
  'unknown-version': {
    label: 'Baseline recovery',
    title: 'Unreadable direction',
    paragraphs: ['An unknown presentation version leaves the field journal in place.'],
    intentions: [{ id: 'ask', label: 'Continue', support: 'Same action as before' }],
    document: unknownVersionPresentation,
    scope: { ...harborScope, paragraphCount: 1, validLegacyOptionIds: ['ask'] },
    campaign: false,
  },
} as const;

type Preset = keyof typeof scenes;

function withControls(
  document: (typeof scenes)[Preset]['document'],
  args: {
    lighting: string;
    stage: string;
    typography: string;
    texture: string;
    vignette: number;
  },
) {
  if (!document || typeof document !== 'object' || !('schemaVersion' in document)) return document;
  if (document.schemaVersion !== 1) return document;
  const scene = 'scene' in document && document.scene ? document.scene : {};
  return {
    ...document,
    storyStyle: {
      ...('storyStyle' in document ? document.storyStyle : {}),
      typography: args.typography,
      texture: args.texture,
    },
    scene: {
      ...scene,
      stage: args.stage,
      atmosphere: {
        ...(typeof scene === 'object' && scene && 'atmosphere' in scene ? scene.atmosphere : {}),
        lighting: args.lighting,
        vignette: args.vignette,
      },
    },
  };
}

function Presented(args: {
  preset: Preset;
  lighting: 'neutral' | 'dim' | 'diffuse' | 'radiant';
  stage: 'open' | 'quiet-surface' | 'translucent-surface';
  typography: 'editorial' | 'restrained' | 'technical';
  texture: 'none' | 'grain-soft' | 'organic-soft' | 'geometric-soft';
  vignette: number;
}) {
  const scene = scenes[args.preset];
  const scope: PresentationScope = {
    ...scene.scope,
    paragraphCount: scene.paragraphs.length,
  };
  const presentation =
    args.preset === 'unknown-version'
      ? resolveFixture(scene.document, scope)
      : resolveFixture(withControls(scene.document, args), scope);
  const campaign = scene.campaign ? makeCampaign() : null;
  return (
    <StoryFrame
      storiesHref="/stories"
      storyLabel={scene.label}
      situationLabel="Fixture only — not a live storyteller"
      statusLabel="Waiting for your choice"
      passageId={scope.passageId}
      interactionId={scope.interactionId}
      passageTitle={scene.title}
      paragraphs={scene.paragraphs}
      presentation={presentation}
      intentions={scene.intentions}
      stageExtras={
        campaign ? (
          <CampaignOfferPanel
            story={makeStorySnapshot({ title: scene.title, paragraphs: [...scene.paragraphs] })}
            campaign={campaign}
            command={{ send: () => undefined, busy: false, message: '', retry: false }}
            presentation={presentation}
          />
        ) : null
      }
      details={<p>Mocked presentation. Controls edit the input document before resolution.</p>}
    />
  );
}

const meta = {
  title: 'Experience/Presentation',
  component: Presented,
  parameters: { layout: 'fullscreen', msw: { handlers: [] } },
  args: {
    preset: 'harbor',
    lighting: 'diffuse',
    stage: 'quiet-surface',
    typography: 'restrained',
    texture: 'grain-soft',
    vignette: 0.15,
  },
  argTypes: {
    preset: { control: 'select', options: Object.keys(scenes) },
    lighting: { control: 'select', options: ['neutral', 'dim', 'diffuse', 'radiant'] },
    stage: { control: 'select', options: ['open', 'quiet-surface', 'translucent-surface'] },
    typography: { control: 'select', options: ['editorial', 'restrained', 'technical'] },
    texture: { control: 'select', options: ['none', 'grain-soft', 'organic-soft', 'geometric-soft'] },
    vignette: { control: { type: 'number', min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof Presented>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Laboratory: Story = {};
export const Harbor: Story = { args: { preset: 'harbor', lighting: 'diffuse', texture: 'grain-soft' } };
export const Cave: Story = {
  args: { preset: 'cave', lighting: 'dim', stage: 'translucent-surface', texture: 'organic-soft', vignette: 0.55 },
};
export const Sterile: Story = {
  args: { preset: 'sterile', lighting: 'radiant', stage: 'open', texture: 'none', vignette: 0, typography: 'technical' },
};
export const Abstract: Story = {
  args: { preset: 'abstract', lighting: 'neutral', texture: 'geometric-soft', typography: 'technical' },
};
export const QuietRoom: Story = {
  args: { preset: 'quiet', lighting: 'dim', texture: 'none', vignette: 0.2, typography: 'restrained' },
};
export const Malformed: Story = { args: { preset: 'malformed' } };
export const Narrow: Story = {
  args: { preset: 'cave', lighting: 'dim' },
  decorators: [
    (Story) => (
      <div style={{ width: 375 }}>
        <Story />
      </div>
    ),
  ],
};

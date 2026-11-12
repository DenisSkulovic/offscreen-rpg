import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import {
  PlayStatePanel,
  playStatusForResolution,
} from './presenters/play-state-panel';

const meta = {
  title: 'Engineering/Play states',
  component: PlayStatePanel,
  parameters: {
    msw: { handlers: [] },
  },
} satisfies Meta<typeof PlayStatePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NormalChoice: Story = {
  args: {
    story: makeStorySnapshot(),
    intentStatus: 'idle',
    statusMessage: null,
  },
};

export const ChoicePending: Story = {
  args: {
    story: makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'pending',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    }),
    intentStatus: 'awaiting_ack',
    statusMessage: 'The storyteller is resolving this intention.',
  },
};

export const ResolutionUncertain: Story = {
  render: () => {
    const story = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'uncertain',
        evidence: 'committed',
        version: 2,
        canRetry: false,
        blocker: { kind: 'usage-uncertain', recovery: 'operator' },
      },
      interaction: null,
    });
    return (
      <PlayStatePanel
        story={story}
        statusMessage={playStatusForResolution(story)}
      />
    );
  },
};

export const ResolutionBlocked: Story = {
  render: () => {
    const story = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'blocked',
        evidence: 'committed',
        version: 2,
        canRetry: true,
        blocker: { kind: 'publication', recovery: 'retry' },
      },
      interaction: null,
    });
    return (
      <PlayStatePanel
        story={story}
        intentStatus="blocked"
        statusMessage={playStatusForResolution(story)}
      />
    );
  },
};

export const ResolutionFailed: Story = {
  render: () => {
    const story = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'failed',
        evidence: 'committed',
        version: 2,
        canRetry: true,
        blocker: { kind: 'generation', recovery: 'retry' },
      },
      interaction: null,
    });
    return (
      <PlayStatePanel
        story={story}
        intentStatus="failed"
        statusMessage={playStatusForResolution(story)}
      />
    );
  },
};

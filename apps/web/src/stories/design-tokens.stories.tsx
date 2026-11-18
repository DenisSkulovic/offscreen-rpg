import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import {
  harborPresentation,
  harborScope,
  resolveFixture,
} from '@/src/features/play/presentation/fixtures';

const harbor = resolveFixture(harborPresentation, harborScope);

const roles = [
  ['Canvas', '--ui-canvas'],
  ['Ink', '--ui-ink'],
  ['Muted', '--ui-muted'],
  ['Focus', '--ui-focus'],
  ['Action', '--ui-action'],
  ['Danger', '--ui-danger'],
  ['Attention', '--ui-attention'],
  ['Success', '--ui-success'],
] as const;

const meta = {
  title: 'Experience/Design tokens',
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [] },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const RolesAndHostileScene: Story = {
  render: () => (
    <div>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '0.75rem',
          padding: '1rem',
          background: 'var(--ui-canvas)',
          color: 'var(--ui-ink)',
        }}
      >
        {roles.map(([label, token]) => (
          <div key={token}>
            <div
              style={{
                height: '3rem',
                background: `var(${token})`,
                border: '1px solid var(--ui-border)',
              }}
            />
            <div
              style={{
                marginTop: '0.35rem',
                font: '0.85rem var(--reader-serif)',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </section>
      <div className="story-frame">
        <div className="story-frame__book">
          <p>Reader ink stays on the paper even when the scene is loud.</p>
          <p style={{ color: 'var(--ui-danger)' }}>
            The repair failed. This status is not the scene accent.
          </p>
          <button type="button">Focus stays on the book</button>
        </div>
      </div>
      <div style={{ width: 320, fontSize: '200%' }}>
        <StoryFrame
          storiesHref="/stories"
          storyLabel="Greywake"
          situationLabel="The beacon landing"
          statusLabel="The repair failed"
          passageTitle="Someone at the door"
          paragraphs={['The landing is wet.', 'A coat drips onto the boards.']}
          presentation={{
            ...harbor,
            narrative: {
              ...harbor.narrative,
              ink: '#39ff14',
              muted: '#39ff14',
              quiet: '#39ff14',
            },
            ink: '#39ff14',
            focus: '#ff00ff',
            status: '#ff00ff',
            accent: '#ff00ff',
            actionInk: '#00ff88',
          }}
          intentions={[
            { id: 'ask', label: 'Ask who sent the visitor' },
            { id: 'withdraw', label: 'Withdraw to the shelter' },
            { id: 'wait', label: 'Wait and observe the landing' },
            { id: 'light', label: 'Light the beacon' },
            { id: 'repair', label: 'Continue the earlier repair' },
            {
              id: 'note',
              label: 'Write down who was standing on the lower step',
            },
          ]}
        />
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';

const meta = {
  title: 'Experience/Shared controls',
  parameters: {
    layout: 'padded',
    msw: { handlers: [] },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionAndNotice: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '24rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Action kind="link" href="/stories/new">
          Create a story
        </Action>
        <Action kind="link" variant="quiet" href="/demo">
          Try the public preview
        </Action>
        <Action kind="button" variant="secondary" type="button">
          Secondary
        </Action>
        <Action kind="button" variant="critical" type="button">
          Leave this story
        </Action>
        <Action
          kind="button"
          variant="primary"
          disabled
          data-surface="luminous"
        >
          Hold
        </Action>
        <Action kind="button" pending>
          Starting story…
        </Action>
      </div>
      <SystemNotice tone="neutral">The book is quiet.</SystemNotice>
      <SystemNotice
        tone="attention"
        label="Snapshot refresh"
        action={
          <Action kind="button" variant="quiet">
            Refresh scene
          </Action>
        }
      >
        Last update failed. Refresh does not send a command.
      </SystemNotice>
      <SystemNotice tone="error">The opening was not created.</SystemNotice>
      <SystemNotice tone="success">The opening is saved.</SystemNotice>
      <div style={{ width: 320, fontSize: '200%' }}>
        <Action kind="button" variant="primary">
          A long command that must wrap inside a narrow column
        </Action>
      </div>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Action } from '@/src/shared/ui/action';
import { SystemNotice } from '@/src/shared/ui/system-notice';

const meta = {
  title: 'Platform/Entry and create status',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const SharedPrimaryFocusErrorPending: Story = {
  name: 'Shared primary, focus, error, and pending',
  render: () => (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '40rem' }}>
      <section aria-label="Entry">
        <h2>Entry</h2>
        <Action kind="link" href="/demo">
          Try an interactive preview
        </Action>
      </section>
      <section aria-label="Create">
        <h2>Create</h2>
        <Action kind="button" pending>
          Saving…
        </Action>
        <SystemNotice tone="error">
          Setup could not be confirmed. Your edits are still here.
        </SystemNotice>
      </section>
      <section aria-label="Stories">
        <h2>Stories</h2>
        <Action kind="link" variant="secondary" href="/stories/new">
          Start a real story
        </Action>
      </section>
      <section aria-label="Book">
        <h2>Book</h2>
        <Action kind="button" variant="secondary">
          Enter story
        </Action>
      </section>
    </div>
  ),
};

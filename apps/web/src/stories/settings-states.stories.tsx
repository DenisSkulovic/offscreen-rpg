import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SettingsConflictDemo } from './presenters/settings-conflict-demo';
import { emptyPresetHandlers } from './msw/handlers';

const meta = {
  title: 'Engineering/Settings states',
  component: SettingsConflictDemo,
  parameters: {
    msw: { handlers: emptyPresetHandlers },
  },
} satisfies Meta<typeof SettingsConflictDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RevisionConflictWhileDirty: Story = {};

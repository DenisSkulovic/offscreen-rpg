import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChamberDeniedPanel } from './presenters/chamber-denied-panel';
import { chamberDeniedHandlers } from './msw/handlers';

const meta = {
  title: 'Engineering/Chamber isolation',
  component: ChamberDeniedPanel,
  parameters: {
    msw: { handlers: chamberDeniedHandlers },
  },
} satisfies Meta<typeof ChamberDeniedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeveloperToolsDenied: Story = {};

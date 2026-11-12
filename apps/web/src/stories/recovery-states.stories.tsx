import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RouteRecoveryPanel } from '@/src/features/recovery/route-recovery';

const meta = {
  title: 'Engineering/Route recovery',
  component: RouteRecoveryPanel,
  parameters: {
    msw: { handlers: [] },
  },
} satisfies Meta<typeof RouteRecoveryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unauthorized401: Story = {
  args: {
    kind: 'unauthorized',
    resource: 'story',
  },
};

export const NotFound404: Story = {
  args: {
    kind: 'not_found',
    resource: 'story',
  },
};

export const Transient503: Story = {
  args: {
    kind: 'transient',
    resource: 'story',
    onRetry: () => {
      /* Storybook: no refetch */
    },
  },
};

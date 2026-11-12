import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { makeDraft } from '@/src/test/draft-fixtures';
import { DraftStatePanel } from './presenters/draft-state-panel';
import { draftConflictHandlers } from './msw/handlers';

const meta = {
  title: 'Engineering/Draft states',
  component: DraftStatePanel,
} satisfies Meta<typeof DraftStatePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PristineSaved: Story = {
  args: {
    draft: makeDraft(),
    conflict: false,
    message: '',
  },
};

export const DirtyLocalEdits: Story = {
  args: {
    draft: makeDraft({
      title: 'Edit me in Storybook',
      premise: 'Change a field to mark the RHF session dirty.',
    }),
    conflict: false,
    message: 'Change title or premise to observe dirty state.',
  },
};

export const RevisionConflict409: Story = {
  parameters: {
    msw: { handlers: draftConflictHandlers },
  },
  args: {
    draft: makeDraft({ revision: 2 }),
    conflict: true,
    message:
      'Another save updated this draft (HTTP 409). Load the saved setup before editing again.',
  },
};
